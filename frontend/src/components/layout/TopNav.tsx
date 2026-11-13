import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, LogOut, User as UserIcon, RotateCcw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useStorage } from '../../context/StorageContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface TopNavProps {
  onOpenMobile: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenMobile }) => {
  const { user, logout } = useAuth();
  const { activeDevice, refreshDevices } = useStorage();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearModalOpen, setClearModalOpen] = useState(false);

  // Map route to human title
  const routeTitles: Record<string, string> = {
    '/': 'Dashboard Overview',
    '/files': 'File Management',
    '/devices': 'Virtual Storage Devices',
    '/storage-map': 'Interactive Storage Map',
    '/fragmentation': 'Fragmentation Analysis',
    '/allocation': 'Allocation Algorithms Lab',
    '/optimization': 'Genetic Algorithm Optimization',
    '/defragmentation': 'Dynamic Defragmentation Engine',
    '/performance': 'Performance Analytics',
    '/comparison': 'Algorithm Comparison Matrix',
    '/reports': 'Audit Logs & Reporting',
    '/settings': 'System Settings',
    '/profile': 'User Profile'
  };

  const currentTitle = routeTitles[location.pathname] || 'Storage Management';

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await api.seedDemo();
      await refreshDevices();
      toast.success('Demonstration scenario seeded with realistic fragmentation!');
      if (location.pathname === '/') {
        window.location.reload();
      } else {
        navigate('/storage-map');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed demo data');
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemoConfirm = async () => {
    try {
      setClearing(true);
      await api.clearDemo(activeDevice?.id);
      await refreshDevices();
      toast.success('All demo files removed! Storage is 100% free and ready for your files.');
      setClearModalOpen(false);
      // Navigate to file management so user can immediately upload
      navigate('/files');
    } catch (err: any) {
      toast.error(err.message || 'Failed to clear storage');
    } finally {
      setClearing(false);
    }
  };

  const hasFiles = (activeDevice?.used_blocks || 0) > 0;

  return (
    <>
      <header className="h-16 bg-white border-b border-subtle-border px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-canvas-light"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm md:text-base font-bold text-ink-primary tracking-tight">
              {currentTitle}
            </h1>
            <div className="text-[11px] text-ink-secondary flex items-center gap-1.5">
              <span>Aegis</span>
              <span>/</span>
              <span className="capitalize">{location.pathname.replace('/', '') || 'Dashboard'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* LOAD / SEED DEMO DATA BUTTON */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSeedDemo}
            loading={seeding}
            className="bg-lime/15 border-lime/30 text-ink-primary hover:bg-lime/25 font-semibold text-xs"
            icon={<Sparkles className="w-3.5 h-3.5 text-lime-600" />}
            title="Load realistic cloud storage scenario with fragmented files"
          >
            {hasFiles ? 'RELOAD DEMO' : 'DEMO DATA'}
          </Button>

          {/* REMOVE DEMO / CLEAR DISK BUTTON (visible whenever files are present) */}
          {hasFiles && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setClearModalOpen(true)}
              className="text-xs text-ink-secondary hover:text-red-600 hover:border-red-200 hover:bg-red-50/50"
              icon={<RotateCcw className="w-3.5 h-3.5 text-red-500" />}
              title="Remove all demo/stored files and start with an empty clean disk"
            >
              CLEAR DEMO
            </Button>
          )}

          {/* User Menu */}
          <div className="flex items-center gap-3 pl-3 border-l border-subtle-border">
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-ink-primary text-white flex items-center justify-center text-xs font-semibold">
                {user?.username ? user.username.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block">
                <div className="text-xs font-bold text-ink-primary leading-none">
                  {user?.full_name || user?.username || 'Researcher'}
                </div>
                <div className="text-[10px] text-ink-secondary mt-0.5">OS Capstone</div>
              </div>
            </button>

            <button
              onClick={logout}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Confirmation Modal to Clear Demo Data */}
      <Modal
        isOpen={clearModalOpen}
        onClose={() => setClearModalOpen(false)}
        title="Remove Demo Data & Reset Storage"
        description="Clear all simulated files and start fresh with an empty disk"
        maxWidth="sm"
      >
        <div className="space-y-4 mt-2">
          <div className="p-3.5 bg-canvas-light rounded-2xl border border-subtle-border text-xs text-ink-primary space-y-2">
            <div className="font-semibold text-ink-primary">What happens when you confirm:</div>
            <ul className="list-disc pl-4 space-y-1 text-ink-secondary text-[11px]">
              <li>All demo files and test extents will be deleted.</li>
              <li>All <strong>{activeDevice?.total_blocks || 100} blocks</strong> will return to 100% free status.</li>
              <li>You will be redirected to the File Manager to upload your own files.</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-subtle-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setClearModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              loading={clearing}
              onClick={handleClearDemoConfirm}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Yes, Clear & Start Fresh
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
