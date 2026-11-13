import React, { useState } from 'react';
import {
  HardDrive,
  Plus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Server,
  Layers,
  Database
} from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';

export const StorageDevices: React.FC = () => {
  const { devices, activeDevice, refreshDevices, selectActiveDevice } = useStorage();
  const toast = useToast();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('Virtual Disk 2');
  const [capacityMb, setCapacityMb] = useState(100);
  const [blockSizeKb, setBlockSizeKb] = useState(1024);
  const [creating, setCreating] = useState(false);

  // Reset & Delete modals
  const [resetTargetId, setResetTargetId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const calculatedBlocks = Math.floor((capacityMb * 1024) / (blockSizeKb || 1));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setCreating(true);
      await api.createDevice({
        name: name.trim(),
        total_capacity_kb: capacityMb * 1024,
        block_size_kb: blockSizeKb
      });
      toast.success(`Storage device '${name}' created with ${calculatedBlocks} blocks!`);
      setCreateModalOpen(false);
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create storage device');
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async () => {
    if (!resetTargetId) return;
    try {
      setActionLoading(true);
      await api.resetDevice(resetTargetId);
      toast.success('Storage device reset to 100% free blocks!');
      setResetTargetId(null);
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset device');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setActionLoading(true);
      await api.deleteDevice(deleteTargetId);
      toast.success('Storage device deleted successfully');
      setDeleteTargetId(null);
      await refreshDevices();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete device');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-primary">
            Virtual Storage Devices
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            Configure simulated disks, physical block sizing, and capacity constraints
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5 text-lime" />}
        >
          Create Virtual Disk
        </Button>
      </div>

      {/* Storage Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => {
          const isActive = activeDevice?.id === device.id;
          const pct = Math.round((device.used_blocks / (device.total_blocks || 1)) * 100);

          return (
            <Card
              key={device.id}
              className={`flex flex-col justify-between relative transition-all ${
                isActive ? 'ring-2 ring-ink-primary shadow-md' : 'hover:border-ink-muted'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-canvas-light flex items-center justify-center text-ink-primary">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink-primary">{device.name}</h3>
                      <span className="text-[10px] text-ink-secondary">Device ID: #{device.id}</span>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge variant="lime">ACTIVE DISK</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => selectActiveDevice(device.id)}
                      className="text-xs font-semibold hover:bg-canvas-light"
                    >
                      Set Active
                    </Button>
                  )}
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-canvas-light/50 rounded-2xl border border-subtle-border my-4 text-xs">
                  <div>
                    <span className="text-[10px] text-ink-secondary block uppercase">Capacity</span>
                    <span className="font-bold text-ink-primary">
                      {(device.total_capacity_kb / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary block uppercase">Block Size</span>
                    <span className="font-bold text-ink-primary">{device.block_size_kb} KB</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary block uppercase">Total Blocks</span>
                    <span className="font-bold text-ink-primary">{device.total_blocks}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-ink-secondary block uppercase">Free Blocks</span>
                    <span className="font-bold text-ink-primary">{device.free_blocks}</span>
                  </div>
                </div>

                {/* Utilization Progress Bar */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-secondary">Capacity Used</span>
                    <span className="font-bold text-ink-primary">{pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-canvas-light overflow-hidden border border-subtle-border">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pct > 85 ? 'bg-red-500' : 'bg-ink-primary'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-subtle-border flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setResetTargetId(device.id)}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Reset Disk
                </Button>
                {devices.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTargetId(device.id)}
                    className="text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create Device Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Configure New Simulated Storage Disk"
        description="Specify disk size and individual block partition size"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-ink-primary mb-1">Disk Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. High-Speed NVMe Simulation"
              className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-xs focus:outline-none focus:border-ink-primary"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Total Capacity (MB)
              </label>
              <select
                value={capacityMb}
                onChange={(e) => setCapacityMb(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-white text-xs focus:outline-none focus:border-ink-primary"
              >
                <option value={20}>20 MB (Micro Disk)</option>
                <option value={50}>50 MB (Small Disk)</option>
                <option value={100}>100 MB (Standard Disk)</option>
                <option value={200}>200 MB (Large Disk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Block Size (KB)
              </label>
              <select
                value={blockSizeKb}
                onChange={(e) => setBlockSizeKb(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-white text-xs focus:outline-none focus:border-ink-primary"
              >
                <option value={512}>512 KB</option>
                <option value={1024}>1024 KB (1 MB)</option>
                <option value={2048}>2048 KB (2 MB)</option>
                <option value={4096}>4096 KB (4 MB)</option>
              </select>
            </div>
          </div>

          {/* Calculated Block Summary */}
          <div className="p-3 bg-canvas-light rounded-xl border border-subtle-border text-xs flex justify-between items-center">
            <span className="text-ink-secondary">Calculated Total Blocks:</span>
            <span className="font-mono font-bold text-ink-primary text-sm">
              {calculatedBlocks} Blocks
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={creating}
              icon={<HardDrive className="w-3.5 h-3.5 text-lime" />}
            >
              Initialize Storage
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Modal */}
      <Modal
        isOpen={resetTargetId !== null}
        onClose={() => setResetTargetId(null)}
        title="Confirm Storage Device Reset"
        description="All files, allocations, and scans on this simulated device will be cleared."
        maxWidth="sm"
      >
        <div className="space-y-4 mt-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            This will wipe all simulated files on this virtual disk and reset all blocks to free state.
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setResetTargetId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleReset}
            >
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        title="Delete Storage Device"
        description="Permanently removes this simulated disk configuration."
        maxWidth="sm"
      >
        <div className="space-y-4 mt-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Are you sure you want to delete this storage device?
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTargetId(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={actionLoading}
              onClick={handleDelete}
            >
              Delete Device
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

