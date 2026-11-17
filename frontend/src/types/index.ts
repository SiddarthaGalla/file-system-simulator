export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  settings?: Record<string, any>;
  created_at: string;
}

export interface StorageDevice {
  id: number;
  user_id: number;
  name: string;
  total_capacity_kb: number;
  block_size_kb: number;
  total_blocks: number;
  used_blocks: number;
  free_blocks: number;
  used_kb: number;
  free_kb: number;
  is_active: boolean;
  is_demo_loaded?: boolean;
  has_user_files?: boolean;
  user_files_count?: number;
  demo_files_count?: number;
  created_at: string;
}

export interface StorageBlock {
  id: number;
  device_id: number;
  block_index: number;
  status: 'free' | 'allocated' | 'index_node' | 'reserved';
  file_id: number | null;
  file_name: string | null;
  file_color: string | null;
  logical_block_index: number | null;
  next_block_index: number | null;
  updated_at: string;
}

export interface VirtualFile {
  id: number;
  user_id: number;
  storage_device_id: number;
  folder_id: number | null;
  folder_name?: string;
  name: string;
  file_type: string;
  file_size_bytes: number;
  allocated_blocks_count: number;
  allocation_method: string;
  is_fragmented: boolean;
  extents_count: number;
  index_block_id: number | null;
  color_code: string;
  is_demo?: boolean;
  created_at: string;
  updated_at: string;
  block_indices?: number[];
}

export interface Folder {
  id: number;
  user_id: number;
  storage_device_id: number;
  name: string;
  parent_id: number | null;
  files_count: number;
  created_at: string;
}

export interface FileExtentDetail {
  start: number;
  length: number;
}

export interface FileAnalysis {
  file_id: number;
  name: string;
  file_size_bytes: number;
  allocated_blocks: number;
  extents_count: number;
  is_fragmented: boolean;
  internal_frag_kb: number;
  extents: FileExtentDetail[];
}

export interface FragmentationAnalysis {
  device_id: number;
  total_blocks: number;
  used_blocks: number;
  free_blocks: number;
  storage_utilization: number;
  total_files: number;
  files_with_allocations: number;
  fragmented_files_count: number;
  optimized_files_count: number;
  fragmentation_ratio: number;
  external_fragmentation_pct: number;
  internal_fragmentation_kb: number;
  wasted_storage_kb: number;
  total_extents: number;
  free_extents_count: number;
  largest_free_extent: number;
  file_details: FileAnalysis[];
}

export interface FragmentationScan {
  id: number;
  device_id: number;
  total_blocks: number;
  used_blocks: number;
  free_blocks: number;
  total_files: number;
  fragmented_files_count: number;
  fragmentation_ratio: number;
  external_fragmentation_pct: number;
  internal_fragmentation_kb: number;
  total_extents: number;
  largest_free_extent: number;
  wasted_storage_kb: number;
  scanned_at: string;
}

export interface GAGenerationMetric {
  generation: number;
  best_fitness: number;
  avg_fitness: number;
  best_fragmentation: number;
  extents_count: number;
}

export interface GAOptimizationRun {
  id: number;
  device_id: number;
  population_size: number;
  generations: number;
  mutation_rate: number;
  crossover_rate: number;
  elitism_count: number;
  weights: { w1: number; w2: number; w3: number };
  initial_fragmentation: number;
  optimized_fragmentation: number;
  fragmentation_reduction: number;
  initial_extents: number;
  optimized_extents: number;
  blocks_moved: number;
  execution_time_ms: number;
  fitness_score: number;
  status: 'completed' | 'applied' | 'discarded';
  solution_mapping: Record<string, number[]>;
  created_at: string;
  generation_metrics?: GAGenerationMetric[];
}

export interface DefragOperation {
  id: number;
  device_id: number;
  mode: 'manual' | 'automatic';
  files_processed: number;
  blocks_moved: number;
  execution_time_ms: number;
  initial_fragmentation: number;
  final_fragmentation: number;
  fragmentation_reduction: number;
  initial_extents: number;
  final_extents: number;
  status: string;
  details?: any;
  executed_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  device_id: number | null;
  action_type: string;
  description: string;
  details: any;
  created_at: string;
}

export interface PerformanceMetric {
  id: number;
  device_id: number;
  method: string;
  allocation_time_ms: number;
  simulated_access_time_ms: number;
  fragmentation_ratio: number;
  extents_count: number;
  storage_utilization: number;
  blocks_moved: number;
  recorded_at: string;
}

export interface DashboardData {
  has_device: boolean;
  device?: StorageDevice;
  total_devices: number;
  stats: {
    total_capacity_kb: number;
    used_storage_kb: number;
    available_storage_kb: number;
    total_files: number;
    fragmented_files: number;
    fragmentation_percentage: number;
    external_fragmentation_pct: number;
    wasted_storage_kb: number;
    storage_utilization_pct: number;
    largest_free_extent: number;
    total_extents: number;
    last_optimization_date: string | null;
  };
  charts: {
    storage_usage: Array<{ name: string; value: number; color: string }>;
    fragmentation_trend: Array<{ timestamp: string; fragmentation: number; external_frag: number; extents: number }>;
    method_distribution: Array<{ method: string; count: number }>;
    type_distribution: Array<{ type: string; count: number }>;
  };
  recent_activity: ActivityLog[];
}

