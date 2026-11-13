import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Link as LinkIcon,
  FolderTree,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Gauge,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const AllocationAlgorithms: React.FC = () => {
  const { activeDevice } = useStorage();
  const toast = useToast();

  const [selectedMethod, setSelectedMethod] = useState('first_fit');
  const [blocksNeeded, setBlocksNeeded] = useState(6);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  const algorithms = [
    {
      id: 'contiguous',
      name: 'Contiguous Allocation',
      icon: Layers,
      description: 'Requires each file to occupy a set of contiguous blocks on the disk.',
      pros: 'Fastest sequential and direct read access (minimal disk head seeks).',
      cons: 'Suffers severely from external fragmentation; difficult to find contiguous space for growing files.',
      principles: 'Maintains directory with starting block and length. Head only seeks once to starting block.'
    },
    {
      id: 'linked',
      name: 'Linked Allocation',
      icon: LinkIcon,
      description: 'Each file is a linked list of disk blocks scattered anywhere across storage.',
      pros: 'Completely eliminates external fragmentation; any free block can satisfy allocation.',
      cons: 'Direct/random access is slow because pointers must be traversed sequentially; pointer overhead per block.',
      principles: 'Directory contains pointer to first and last blocks. Each block stores pointer to next sector.'
    },
    {
      id: 'indexed',
      name: 'Indexed Allocation',
      icon: FolderTree,
      description: 'Brings all pointers together into one dedicated Index Block (i-node).',
      pros: 'Supports direct access without external fragmentation.',
      cons: 'Pointers overhead wasted for very small files; file size limited by single index block capacity.',
      principles: 'Index block i-th entry points to the i-th file block. Direct address lookup is O(1).'
    },
    {
      id: 'first_fit',
      name: 'First Fit Strategy',
      icon: Cpu,
      description: 'Scans the virtual disk from block 0 and allocates the first hole large enough.',
      pros: 'Extremely fast allocation execution time.',
      cons: 'Tends to crowd small fragmented remnants near the beginning of the disk.'
    },
    {
      id: 'best_fit',
      name: 'Best Fit Strategy',
      icon: Gauge,
      description: 'Allocates the smallest free segment that is large enough to satisfy the request.',
      pros: 'Leaves larger free holes intact for future large file allocations.',
      cons: 'Slower execution because entire free list must be searched; creates tiny unusable slivers.'
    }
  ];

  const handleSimulate = async () => {
    if (!activeDevice) {
      toast.error('No active storage device found');
      return;
    }

    try {
      setSimulating(true);
      const res = await api.testAllocate({
        storage_id: activeDevice.id,
        blocks_needed: blocksNeeded,
        method: selectedMethod
      });
      setSimResult(res.result);
      if (res.result.success) {
        toast.success(`Allocation simulation successful! (${res.result.extents} extents)`);
      } else {
        toast.error(`Allocation failed: ${res.result.error}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setSimulating(false);
    }
  };

  const activeAlgo = algorithms.find((a) => a.id === selectedMethod) || algorithms[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">
          File Allocation Algorithms Lab
        </h2>
        <p className="text-xs text-ink-secondary mt-0.5">
          Simulate Operating Systems contiguous, linked, and indexed disk allocation schemes
        </p>
      </div>

      {/* Algorithm Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {algorithms.map((algo) => {
          const isSelected = selectedMethod === algo.id;
          const Icon = algo.icon;
          return (
            <button
              key={algo.id}
              onClick={() => {
                setSelectedMethod(algo.id);
                setSimResult(null);
              }}
              className={`p-4 rounded-3xl border text-left flex flex-col justify-between transition-all duration-200 select-none ${
                isSelected
                  ? 'bg-ink-primary text-white border-transparent shadow-md'
                  : 'bg-white text-ink-primary border-subtle-border hover:border-ink-muted'
              }`}
            >
              <div>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${
                    isSelected ? 'bg-white/10 text-lime' : 'bg-canvas-light text-ink-primary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs">{algo.name}</div>
              </div>
              <div
                className={`text-[10px] mt-3 line-clamp-2 ${
                  isSelected ? 'text-white/70' : 'text-ink-secondary'
                }`}
              >
                {algo.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Interactive Simulation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Theory & Architecture Info */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-subtle-border pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-ink-primary" />
              <h3 className="font-bold text-sm text-ink-primary">{activeAlgo.name} Principles</h3>
            </div>
            <Badge variant="outline">{activeAlgo.id.toUpperCase()}</Badge>
          </div>

          <p className="text-xs text-ink-secondary leading-relaxed">
            {activeAlgo.description} {activeAlgo.principles}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-canvas-light/50 rounded-2xl border border-subtle-border">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-1">
                Advantages (Pros)
              </span>
              <p className="text-xs text-ink-primary">{activeAlgo.pros}</p>
            </div>
            <div className="p-3 bg-canvas-light/50 rounded-2xl border border-subtle-border">
              <span className="text-[10px] uppercase font-bold text-red-700 block mb-1">
                Trade-offs (Cons)
              </span>
              <p className="text-xs text-ink-primary">{activeAlgo.cons}</p>
            </div>
          </div>
        </Card>

        {/* Live Simulation Runner Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Play className="w-4 h-4 text-lime-600" />
              <h3 className="font-bold text-sm text-ink-primary">Live Allocation Simulator</h3>
            </div>
            <p className="text-[11px] text-ink-secondary mb-4">
              Test how <strong>{activeAlgo.name}</strong> places a file of size N on the current virtual disk.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-primary mb-1">
                  Required Blocks (N)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={blocksNeeded}
                    onChange={(e) => setBlocksNeeded(Number(e.target.value))}
                    className="flex-1 accent-ink-primary cursor-pointer"
                  />
                  <span className="font-mono font-bold text-xs w-8 text-right">
                    {blocksNeeded}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-canvas-light rounded-xl border border-subtle-border text-xs flex justify-between">
                <span className="text-ink-secondary">Target Device:</span>
                <span className="font-bold text-ink-primary truncate max-w-[140px]">
                  {activeDevice?.name || 'Active Disk'}
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={handleSimulate}
            loading={simulating}
            className="w-full mt-4"
            icon={<Play className="w-4 h-4 text-lime" />}
          >
            Simulate Allocation
          </Button>
        </Card>
      </div>

      {/* Simulation Result Panel */}
      {simResult && (
        <Card className="animate-fade-in border-ink-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {simResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-lime-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <h3 className="font-bold text-sm text-ink-primary">
                Simulation Execution Result:{' '}
                {simResult.success ? 'ALLOCATION SUCCESSFUL' : 'ALLOCATION FAILED'}
              </h3>
            </div>
            <Badge variant={simResult.success ? 'lime' : 'danger'}>
              {simResult.success ? `${simResult.extents} Extents` : 'Failed'}
            </Badge>
          </div>

          {simResult.success ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border">
                <span className="text-[10px] text-ink-secondary block uppercase">Execution Time</span>
                <span className="font-mono font-bold text-sm text-ink-primary">
                  {simResult.execution_time_ms} ms
                </span>
              </div>
              <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border">
                <span className="text-[10px] text-ink-secondary block uppercase">Extents Created</span>
                <span className="font-mono font-bold text-sm text-ink-primary">
                  {simResult.extents}
                </span>
              </div>
              <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border">
                <span className="text-[10px] text-ink-secondary block uppercase">Simulated Access</span>
                <span className="font-mono font-bold text-sm text-ink-primary">
                  {simResult.simulated_access_time_ms} ms
                </span>
              </div>
              <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border">
                <span className="text-[10px] text-ink-secondary block uppercase">Allocated Blocks</span>
                <span className="font-mono font-bold text-xs text-ink-primary truncate block">
                  [{simResult.block_indices.join(', ')}]
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
              <span className="font-bold block mb-1">Reason for Failure:</span>
              {simResult.error}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

