import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  Zap
} from 'lucide-react';
import { api } from '../services/api';
import { ActivityLog, FragmentationScan, GAOptimizationRun } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const ReportsHistory: React.FC = () => {
  const { activeDevice } = useStorage();
  const toast = useToast();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [scans, setScans] = useState<FragmentationScan[]>([]);
  const [gaRuns, setGaRuns] = useState<GAOptimizationRun[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchReports = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const params: any = { storage_id: activeDevice.id };
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;

      const res = await api.getReports(params);
      setLogs(res.logs || []);
      setScans(res.scans || []);
      setGaRuns(res.ga_runs || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch reports and history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeDevice?.id, typeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReports();
  };

  return (
    <div className="space-y-6">
      {/* Header and Export Downloads */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Reports & Audit Logs
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Export comprehensive storage analytics, sector dumps, and compliance logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PDF Export Button */}
          <a
            href={api.exportPdfUrl(activeDevice?.id)}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ink-primary text-white text-xs font-semibold hover:bg-black transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-lime" />
            Export PDF Report
          </a>

          {/* CSV Files Export */}
          <a
            href={api.exportCsvUrl('files', activeDevice?.id)}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-subtle-border text-ink-primary text-xs font-semibold hover:bg-canvas-light transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Export Files CSV
          </a>

          {/* CSV Blocks Export */}
          <a
            href={api.exportCsvUrl('blocks', activeDevice?.id)}
            download
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-subtle-border text-ink-primary text-xs font-semibold hover:bg-canvas-light transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            Export Blocks CSV
          </a>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit descriptions..."
              className="w-full pl-9 pr-4 py-2 bg-canvas-light/50 border border-subtle-border rounded-xl text-xs focus:outline-none focus:border-ink-primary"
            />
          </form>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {['', 'FILE_UPLOAD', 'FILE_DELETE', 'SCAN', 'GA_OPTIMIZE', 'DEFRAG'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  typeFilter === t
                    ? 'bg-ink-primary text-white'
                    : 'bg-canvas-light text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {t ? t.replace('_', ' ') : 'All Actions'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Activity Logs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-subtle-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-ink-primary">Simulated Activity Audit Trail</h3>
            <p className="text-[11px] text-ink-secondary">
              Immutable ledger of storage operations on {activeDevice?.name}
            </p>
          </div>
          <Badge variant="outline">{logs.length} entries</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-light text-ink-secondary font-medium">
              <tr>
                <th className="py-2.5 px-4">Action ID</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action Type</th>
                <th className="py-2.5 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-secondary italic">
                    No activity logs recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-canvas-light/30">
                    <td className="py-2.5 px-4 font-mono text-ink-secondary">#{log.id}</td>
                    <td className="py-2.5 px-4 font-mono text-ink-secondary">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono uppercase ${
                          log.action_type.includes('GA') || log.action_type.includes('DEFRAG')
                            ? 'bg-lime/20 text-ink-primary font-bold'
                            : log.action_type.includes('DELETE')
                            ? 'bg-red-50 text-red-600 font-bold'
                            : 'bg-canvas-light text-ink-primary'
                        }`}
                      >
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-ink-primary">{log.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

