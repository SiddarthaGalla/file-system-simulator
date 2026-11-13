import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { VirtualFile, DefragOperation } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';

export const Defragmentation: React.FC = () => {
  const { activeDevice, refreshDevices } = useStorage();
  const toast = useToast();

  const [mode, setMode] = useState<'manual' | 'automatic'>('manual');
  const [threshold, setThreshold] = useState(15.0);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [history, setHistory] = useState<DefragOperation[]>([]);
  const [loading, setLoading] = useState(true);
  const [defragging, setDefragging] = useState(false);
  const [lastResult, setLastResult] = useState<DefragOperation | null>(null);

  // Confirm modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const fetchData = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const fRes = await api.getFiles({ storage_id: activeDevice.id });
      setFiles(fRes.files || []);

      const hRes = await api.getDefragHistory(activeDevice.id);
      setHistory(hRes.operations || []);

      // Auto select fragmented files by default
      const fragIds = (fRes.files || []).filter((f: VirtualFile) => f.is_fragmented).map((f: VirtualFile) => f.id);
      setSelectedFileIds(fragIds);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load defragmenter data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeDevice?.id]);

  const handleRunDefrag = async () => {
    if (!activeDevice) return;
    try {
      setDefragging(true);
      setConfirmModalOpen(false);

      const res = await api.runDefragmentation({
        storage_id: activeDevice.id,
        mode: mode,
        threshold: threshold,
        file_ids: mode === 'manual' ? selectedFileIds : undefined
      });

      if (res.triggered === false) {
        toast.info(res.message);
      } else {
        setLastResult(res.operation);
        toast.success(
          `Defragmentation complete! Moved ${res.operation.blocks_moved} blocks. Frag: ${res.operation.initial_fragmentation}% → ${res.operation.final_fragmentation}%`
        );
        await fetchData();
        await refreshDevices();
      }
    } catch (err: any) {
      toast.error(err.message || 'Defragmentation failed');
    } finally {
      setDefragging(false);
    }
  };

  const toggleSelectFile = (id: number) => {
    if (selectedFileIds.includes(id)) {
      setSelectedFileIds(selectedFileIds.filter((fid) => fid !== id));
    } else {
      setSelectedFileIds([...selectedFileIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Dynamic Defragmentation Engine
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Reorganize non-contiguous file extents and compact free storage blocks
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-canvas-light p-1 rounded-xl border border-subtle-border">
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-white text-ink-primary shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Manual Mode
          </button>
          <button
            onClick={() => setMode('automatic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === 'automatic'
                ? 'bg-white text-ink-primary shadow-sm'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            Automatic Mode
          </button>
        </div>
      </div>

      {/* Main Execution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {mode === 'manual' ? (
          /* Manual Mode Panel */
          <Card className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-subtle-border pb-3">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">Select Target Files to Coalesce</h3>
                <p className="text-[11px] text-ink-secondary">
                  Choose specific files to relocate into contiguous blocks
                </p>
              </div>
              <button
                onClick={() => {
                  const allIds = files.map((f) => f.id);
                  setSelectedFileIds(selectedFileIds.length === allIds.length ? [] : allIds);
                }}
                className="text-xs text-ink-primary font-semibold hover:underline"
              >
                {selectedFileIds.length === files.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {files.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => toggleSelectFile(file.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-canvas-light/70 border-ink-primary'
                        : 'bg-white border-subtle-border hover:bg-canvas-light/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded accent-ink-primary"
                      />
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: file.color_code }}
                      />
                      <div>
                        <div className="font-medium text-ink-primary">{file.name}</div>
                        <div className="text-[10px] text-ink-secondary">
                          {file.allocated_blocks_count} blocks · {file.extents_count} extent(s)
                        </div>
                      </div>
                    </div>
                    {file.is_fragmented ? (
                      <Badge variant="danger">Fragmented</Badge>
                    ) : (
                      <Badge variant="lime">Contiguous</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          /* Automatic Mode Panel */
          <Card className="lg:col-span-2 space-y-4">
            <div className="border-b border-subtle-border pb-3">
              <h3 className="font-bold text-sm text-ink-primary">Automatic Threshold Trigger</h3>
              <p className="text-[11px] text-ink-secondary">
                Storage engine scans continuously; triggers defragmentation when fragmentation exceeds threshold.
              </p>
            </div>

            <div className="space-y-4 py-2">
              <div>
                <div className="flex justify-between items-center mb-1 text-xs">
                  <span className="font-medium text-ink-primary">Trigger Threshold:</span>
                  <span className="font-mono font-bold text-ink-primary">{threshold}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-ink-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-ink-secondary mt-1">
                  <span>5% (Aggressive)</span>
                  <span>15% (Standard)</span>
                  <span>50% (Conservative)</span>
                </div>
              </div>

              <div className="p-4 bg-canvas-light rounded-2xl border border-subtle-border text-xs space-y-2">
                <div className="font-bold text-ink-primary">Automated Policy:</div>
                <p className="text-ink-secondary leading-relaxed">
                  When enabled, any storage operation that pushes file fragmentation above{' '}
                  <strong>{threshold}%</strong> will automatically queue a non-blocking sector reorganization, preserving contiguous free space.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Confirmation & Summary Card */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-lime" />
              <h3 className="font-bold text-sm text-ink-primary">Run Defragmenter</h3>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed mb-4">
              Performs atomic relocation of file sectors. Guarantees 0% data corruption and strict logical block ordering.
            </p>

            <div className="p-3 bg-canvas-light rounded-2xl border border-subtle-border space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-secondary">Target Device:</span>
                <span className="font-bold text-ink-primary">{activeDevice?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Selected Files:</span>
                <span className="font-bold text-ink-primary">
                  {mode === 'manual' ? `${selectedFileIds.length} files` : 'Auto-detected'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-secondary">Transactional:</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> ACID Rollback Safe
                </span>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfirmModalOpen(true)}
            disabled={mode === 'manual' && selectedFileIds.length === 0}
            loading={defragging}
            className="w-full mt-4"
            icon={<Zap className="w-4 h-4 text-lime" />}
          >
            START DEFRAGMENTATION
          </Button>
        </Card>
      </div>

      {/* Latest Operation Metrics Result */}
      {lastResult && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
          <StatCard
            label="Blocks Relocated"
            value={lastResult.blocks_moved}
            subValue={`${lastResult.files_processed} files processed`}
            icon={<Zap className="w-4 h-4 text-lime" />}
            indicator="lime"
          />
          <StatCard
            label="Fragmentation"
            value={`${lastResult.initial_fragmentation}% → ${lastResult.final_fragmentation}%`}
            subValue={`-${lastResult.fragmentation_reduction}% reduction`}
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
            indicator="lime"
          />
          <StatCard
            label="Extents Reduced"
            value={`${lastResult.initial_extents} → ${lastResult.final_extents}`}
            subValue={`-${lastResult.initial_extents - lastResult.final_extents} extents coalesced`}
            icon={<Layers className="w-4 h-4" />}
          />
          <StatCard
            label="Execution Time"
            value={`${lastResult.execution_time_ms} ms`}
            subValue="Transactional commit"
            icon={<RotateCw className="w-4 h-4" />}
          />
        </div>
      )}

      {/* History of Past Defrag Runs */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-subtle-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-ink-primary" />
            <h3 className="font-bold text-sm text-ink-primary">Defragmentation Audit History</h3>
          </div>
          <Badge variant="outline">{history.length} records</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas-light text-ink-secondary font-medium">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Mode</th>
                <th className="py-2.5 px-4">Files</th>
                <th className="py-2.5 px-4">Blocks Moved</th>
                <th className="py-2.5 px-4">Initial Frag</th>
                <th className="py-2.5 px-4">Final Frag</th>
                <th className="py-2.5 px-4">Extents</th>
                <th className="py-2.5 px-4">Execution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle-border">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-ink-secondary italic">
                    No defragmentation operations recorded yet.
                  </td>
                </tr>
              ) : (
                history.map((op) => (
                  <tr key={op.id} className="hover:bg-canvas-light/30">
                    <td className="py-2.5 px-4 font-mono text-ink-secondary">
                      {op.executed_at ? new Date(op.executed_at).toLocaleString() : `#${op.id}`}
                    </td>
                    <td className="py-2.5 px-4 uppercase font-medium text-[11px]">
                      {op.mode}
                    </td>
                    <td className="py-2.5 px-4">{op.files_processed}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-ink-primary">
                      {op.blocks_moved}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-red-600">{op.initial_fragmentation}%</td>
                    <td className="py-2.5 px-4 font-mono text-emerald-600 font-bold">{op.final_fragmentation}%</td>
                    <td className="py-2.5 px-4 font-mono">
                      {op.initial_extents} → {op.final_extents}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-ink-secondary">
                      {op.execution_time_ms} ms
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm Defragmentation Execution"
        description="Verify the parameters before reallocating disk blocks"
        maxWidth="sm"
      >
        <div className="space-y-4 mt-3">
          <div className="p-3 bg-canvas-light rounded-xl border border-subtle-border text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-ink-secondary">Operating Mode:</span>
              <span className="font-bold text-ink-primary uppercase">{mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-secondary">Selected Files:</span>
              <span className="font-bold text-ink-primary">
                {mode === 'manual' ? selectedFileIds.length : 'All fragmented'}
              </span>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleRunDefrag}
            >
              Confirm & Execute
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

