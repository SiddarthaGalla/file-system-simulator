import time
import random
from collections import Counter
from engine.fragmentation_analyzer import FragmentationAnalyzer

class GeneticAlgorithmOptimizer:
    """
    Real Genetic Algorithm for Storage Block Allocation Optimization.
    Operates on multiset permutations of disk blocks to guarantee 100% validity:
    - Zero block collisions
    - Exact block count preserved for all files
    - Capacity constraints preserved
    - Configurable multi-objective weighted fitness function
    """

    def __init__(self, device, files, blocks, config=None):
        """
        device: StorageDevice
        files: list of VirtualFile
        blocks: list of StorageBlock
        config: dict with keys:
            - population_size (int, default 40)
            - generations (int, default 30)
            - mutation_rate (float, default 0.15)
            - crossover_rate (float, default 0.85)
            - elitism_count (int, default 2)
            - weights: { 'w1': float, 'w2': float, 'w3': float }
            - random_seed: optional int
        """
        self.device = device
        self.files = [f for f in files if f.allocated_blocks_count > 0]
        self.blocks = sorted(blocks, key=lambda b: b.block_index)
        self.total_blocks = device.total_blocks
        
        cfg = config or {}
        self.population_size = max(10, int(cfg.get('population_size', 40)))
        self.generations = max(5, int(cfg.get('generations', 30)))
        self.mutation_rate = float(cfg.get('mutation_rate', 0.15))
        self.crossover_rate = float(cfg.get('crossover_rate', 0.85))
        self.elitism_count = max(1, int(cfg.get('elitism_count', 2)))
        
        weights = cfg.get('weights', {})
        self.w1 = float(weights.get('w1', 0.55)) # Extent / Fragmentation reduction weight
        self.w2 = float(weights.get('w2', 0.30)) # Contiguous free space / utilization weight
        self.w3 = float(weights.get('w3', 0.15)) # Movement cost penalty weight

        if 'random_seed' in cfg and cfg['random_seed'] is not None:
            random.seed(cfg['random_seed'])

        # Build original disk map
        self.original_map = [None] * self.total_blocks
        for b in self.blocks:
            if b.block_index < self.total_blocks:
                self.original_map[b.block_index] = b.file_id

        # Target block count per file
        self.target_counts = {f.id: f.allocated_blocks_count for f in self.files}
        self.total_allocated = sum(self.target_counts.values())
        self.total_free = self.total_blocks - self.total_allocated
        self.num_files = len(self.files)

    def _count_extents(self, genome):
        """
        Counts extents per file in genome.
        Returns total_extents, extents_by_file (dict), largest_free_extent
        """
        extents_by_file = {f.id: 0 for f in self.files}
        free_extents = []
        current_id = None
        current_len = 0

        for fid in genome:
            if fid == current_id:
                current_len += 1
            else:
                if current_id is not None:
                    extents_by_file[current_id] = extents_by_file.get(current_id, 0) + 1
                elif current_len > 0:
                    free_extents.append(current_len)
                current_id = fid
                current_len = 1

        if current_id is not None:
            extents_by_file[current_id] = extents_by_file.get(current_id, 0) + 1
        elif current_len > 0:
            free_extents.append(current_len)

        total_extents = sum(extents_by_file.values())
        largest_free = max(free_extents) if free_extents else 0
        return total_extents, extents_by_file, largest_free

    def _calc_movement_cost(self, genome):
        """
        Calculates how many blocks differ from the original map for allocated files.
        """
        moved = 0
        for i in range(self.total_blocks):
            orig = self.original_map[i]
            gen = genome[i]
            if orig != gen and (orig is not None or gen is not None):
                moved += 1
        # Each relocation moves an allocated block
        return moved // 2

    def evaluate_fitness(self, genome):
        """
        Fitness function:
        Fitness = w1 * (1 - Normalized Extent Fragmentation) + w2 * (Contiguous Free Ratio) - w3 * (Normalized Movement Cost)
        """
        if self.num_files == 0:
            return 1.0, 0.0, 0, 0

        total_extents, extents_by_file, largest_free = self._count_extents(genome)

        # Min possible extents is num_files (1 per file)
        # Max possible extents is total_allocated
        denom = max(1, self.total_allocated - self.num_files)
        normalized_frag = max(0.0, min(1.0, (total_extents - self.num_files) / float(denom)))

        # Contiguous free space ratio
        free_ratio = (largest_free / float(max(1, self.total_free))) if self.total_free > 0 else 1.0

        # Movement cost
        blocks_moved = self._calc_movement_cost(genome)
        max_possible_moves = max(1, self.total_allocated)
        norm_movement = min(1.0, blocks_moved / float(max_possible_moves))

        score = (self.w1 * (1.0 - normalized_frag)) + (self.w2 * free_ratio) - (self.w3 * norm_movement)
        fitness = max(0.0001, score)

        frag_ratio = ((total_extents - self.num_files) / float(total_extents) * 100.0) if total_extents > 0 else 0.0

        return fitness, frag_ratio, total_extents, blocks_moved

    def _generate_initial_population(self):
        """
        Generates diverse initial chromosomes:
        1. Original layout
        2. Fully contiguous compacted layouts
        3. Semi-contiguous layouts with varied gap distribution
        4. Random block shuffles
        """
        population = []

        # 1. Original allocation
        population.append(list(self.original_map))

        # 2. Fully defragmented / sorted layout (blocks grouped contiguously)
        compacted = []
        for f in self.files:
            compacted.extend([f.id] * self.target_counts[f.id])
        while len(compacted) < self.total_blocks:
            compacted.append(None)
        population.append(compacted)

        # 3. Compacted in reverse file order
        rev_compacted = []
        for f in reversed(self.files):
            rev_compacted.extend([f.id] * self.target_counts[f.id])
        while len(rev_compacted) < self.total_blocks:
            rev_compacted.append(None)
        population.append(rev_compacted)

        # 4. Block cluster insertions with random free space gaps
        for _ in range(self.population_size - len(population)):
            files_order = list(self.files)
            random.shuffle(files_order)
            
            # Decide whether to keep files mostly contiguous or partially split
            genome = []
            free_left = self.total_free
            
            for f in files_order:
                # Maybe insert some free blocks before file
                if free_left > 0 and random.random() < 0.4:
                    gap = random.randint(1, min(free_left, 5))
                    genome.extend([None] * gap)
                    free_left -= gap
                
                # Should file be fully contiguous or slightly split?
                f_count = self.target_counts[f.id]
                if random.random() < 0.7 or f_count <= 2:
                    genome.extend([f.id] * f_count)
                else:
                    # split in two extents
                    split = random.randint(1, f_count - 1)
                    genome.extend([f.id] * split)
                    if free_left > 0 and random.random() < 0.3:
                        gap = random.randint(1, min(free_left, 3))
                        genome.extend([None] * gap)
                        free_left -= gap
                    genome.extend([f.id] * (f_count - split))

            # Add remaining free blocks
            while len(genome) < self.total_blocks:
                genome.append(None)
            
            # Trim or pad if necessary
            genome = genome[:self.total_blocks]
            while len(genome) < self.total_blocks:
                genome.append(None)
                
            population.append(genome)

        return population

    def _tournament_selection(self, population_with_fitness, k=3):
        candidates = random.sample(population_with_fitness, k)
        candidates.sort(key=lambda item: item[1], reverse=True)
        return candidates[0][0]

    def _crossover(self, parent1, parent2):
        """
        Multiset Order Crossover:
        Selects a slice from Parent 1, then fills in remaining positions
        from Parent 2 while strictly maintaining exact required file block counts.
        """
        if random.random() > self.crossover_rate:
            return list(parent1), list(parent2)

        p1_idx = random.randint(0, self.total_blocks - 2)
        p2_idx = random.randint(p1_idx + 1, self.total_blocks - 1)

        def make_child(p_base, p_fill):
            child = [None] * self.total_blocks
            counts = {fid: 0 for fid in self.target_counts}
            none_count = 0

            # Copy slice from p_base
            for i in range(p1_idx, p2_idx + 1):
                val = p_base[i]
                child[i] = val
                if val is not None:
                    counts[val] += 1
                else:
                    none_count += 1

            # Fill remaining from p_fill
            fill_idx = 0
            for i in range(self.total_blocks):
                if p1_idx <= i <= p2_idx:
                    continue
                # Find next available item from p_fill
                while fill_idx < self.total_blocks:
                    candidate = p_fill[fill_idx]
                    fill_idx += 1
                    if candidate is not None:
                        if counts[candidate] < self.target_counts[candidate]:
                            counts[candidate] += 1
                            child[i] = candidate
                            break
                    else:
                        if none_count < self.total_free:
                            none_count += 1
                            child[i] = None
                            break
            return child

        return make_child(parent1, parent2), make_child(parent2, parent1)

    def _mutate(self, genome):
        """
        Multi-operator mutation:
        1. Extent Consolidation: Combines separated blocks of a file.
        2. Block Swap: Swaps a file block with a free space or another file block.
        3. Extent Slide: Moves a contiguous extent to an adjacent free slot.
        """
        if random.random() > self.mutation_rate or self.num_files == 0:
            return genome

        mutated = list(genome)
        choice = random.random()

        if choice < 0.45:
            # Consolidation mutation: pick a file and gather its blocks into a contiguous window
            target_file = random.choice(self.files)
            fid = target_file.id
            blocks_needed = self.target_counts[fid]
            
            # Find all positions of fid
            positions = [i for i, val in enumerate(mutated) if val == fid]
            if len(positions) > 1 and positions[-1] - positions[0] + 1 != len(positions):
                # Currently fragmented, attempt to consolidate
                # Find an available contiguous window or use the position of the first block
                start = positions[0]
                if start + blocks_needed <= self.total_blocks:
                    # Clear target file from current positions
                    for p in positions:
                        mutated[p] = None
                    # Swap whatever is in [start, start + blocks_needed] into former positions
                    displaced = []
                    for i in range(start, start + blocks_needed):
                        if mutated[i] is not None and mutated[i] != fid:
                            displaced.append(mutated[i])
                        mutated[i] = fid
                    # Place displaced items into free spots
                    d_idx = 0
                    for i in range(self.total_blocks):
                        if d_idx >= len(displaced):
                            break
                        if mutated[i] is None and (i < start or i >= start + blocks_needed):
                            mutated[i] = displaced[d_idx]
                            d_idx += 1

        elif choice < 0.75:
            # Block swap mutation
            i1 = random.randint(0, self.total_blocks - 1)
            i2 = random.randint(0, self.total_blocks - 1)
            mutated[i1], mutated[i2] = mutated[i2], mutated[i1]

        else:
            # Slide mutation: find a small extent and slide it left or right
            for i in range(self.total_blocks - 1):
                if mutated[i] is not None and mutated[i+1] is None:
                    mutated[i], mutated[i+1] = mutated[i+1], mutated[i]
                    break

        return mutated

    def run(self):
        """
        Executes the Genetic Algorithm and returns:
        - generation metrics
        - best solution mapping
        - before/after metrics
        - total execution time
        """
        start_time = time.perf_counter()

        # Evaluate initial state
        init_fitness, init_frag, init_extents, _ = self.evaluate_fitness(self.original_map)

        # Generate initial population
        population = self._generate_initial_population()

        best_genome = None
        best_fitness = -1.0
        best_frag = 100.0
        best_extents = 9999

        generation_metrics = []

        for gen in range(1, self.generations + 1):
            # Evaluate all individuals
            pop_fitness = []
            for indiv in population:
                fit, frag, ext, _ = self.evaluate_fitness(indiv)
                pop_fitness.append((indiv, fit, frag, ext))

            # Sort by fitness descending
            pop_fitness.sort(key=lambda item: item[1], reverse=True)

            gen_best_indiv, gen_best_fit, gen_best_frag, gen_best_ext = pop_fitness[0]
            avg_fit = sum(item[1] for item in pop_fitness) / float(len(pop_fitness))

            if gen_best_fit > best_fitness:
                best_fitness = gen_best_fit
                best_genome = list(gen_best_indiv)
                best_frag = gen_best_frag
                best_extents = gen_best_ext

            generation_metrics.append({
                'generation': gen,
                'best_fitness': round(gen_best_fit, 4),
                'avg_fitness': round(avg_fit, 4),
                'best_fragmentation': round(gen_best_frag, 2),
                'extents_count': gen_best_ext
            })

            # Next generation creation with Elitism
            new_pop = [item[0] for item in pop_fitness[:self.elitism_count]]

            while len(new_pop) < self.population_size:
                p1 = self._tournament_selection(pop_fitness)
                p2 = self._tournament_selection(pop_fitness)
                c1, c2 = self._crossover(p1, p2)
                c1 = self._mutate(c1)
                new_pop.append(c1)
                if len(new_pop) < self.population_size:
                    c2 = self._mutate(c2)
                    new_pop.append(c2)

            population = new_pop

        exec_time_ms = (time.perf_counter() - start_time) * 1000.0

        # Construct solution mapping { file_id: [block_indices] }
        solution_mapping = {f.id: [] for f in self.files}
        for idx, fid in enumerate(best_genome):
            if fid in solution_mapping:
                solution_mapping[fid].append(idx)

        blocks_moved = self._calc_movement_cost(best_genome)

        return {
            'success': True,
            'execution_time_ms': round(exec_time_ms, 2),
            'initial_fragmentation': round(init_frag, 2),
            'optimized_fragmentation': round(best_frag, 2),
            'initial_extents': init_extents,
            'optimized_extents': best_extents,
            'blocks_moved': blocks_moved,
            'best_fitness': round(best_fitness, 4),
            'best_genome': best_genome,
            'solution_mapping': solution_mapping,
            'generation_metrics': generation_metrics
        }

