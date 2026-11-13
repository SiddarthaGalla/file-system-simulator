class DiskScheduler:
    """
    Implements standard Operating Systems Disk Head Scheduling algorithms:
    - FCFS (First-Come, First-Served)
    - SSTF (Shortest Seek Time First)
    - SCAN (Elevator Algorithm)
    - C-SCAN (Circular SCAN)
    - LOOK (Optimized Elevator)
    Calculates head traversal paths, total seek distances, and before/after comparisons.
    """

    SEEK_PER_CYLINDER_MS = 0.12 # standard simulated head seek time per block/cylinder

    @classmethod
    def fcfs(cls, requests, initial_head=0):
        if not requests:
            return {'path': [initial_head], 'total_head_movement': 0, 'avg_seek': 0, 'seek_time_ms': 0}

        path = [initial_head]
        total_movement = 0
        curr = initial_head

        for req in requests:
            total_movement += abs(req - curr)
            curr = req
            path.append(curr)

        avg_seek = round(total_movement / float(len(requests)), 2)
        seek_time = round(total_movement * cls.SEEK_PER_CYLINDER_MS, 2)

        return {
            'algorithm': 'FCFS',
            'path': path,
            'total_head_movement': total_movement,
            'avg_seek': avg_seek,
            'seek_time_ms': seek_time
        }

    @classmethod
    def sstf(cls, requests, initial_head=0):
        if not requests:
            return {'path': [initial_head], 'total_head_movement': 0, 'avg_seek': 0, 'seek_time_ms': 0}

        unvisited = list(requests)
        path = [initial_head]
        total_movement = 0
        curr = initial_head

        while unvisited:
            # Find closest unvisited block
            closest = min(unvisited, key=lambda x: abs(x - curr))
            total_movement += abs(closest - curr)
            curr = closest
            path.append(curr)
            unvisited.remove(closest)

        avg_seek = round(total_movement / float(len(requests)), 2)
        seek_time = round(total_movement * cls.SEEK_PER_CYLINDER_MS, 2)

        return {
            'algorithm': 'SSTF',
            'path': path,
            'total_head_movement': total_movement,
            'avg_seek': avg_seek,
            'seek_time_ms': seek_time
        }

    @classmethod
    def scan(cls, requests, total_blocks=100, initial_head=0, direction='up'):
        if not requests:
            return {'path': [initial_head], 'total_head_movement': 0, 'avg_seek': 0, 'seek_time_ms': 0}

        left = sorted([r for r in requests if r < initial_head])
        right = sorted([r for r in requests if r >= initial_head])

        path = [initial_head]
        total_movement = 0
        curr = initial_head

        if direction == 'up':
            for r in right:
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)
            if left:
                # Move to upper boundary if left requests exist
                boundary = total_blocks - 1
                if curr < boundary:
                    total_movement += abs(boundary - curr)
                    curr = boundary
                    path.append(curr)
                for r in reversed(left):
                    total_movement += abs(r - curr)
                    curr = r
                    path.append(curr)
        else: # down
            for r in reversed(left):
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)
            if right:
                boundary = 0
                if curr > boundary:
                    total_movement += abs(curr - boundary)
                    curr = boundary
                    path.append(curr)
                for r in right:
                    total_movement += abs(r - curr)
                    curr = r
                    path.append(curr)

        avg_seek = round(total_movement / float(len(requests)), 2)
        seek_time = round(total_movement * cls.SEEK_PER_CYLINDER_MS, 2)

        return {
            'algorithm': 'SCAN',
            'path': path,
            'total_head_movement': total_movement,
            'avg_seek': avg_seek,
            'seek_time_ms': seek_time
        }

    @classmethod
    def c_scan(cls, requests, total_blocks=100, initial_head=0):
        if not requests:
            return {'path': [initial_head], 'total_head_movement': 0, 'avg_seek': 0, 'seek_time_ms': 0}

        left = sorted([r for r in requests if r < initial_head])
        right = sorted([r for r in requests if r >= initial_head])

        path = [initial_head]
        total_movement = 0
        curr = initial_head

        for r in right:
            total_movement += abs(r - curr)
            curr = r
            path.append(curr)

        if left:
            boundary = total_blocks - 1
            if curr < boundary:
                total_movement += abs(boundary - curr)
                curr = boundary
                path.append(curr)
            # Circular jump back to 0
            total_movement += boundary # jump to 0
            curr = 0
            path.append(curr)
            for r in left:
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)

        avg_seek = round(total_movement / float(len(requests)), 2)
        seek_time = round(total_movement * cls.SEEK_PER_CYLINDER_MS, 2)

        return {
            'algorithm': 'C-SCAN',
            'path': path,
            'total_head_movement': total_movement,
            'avg_seek': avg_seek,
            'seek_time_ms': seek_time
        }

    @classmethod
    def look(cls, requests, initial_head=0, direction='up'):
        if not requests:
            return {'path': [initial_head], 'total_head_movement': 0, 'avg_seek': 0, 'seek_time_ms': 0}

        left = sorted([r for r in requests if r < initial_head])
        right = sorted([r for r in requests if r >= initial_head])

        path = [initial_head]
        total_movement = 0
        curr = initial_head

        if direction == 'up':
            for r in right:
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)
            for r in reversed(left):
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)
        else:
            for r in reversed(left):
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)
            for r in right:
                total_movement += abs(r - curr)
                curr = r
                path.append(curr)

        avg_seek = round(total_movement / float(len(requests)), 2)
        seek_time = round(total_movement * cls.SEEK_PER_CYLINDER_MS, 2)

        return {
            'algorithm': 'LOOK',
            'path': path,
            'total_head_movement': total_movement,
            'avg_seek': avg_seek,
            'seek_time_ms': seek_time
        }

    @classmethod
    def evaluate_all(cls, requests, total_blocks=100, initial_head=0):
        """
        Runs all scheduling algorithms across the requested block sequence.
        Returns a comparative summary with minimum seek distance winner.
        """
        algorithms = [
            cls.fcfs(requests, initial_head),
            cls.sstf(requests, initial_head),
            cls.scan(requests, total_blocks, initial_head),
            cls.c_scan(requests, total_blocks, initial_head),
            cls.look(requests, initial_head)
        ]

        winner = min(algorithms, key=lambda x: x['total_head_movement'])

        return {
            'requests': requests,
            'initial_head': initial_head,
            'total_blocks': total_blocks,
            'algorithms': algorithms,
            'winner': winner['algorithm'],
            'min_seek_movement': winner['total_head_movement']
        }
