import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HardDrive,
  FolderOpen,
  Activity,
  AlertTriangle,
  Zap,
  BarChart,
  PieChart as PieChartIcon,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart as RechartsBarChart,
  Bar
} from 'recharts';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { Badge } from '../components/ui/Badge';

export const Dashboard: React.FC = () => {
  const { activeDevice } = useStorage();
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboard(activeDevice?.id);
      setData(res);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [activeDevice?.id]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const stats = data?.stats;
  const charts = data?.charts;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Storage Engine Overview
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Active virtual disk: <span className="font-semibold text-ink-primary">{data?.device?.name || 'Default Disk'}</span> ({data?.device?.total_blocks || 0} blocks @ {data?.device?.block_size_kb || 0} KB)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadDashboard}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/optimization')}
            icon={<Zap className="w-3.5 h-3.5 text-lime" />}
          >
            Optimize Storage
          </Button>
        </div>
      </div>

      {/* Primary 8 Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Capacity"
          value={`${((stats?.total_capacity_kb || 0) / 1024).toFixed(1)} MB`}
          subValue={`${stats?.total_capacity_kb || 0} KB`}
          icon={<HardDrive className="w-4 h-4" />}
        />
        <StatCard
          label="Used Storage"
          value={`${((stats?.used_storage_kb || 0) / 1024).toFixed(1)} MB`}
          subValue={`${stats?.storage_utilization_pct || 0}% used`}
          icon={<BarChart className="w-4 h-4" />}
          indicator={stats && stats.storage_utilization_pct > 85 ? 'red' : 'lime'}
        />
        <StatCard
          label="Available Space"
          value={`${((stats?.available_storage_kb || 0) / 1024).toFixed(1)} MB`}
          subValue={`${((stats?.available_storage_kb || 0) / 1024).toFixed(1)} MB free`}
          icon={<HardDrive className="w-4 h-4" />}
        />
        <StatCard
          label="Fragmentation Ratio"
          value={`${stats?.fragmentation_percentage || 0}%`}
          subValue={`${stats?.fragmented_files || 0} fragmented files`}
          icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
          indicator={stats && stats.fragmentation_percentage > 15 ? 'red' : 'lime'}
        />
        <StatCard
          label="Total Uploaded Files"
          value={stats?.total_files || 0}
          subValue={`${stats?.total_extents || 0} total extents`}
          icon={<FolderOpen className="w-4 h-4" />}
        />
        <StatCard
          label="External Fragmentation"
          value={`${stats?.external_fragmentation_pct || 0}%`}
          subValue={`Largest free: ${stats?.largest_free_extent || 0} blks`}
          icon={<Activity className="w-4 h-4" />}
        />
        <StatCard
          label="Wasted Storage"
          value={`${(stats?.wasted_storage_kb || 0).toFixed(1)} KB`}
          subValue="Slack & internal gap"
          icon={<AlertTriangle className="w-4 h-4" />}
        />
        <StatCard
          label="Last Optimization"
          value={stats?.last_optimization_date ? stats.last_optimization_date.split(' ')[0] : 'None'}
          subValue={stats?.last_optimization_date ? stats.last_optimization_date.split(' ').slice(1).join(' ') : 'Pending scan'}
          icon={<Zap className="w-4 h-4" />}
          indicator={stats?.last_optimization_date ? 'lime' : 'neutral'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Storage Usage Donut */}
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm text-ink-primary">Capacity Allocation</h3>
            <PieChartIcon className="w-4 h-4 text-ink-secondary" />
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.storage_usage || []}
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(charts?.storage_usage || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} blocks`, 'Blocks']}
                  contentStyle={{ borderRadius: '12px', borderColor: '#E1E1DE', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-xl font-bold text-ink-primary">{stats?.storage_utilization_pct || 0}%</span>
              <span className="text-[10px] text-ink-secondary uppercase">Utilized</span>
            </div>
          </div>
          <div className="flex justify-center gap-6 pt-2 border-t border-subtle-border text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ink-primary" />
              <span className="text-ink-secondary">Used Blocks</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-subtle-border" />
              <span className="text-ink-secondary">Free Blocks</span>
            </div>
          </div>
        </Card>

        {/* Fragmentation Trend */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-primary">Fragmentation Trend</h3>
              <p className="text-[11px] text-ink-secondary">Historical file and external fragmentation progression</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/fragmentation')}
              className="text-xs"
            >
              Analyze Scan
            </Button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts?.fragmentation_trend || []}>
                <XAxis dataKey="timestamp" stroke="#5B5B59" fontSize={10} tickLine={false} />
                <YAxis stroke="#5B5B59" fontSize={10} domain={[0, 100]} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#E1E1DE', fontSize: '11px' }}
                />
                <Line
                  type="monotone"
                  dataKey="fragmentation"
                  name="File Fragmentation"
                  stroke="#181818"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#181818' }}
                />
                <Line
                  type="monotone"
                  dataKey="external_frag"
                  name="External Fragmentation"
                  stroke="#8FED0E"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#8FED0E' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-subtle-border text-xs text-ink-secondary">
            <span>Dynamic threshold: 15%</span>
            <span className="font-semibold text-ink-primary">
              Status: {Number(stats?.fragmentation_percentage || 0) > 15 ? 'Optimization Recommended' : 'Optimal Arrangement'}
            </span>
          </div>
        </Card>
      </div>

      {/* Allocation Methods & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Method Distribution */}
        <Card className="flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-bold text-sm text-ink-primary">File Allocation Methods</h3>
            <p className="text-[11px] text-ink-secondary">Distribution across current virtual files</p>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={charts?.method_distribution || []}>
                <XAxis dataKey="method" stroke="#5B5B59" fontSize={10} tickLine={false} />
                <YAxis stroke="#5B5B59" fontSize={10} allowDecimals={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', borderColor: '#E1E1DE', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#181818" radius={[6, 6, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-3 border-t border-subtle-border flex justify-between items-center text-xs">
            <span className="text-ink-secondary">Explore algorithm trade-offs</span>
            <button
              onClick={() => navigate('/allocation')}
              className="text-ink-primary font-semibold flex items-center gap-1 hover:underline"
            >
              Algorithms Lab <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>

        {/* Recent Activity Timeline */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-ink-primary">Recent Simulated Activities</h3>
              <p className="text-[11px] text-ink-secondary">Audit log of uploads, scans, GA runs, and defragmentations</p>
            </div>
            <button
              onClick={() => navigate('/reports')}
              className="text-xs font-semibold text-ink-primary hover:underline flex items-center gap-1"
            >
              View Full History <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {(data?.recent_activity || []).length === 0 ? (
              <div className="text-center py-8 text-xs text-ink-secondary">
                No activity recorded yet. Click <strong>DEMO DATA</strong> in the top bar to seed realistic operations!
              </div>
            ) : (
              (data?.recent_activity || []).slice(0, 5).map((act) => (
                <div
                  key={act.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-canvas-light/40 border border-subtle-border hover:bg-canvas-light transition-colors text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        act.action_type.includes('GA') || act.action_type.includes('DEFRAG')
                          ? 'bg-lime'
                          : act.action_type.includes('DELETE')
                          ? 'bg-red-500'
                          : 'bg-ink-primary'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-ink-primary">{act.description}</div>
                      <div className="text-[10px] text-ink-secondary uppercase tracking-wider mt-0.5">
                        {act.action_type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-secondary shrink-0 font-mono">
                    {act.created_at ? new Date(act.created_at).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-subtle-border flex justify-between items-center text-xs text-ink-secondary">
            <span>Transactions are logged atomically</span>
            <span className="font-medium text-ink-primary">Storage Engine: Ready</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

