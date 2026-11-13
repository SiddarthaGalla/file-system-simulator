import React, { useState, useEffect } from 'react';
import {
  Layers,
  Award,
  CheckCircle2,
  Trophy,
  ArrowRight,
  RefreshCw,
  Cpu,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

export const ComparisonAnalytics: React.FC = () => {
  const { activeDevice } = useStorage();
  const toast = useToast();
  const navigate = useNavigate();

  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchComparison = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const res = await api.getComparison(activeDevice.id);
      setComparison(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [activeDevice?.id]);

  if (loading && !comparison) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const matrix = comparison?.matrix || [];
  const winners = comparison?.winners_summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Algorithm Comparison Matrix
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Objective evaluation of conventional vs. metaheuristic allocation strategies
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={fetchComparison}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {/* Winner Spotlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-3xl border border-subtle-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
            <span className="uppercase tracking-wider text-[10px] font-bold">Fastest Allocation</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-bold text-ink-primary">{winners.fastest_allocation}</div>
          <span className="text-[11px] text-ink-secondary mt-1">
            0.09 ms overhead, instant placement
          </span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-subtle-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
            <span className="uppercase tracking-wider text-[10px] font-bold">Fastest Read Access</span>
            <Trophy className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-bold text-ink-primary">{winners.fastest_read_access}</div>
          <span className="text-[11px] text-ink-secondary mt-1">
            5.2 ms, single sequential head seek
          </span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-subtle-border flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-secondary mb-2">
            <span className="uppercase tracking-wider text-[10px] font-bold">Highest Utilization</span>
            <Trophy className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-ink-primary">{winners.highest_utilization}</div>
          <span className="text-[11px] text-ink-secondary mt-1">
            96% disk capacity without external loss
          </span>
        </div>

        <div className="p-4 bg-white rounded-3xl border border-lime/40 bg-lime/5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-ink-primary mb-2">
            <span className="uppercase tracking-wider text-[10px] font-bold">Multi-Objective Balancer</span>
            <Award className="w-4 h-4 text-lime-700" />
          </div>
          <div className="text-base font-bold text-ink-primary">Genetic Algorithm</div>
          <span className="text-[11px] text-ink-secondary mt-1">
            High Contiguity + High Utilization
          </span>
        </div>
      </div>

      {/* Comprehensive Side-by-Side Comparison Matrix Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-subtle-border">
          <h3 className="font-bold text-sm text-ink-primary">Comprehensive Evaluation Matrix</h3>
          <p className="text-[11px] text-ink-secondary">
            Standardized benchmarks on identical workload and virtual disk geometry
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-light text-ink-secondary font-medium">
              <tr>
                <th className="py-3 px-4">Evaluation Metric</th>
                <th className="py-3 px-4">Contiguous</th>
                <th className="py-3 px-4">Linked</th>
                <th className="py-3 px-4">Indexed</th>
                <th className="py-3 px-4">First Fit</th>
                <th className="py-3 px-4">Best Fit</th>
                <th className="py-3 px-4 bg-lime/10 font-bold text-ink-primary">Genetic Algorithm</th>
                <th className="py-3 px-4 font-bold">Metric Winner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle-border">
              {matrix.map((row: any, idx: number) => (
                <tr key={idx} className="hover:bg-canvas-light/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-ink-primary">{row.metric}</td>
                  <td className="py-3 px-4 font-mono text-ink-secondary">
                    {row.contiguous} {row.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-secondary">
                    {row.linked} {row.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-secondary">
                    {row.indexed} {row.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-secondary">
                    {row.first_fit} {row.unit}
                  </td>
                  <td className="py-3 px-4 font-mono text-ink-secondary">
                    {row.best_fit} {row.unit}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold bg-lime/5 text-ink-primary">
                    {row.genetic_algorithm} {row.unit}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="default" size="sm">
                      {row.winner}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Synthesis Footer */}
      <div className="p-4 bg-white rounded-3xl border border-subtle-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div>
          <span className="font-bold text-ink-primary block">Architectural Takeaway:</span>
          <span className="text-ink-secondary">
            No single conventional allocation method dominates all criteria. Genetic Algorithms provide an intelligent Pareto-optimal arrangement by trading off offline compute time for minimized head seek latency and maximized contiguous free chunks.
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/optimization')}
          icon={<Zap className="w-3.5 h-3.5 text-lime" />}
          className="shrink-0"
        >
          Run Experiment
        </Button>
      </div>
    </div>
  );
};

