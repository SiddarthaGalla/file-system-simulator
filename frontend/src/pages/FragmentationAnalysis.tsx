import React, { useState, useEffect } from 'react';
import {
  Activity,
  Scan,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  BarChart2,
  RefreshCw,
  ArrowRight,
  Zap,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { FragmentationAnalysis as FragType, FragmentationScan } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';

export const FragmentationAnalysis: React.FC = () => {
  const { activeDevice, refreshDevices } = useStorage();
  const toast = useToast();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState<FragType | null>(null);
  const [recentScans, setRecentScans] = useState<FragmentationScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const fetchAnalysis = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const res = await api.getFragmentation(activeDevice.id);
      setAnalysis(res.analysis);
      setRecentScans(res.recent_scans || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch fragmentation analysis');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [activeDevice?.id]);

  const handleScan = async () => {
    if (!activeDevice) return;
    try {
      setScanning(true);
      const res = await api.scanFragmentation(activeDevice.id);
      setAnalysis(res.analysis);
      toast.success('Storage sector scan completed successfully!');
      await fetchAnalysis();
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  if (loading && !analysis) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const fragmentedFiles = analysis?.file_details.filter((f) => f.is_fragmented) || [];
  const optimizedFiles = analysis?.file_details.filter((f) => !f.is_fragmented) || [];

  const chartData = (analysis?.file_details || []).map((f) => ({
    name: f.name.length > 12 ? `${f.name.substring(0, 10)}...` : f.name,
    extents: f.extents_count,
    blocks: f.allocated_blocks,
    is_fragmented: f.is_fragmented
  }));

  return (
    <div className="space-y-6">
      {/* Header and Scan Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Fragmentation Detection Engine
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Mathematical analysis of file extents, internal slack, and external fragmentation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAnalysis}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleScan}
            loading={scanning}
            icon={<Scan className="w-3.5 h-3.5 text-lime" />}
          >
            SCAN STORAGE
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Fragmentation Ratio"
          value={`${analysis?.fragmentation_ratio || 0}%`}
          subValue={`${analysis?.fragmented_files_count || 0} of ${analysis?.total_files || 0} files`}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          indicator={analysis && analysis.fragmentation_ratio > 15 ? 'red' : 'lime'}
          tooltip="Simulator metric: (Total Extents - Active Files) / Total Extents"
        />
        <StatCard
          label="External Fragmentation"
          value={`${analysis?.external_fragmentation_pct || 0}%`}
          subValue={`Largest chunk: ${analysis?.largest_free_extent || 0} blocks`}
          icon={<Activity className="w-4 h-4" />}
          indicator={analysis && analysis.external_fragmentation_pct > 25 ? 'red' : 'lime'}
          tooltip="Free space scattered across non-contiguous partitions"
        />
        <StatCard
          label="Internal Fragmentation"
          value={`${analysis?.internal_fragmentation_kb || 0} KB`}
          subValue="Unused block slack capacity"
          icon={<HardDrive className="w-4 h-4" />}
          tooltip="Unused space inside allocated blocks"
        />
        <StatCard
          label="Total Extents on Disk"
          value={analysis?.total_extents || 0}
          subValue={`${analysis?.free_extents_count || 0} free space holes`}
          icon={<BarChart2 className="w-4 h-4" />}
        />
      </div>

      {/* Explanatory Callout Banner */}
      <div className="p-4 bg-white rounded-3xl border border-subtle-border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-canvas-light flex items-center justify-center shrink-0 text-ink-primary">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-ink-primary block">
              OS Principles: File vs. External Fragmentation
            </span>
            <span className="text-ink-secondary">
              <strong>File fragmentation</strong> occurs when a single file is broken into multiple non-contiguous extents.
              <strong>External fragmentation</strong> occurs when free space exists in total, but is fragmented into small holes that cannot satisfy contiguous allocation requests.
            </span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/optimization')}
          className="shrink-0 text-xs font-semibold"
          icon={<Zap className="w-3.5 h-3.5 text-lime" />}
        >
          Run Genetic Optimizer
        </Button>
      </div>

      {/* Extent Count Chart */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-sm text-ink-primary">Extents Per File Distribution</h3>
            <p className="text-[11px] text-ink-secondary">
              Contiguous files have 1 extent. Higher extents indicate severe non-contiguous fragmentation.
            </p>
          </div>
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#5B5B59" fontSize={10} tickLine={false} />
              <YAxis stroke="#5B5B59" fontSize={10} allowDecimals={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#E1E1DE', fontSize: '11px' }}
                formatter={(val: any) => [`${val} extents`, 'Extents']}
              />
              <Bar dataKey="extents" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.extents > 1 ? '#EF4444' : '#181818'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Tables: Fragmented Files vs Optimized Files */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fragmented Files Table */}
        <Card className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-subtle-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="font-bold text-sm text-ink-primary">
                  Fragmented Files ({fragmentedFiles.length})
                </h3>
              </div>
              <Badge variant="danger">Action Required</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light text-ink-secondary font-medium">
                  <tr>
                    <th className="py-2.5 px-4">File Name</th>
                    <th className="py-2.5 px-4">Blocks</th>
                    <th className="py-2.5 px-4">Extents</th>
                    <th className="py-2.5 px-4">Slack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle-border">
                  {fragmentedFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-secondary italic">
                        No fragmented files detected. Storage is optimally organized!
                      </td>
                    </tr>
                  ) : (
                    fragmentedFiles.map((f) => (
                      <tr key={f.file_id} className="hover:bg-canvas-light/30">
                        <td className="py-2.5 px-4 font-medium text-ink-primary truncate max-w-[160px]">
                          {f.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono">{f.allocated_blocks}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-red-600">
                          {f.extents_count} extents
                        </td>
                        <td className="py-2.5 px-4 text-ink-secondary">{f.internal_frag_kb} KB</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3 border-t border-subtle-border text-right">
            <button
              onClick={() => navigate('/defragmentation')}
              className="text-xs font-semibold text-ink-primary hover:underline flex items-center gap-1 ml-auto"
            >
              Open Defragmenter <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Optimized Files Table */}
        <Card className="p-0 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-subtle-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-lime-600" />
                <h3 className="font-bold text-sm text-ink-primary">
                  Contiguous Files ({optimizedFiles.length})
                </h3>
              </div>
              <Badge variant="lime">Optimal</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas-light text-ink-secondary font-medium">
                  <tr>
                    <th className="py-2.5 px-4">File Name</th>
                    <th className="py-2.5 px-4">Blocks</th>
                    <th className="py-2.5 px-4">Extents</th>
                    <th className="py-2.5 px-4">Slack</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle-border">
                  {optimizedFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-ink-secondary italic">
                        No contiguous files present.
                      </td>
                    </tr>
                  ) : (
                    optimizedFiles.map((f) => (
                      <tr key={f.file_id} className="hover:bg-canvas-light/30">
                        <td className="py-2.5 px-4 font-medium text-ink-primary truncate max-w-[160px]">
                          {f.name}
                        </td>
                        <td className="py-2.5 px-4 font-mono">{f.allocated_blocks}</td>
                        <td className="py-2.5 px-4 font-mono font-bold text-ink-primary">1 extent</td>
                        <td className="py-2.5 px-4 text-ink-secondary">{f.internal_frag_kb} KB</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-3 border-t border-subtle-border text-xs text-ink-secondary text-right">
            <span>Optimal sequential I/O transfer ready</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

