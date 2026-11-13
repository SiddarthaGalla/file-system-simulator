import React, { useState } from 'react';
import {
  Dna,
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { GAOptimizationRun } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const GAOptimization: React.FC = () => {
  const { activeDevice, refreshDevices } = useStorage();
  const toast = useToast();

  // GA Configuration state
  const [populationSize, setPopulationSize] = useState(40);
  const [generations, setGenerations] = useState(30);
  const [mutationRate, setMutationRate] = useState(0.15);
  const [crossoverRate, setCrossoverRate] = useState(0.85);
  const [elitismCount, setElitismCount] = useState(2);
  const [w1, setW1] = useState(0.55); // Extent / Fragmentation reduction
  const [w2, setW2] = useState(0.30); // Contiguous free space
  const [w3, setW3] = useState(0.15); // Movement cost penalty

  const [running, setRunning] = useState(false);
  const [gaResult, setGaResult] = useState<GAOptimizationRun | null>(null);

  // Apply modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleRunOptimization = async () => {
    if (!activeDevice) {
      toast.error('No active storage device found');
      return;
    }

    try {
      setRunning(true);
      const res = await api.runGAOptimization({
        storage_id: activeDevice.id,
        population_size: populationSize,
        generations: generations,
        mutation_rate: mutationRate,
        crossover_rate: crossoverRate,
        elitism_count: elitismCount,
        weights: { w1, w2, w3 }
      });
      setGaResult(res.run);
      toast.success(
        `GA converged in ${res.run.execution_time_ms} ms! Fragmentation: ${res.run.initial_fragmentation}% → ${res.run.optimized_fragmentation}%`
      );
    } catch (err: any) {
      toast.error(err.message || 'Optimization run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!gaResult) return;
    try {
      setApplying(true);
      await api.applyGAOptimization(gaResult.id);
      toast.success('Optimized allocation applied to virtual disk!');
      setApplyModalOpen(false);
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply optimized allocation');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Genetic Algorithm Optimization Engine
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Metaheuristic multi-objective optimization for non-contiguous file extents reduction
          </p>
        </div>

        {gaResult && gaResult.status !== 'applied' && (
          <Button
            variant="accent"
            size="sm"
            onClick={() => setApplyModalOpen(true)}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            APPLY OPTIMIZED ALLOCATION
          </Button>
        )}
      </div>

      {/* Configuration Panel and Action Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GA Parameters Configuration Card */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-subtle-border pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-ink-primary" />
              <h3 className="font-bold text-sm text-ink-primary">Evolutionary Hyperparameters</h3>
            </div>
            <Badge variant="outline">Configurable GA</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Population Size: <span className="font-bold">{populationSize}</span>
              </label>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={populationSize}
                onChange={(e) => setPopulationSize(Number(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <span className="text-[10px] text-ink-secondary">Candidate layouts per generation</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Generations: <span className="font-bold">{generations}</span>
              </label>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={generations}
                onChange={(e) => setGenerations(Number(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <span className="text-[10px] text-ink-secondary">Iterative evolution cycles</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Elitism Count: <span className="font-bold">{elitismCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={elitismCount}
                onChange={(e) => setElitismCount(Number(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <span className="text-[10px] text-ink-secondary">Preserved best chromosomes</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Crossover Probability: <span className="font-bold">{(crossoverRate * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={crossoverRate}
                onChange={(e) => setCrossoverRate(Number(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <span className="text-[10px] text-ink-secondary">Order crossover rate</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Mutation Rate: <span className="font-bold">{(mutationRate * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.4"
                step="0.05"
                value={mutationRate}
                onChange={(e) => setMutationRate(Number(e.target.value))}
                className="w-full accent-ink-primary cursor-pointer"
              />
              <span className="text-[10px] text-ink-secondary">Block coalescing & swap probability</span>
            </div>
          </div>

          {/* Fitness Function Multi-Objective Weights */}
          <div className="pt-2 border-t border-subtle-border">
            <span className="text-xs font-bold text-ink-primary block mb-2">
              Weighted Fitness Objective: F = w₁(1 - Frag) + w₂(Contiguity) - w₃(Movement)
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-ink-secondary">w₁ (Extent Reduction)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={w1}
                  onChange={(e) => setW1(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-subtle-border text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink-secondary">w₂ (Free Contiguity)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={w2}
                  onChange={(e) => setW2(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-subtle-border text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-ink-secondary">w₃ (Movement Penalty)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="0.5"
                  value={w3}
                  onChange={(e) => setW3(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-subtle-border text-xs"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Execution Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Dna className="w-5 h-5 text-lime" />
              <h3 className="font-bold text-sm text-ink-primary">Optimization Execution</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed mb-4">
              Executes Python Genetic Algorithm engine. Evaluates fitness scores, crosses chromosomes, and solves sector allocation respecting all physical invariants.
            </p>

            <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Target Device:</span>
                <span className="font-bold text-ink-primary">{activeDevice?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Active Files:</span>
                <span className="font-bold text-ink-primary">
                  {activeDevice?.used_blocks} blocks allocated
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Safety Guarantee:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 100% Invariant Safe
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleRunOptimization}
            loading={running}
            className="w-full mt-4"
            icon={<Play className="w-4 h-4 text-lime" />}
          >
            RUN OPTIMIZATION
          </Button>
        </Card>
      </div>

      {/* Results Overview (if GA has been run) */}
      {gaResult && (
        <div className="space-y-6 animate-fade-in">
          {/* 4 Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Fragmentation Reduction"
              value={`${gaResult.initial_fragmentation}% → ${gaResult.optimized_fragmentation}%`}
              subValue={`-${gaResult.fragmentation_reduction}% reduced`}
              icon={<TrendingDown className="w-4 h-4 text-emerald-600" />}
              indicator="lime"
            />
            <StatCard
              label="Extent Count"
              value={`${gaResult.initial_extents} → ${gaResult.optimized_extents}`}
              subValue={`-${gaResult.initial_extents - gaResult.optimized_extents} extents coalesced`}
              icon={<Layers className="w-4 h-4" />}
              indicator="lime"
            />
            <StatCard
              label="Convergence Execution Time"
              value={`${gaResult.execution_time_ms} ms`}
              subValue={`Over ${gaResult.generations} generations`}
              icon={<Sparkles className="w-4 h-4" />}
            />
            <StatCard
              label="Best Fitness Score"
              value={gaResult.fitness_score}
              subValue={`${gaResult.blocks_moved} blocks relocated`}
              icon={<Dna className="w-4 h-4" />}
            />
          </div>

          {/* Generation-by-Generation Fitness Chart */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">
                  Generation-Wise Fitness & Fragmentation Convergence
                </h3>
                <p className="text-[11px] text-ink-secondary">
                  Tracking population best fitness and extent ratio over iterative evolution
                </p>
              </div>
              <Badge variant="lime">Converged</Badge>
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gaResult.generation_metrics || []}>
                  <XAxis dataKey="generation" stroke="#5B5B59" fontSize={10} tickLine={false} label={{ value: 'Generation', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                  <YAxis stroke="#5B5B59" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#E1E1DE', fontSize: '11px' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                  <Line
                    type="monotone"
                    dataKey="best_fitness"
                    name="Best Fitness"
                    stroke="#8FED0E"
                    strokeWidth={2.5}
                    dot={{ r: 2, fill: '#8FED0E' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_fitness"
                    name="Average Fitness"
                    stroke="#5B5B59"
                    strokeDasharray="3 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="best_fragmentation"
                    name="Fragmentation %"
                    stroke="#181818"
                    strokeWidth={2}
                    dot={{ r: 2, fill: '#181818' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* Apply Confirmation Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title="Apply Genetic Algorithm Allocation"
        description="Write the optimized block arrangement into the simulated virtual disk."
        maxWidth="md"
      >
        <div className="space-y-4 mt-3">
          <div className="p-4 bg-lime/15 border border-lime/30 rounded-2xl text-xs space-y-2">
            <div className="font-bold text-ink-primary">Optimized Solution Summary:</div>
            <div className="flex justify-between text-ink-secondary">
              <span>Fragmentation:</span>
              <span className="font-bold text-ink-primary">
                {gaResult?.initial_fragmentation}% → {gaResult?.optimized_fragmentation}%
              </span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>Extents:</span>
              <span className="font-bold text-ink-primary">
                {gaResult?.initial_extents} → {gaResult?.optimized_extents}
              </span>
            </div>
            <div className="flex justify-between text-ink-secondary">
              <span>Relocated Blocks:</span>
              <span className="font-bold text-ink-primary">{gaResult?.blocks_moved}</span>
            </div>
          </div>

          <p className="text-xs text-ink-secondary">
            All file contents and logical block sequences are strictly preserved through transactional database reallocation.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setApplyModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              loading={applying}
              onClick={handleApplyOptimization}
            >
              Confirm & Apply to Disk
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

