import React, { useState, useEffect } from 'react';
import {
  Grid,
  Layers,
  Split,
  Eye,
  RefreshCw,
  FileText,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { api } from '../services/api';
import { StorageBlock, VirtualFile, GAOptimizationRun } from '../types';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BlockGrid } from '../components/storage-map/BlockGrid';
import { Badge } from '../components/ui/Badge';

export const StorageMap: React.FC = () => {
  const { activeDevice } = useStorage();
  const toast = useToast();

  const [blocks, setBlocks] = useState<StorageBlock[]>([]);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState<StorageBlock | null>(null);
  const [highlightedFileId, setHighlightedFileId] = useState<number | null>(null);

  // View modes: 'current', 'side_by_side'
  const [viewMode, setViewMode] = useState<'current' | 'side_by_side'>('current');
  const [latestGA, setLatestGA] = useState<GAOptimizationRun | null>(null);
  const [optimizedBlocks, setOptimizedBlocks] = useState<StorageBlock[]>([]);

  const fetchStorageData = async () => {
    if (!activeDevice) return;
    try {
      setLoading(true);
      const bRes = await api.getDeviceBlocks(activeDevice.id);
      setBlocks(bRes.blocks || []);

      const fRes = await api.getFiles({ storage_id: activeDevice.id });
      setFiles(fRes.files || []);

      // Check for recent GA run
      const repRes = await api.getReports({ storage_id: activeDevice.id });
      if (repRes.ga_runs && repRes.ga_runs.length > 0) {
        const gaDetails = await api.getGAOptimization(repRes.ga_runs[0].id);
        setLatestGA(gaDetails.run);

        // Build simulated optimized blocks layout based on solution_mapping
        const optMapping: Record<string, number[]> = gaDetails.run.solution_mapping || {};
        const simulated: StorageBlock[] = (bRes.blocks || []).map((b: StorageBlock) => ({
          ...b,
          status: 'free',
          file_id: null,
          file_name: null,
          file_color: null,
          logical_block_index: null,
          next_block_index: null
        }));

        for (const [fidStr, indices] of Object.entries(optMapping)) {
          const fid = parseInt(fidStr, 10);
          const fObj = (fRes.files || []).find((f: VirtualFile) => f.id === fid);
          indices.forEach((bIdx, lIdx) => {
            if (simulated[bIdx]) {
              simulated[bIdx].status = 'allocated';
              simulated[bIdx].file_id = fid;
              simulated[bIdx].file_name = fObj?.name || `File ${fid}`;
              simulated[bIdx].file_color = fObj?.color_code || '#3B82F6';
              simulated[bIdx].logical_block_index = lIdx;
            }
          });
        }
        setOptimizedBlocks(simulated);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch storage map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, [activeDevice?.id]);

  const allocatedCount = blocks.filter((b) => b.status === 'allocated' || b.status === 'index_node').length;
  const freeCount = (activeDevice?.total_blocks || 0) - allocatedCount;

  return (
    <div className="space-y-6">
      {/* Header and View Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Interactive Storage Block Map
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Visual inspection of virtual disk sectors and physical arrangement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {latestGA && (
            <div className="flex items-center bg-canvas-light p-1 rounded-xl border border-subtle-border">
              <button
                onClick={() => setViewMode('current')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'current'
                    ? 'bg-white text-ink-primary shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Current Layout
              </button>
              <button
                onClick={() => setViewMode('side_by_side')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  viewMode === 'side_by_side'
                    ? 'bg-white text-ink-primary shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                Side-by-Side Comparison
              </button>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchStorageData}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Specs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-3xl border border-subtle-border">
        <div className="flex items-center gap-6 text-xs">
          <div>
            <span className="text-[10px] text-ink-secondary uppercase block">Disk Name</span>
            <span className="font-bold text-ink-primary">{activeDevice?.name || 'Virtual Disk'}</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase block">Total Blocks</span>
            <span className="font-bold text-ink-primary">{activeDevice?.total_blocks || 0}</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase block">Allocated Blocks</span>
            <span className="font-bold text-ink-primary">{allocatedCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-ink-secondary uppercase block">Free Blocks</span>
            <span className="font-bold text-ink-primary">{freeCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-white border border-subtle-border" />
            <span className="text-ink-secondary text-[11px]">Free Block</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-ink-secondary text-[11px]">File Extent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-black" />
            <span className="text-ink-secondary text-[11px]">Index Node</span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Block Grid Map */}
          <Card className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">Live Sector Grid</h3>
                <p className="text-[11px] text-ink-secondary">
                  Hover to preview logical mapping, click to inspect extent chains
                </p>
              </div>
              {highlightedFileId && (
                <button
                  onClick={() => setHighlightedFileId(null)}
                  className="text-xs text-ink-secondary hover:text-ink-primary underline"
                >
                  Clear Highlight
                </button>
              )}
            </div>

            <BlockGrid
              blocks={blocks}
              highlightedFileId={highlightedFileId}
              onSelectBlock={(b) => {
                setSelectedBlock(b);
                if (b.file_id) setHighlightedFileId(b.file_id);
              }}
              selectedBlockId={selectedBlock?.id}
            />
          </Card>

          {/* Block Inspector & Files Legend */}
          <div className="space-y-6">
            {/* Inspector Panel */}
            <Card>
              <h3 className="font-bold text-sm text-ink-primary mb-3">Block Inspector</h3>
              {selectedBlock ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-canvas-light rounded-xl border border-subtle-border space-y-1.5 font-mono">
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Block Index:</span>
                      <span className="font-bold text-ink-primary">#{selectedBlock.block_index}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-secondary">Sector Status:</span>
                      <span className="uppercase font-bold text-ink-primary">{selectedBlock.status}</span>
                    </div>
                    {selectedBlock.file_name && (
                      <>
                        <div className="flex justify-between pt-1 border-t border-subtle-border">
                          <span className="text-ink-secondary">Owner File:</span>
                          <span className="font-bold text-ink-primary truncate max-w-[120px]">
                            {selectedBlock.file_name}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Logical Block:</span>
                          <span className="font-bold text-ink-primary">
                            #{selectedBlock.logical_block_index}
                          </span>
                        </div>
                        {selectedBlock.next_block_index !== null && (
                          <div className="flex justify-between">
                            <span className="text-ink-secondary">Next Extent:</span>
                            <span className="font-bold text-ink-primary">
                              #{selectedBlock.next_block_index}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-ink-secondary">
                  Click any block cell on the map to inspect its sector headers and metadata.
                </div>
              )}
            </Card>

            {/* Files Legend */}
            <Card>
              <h3 className="font-bold text-sm text-ink-primary mb-3">Files on Disk</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {files.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setHighlightedFileId(f.id === highlightedFileId ? null : f.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors ${
                      highlightedFileId === f.id
                        ? 'bg-ink-primary text-white font-semibold'
                        : 'hover:bg-canvas-light text-ink-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: f.color_code }}
                      />
                      <span className="truncate">{f.name}</span>
                    </div>
                    <span className="font-mono text-[10px] opacity-75 shrink-0 ml-2">
                      {f.allocated_blocks_count} blks ({f.extents_count} ext)
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Side-by-Side Comparison Layout */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">Current Disk Arrangement</h3>
                <p className="text-[11px] text-ink-secondary">
                  Active virtual disk layout before applying optimization
                </p>
              </div>
              <Badge variant="outline">Current</Badge>
            </div>
            <BlockGrid blocks={blocks} compact />
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-sm text-ink-primary">GA Optimized Arrangement</h3>
                <p className="text-[11px] text-ink-secondary">
                  Re-allocated layout produced by Genetic Algorithm Run #{latestGA?.id}
                </p>
              </div>
              <Badge variant="lime">Optimized</Badge>
            </div>
            <BlockGrid blocks={optimizedBlocks} compact />
          </Card>
        </div>
      )}
    </div>
  );
};
