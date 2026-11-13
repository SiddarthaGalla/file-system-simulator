import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  HardDrive,
  Dna,
  Save,
  RotateCcw,
  Sparkles,
  Sun
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Settings: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const { refreshDevices } = useStorage();
  const toast = useToast();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [password, setPassword] = useState('');
  const [defaultMethod, setDefaultMethod] = useState(user?.settings?.default_allocation_method || 'first_fit');
  const [defaultBlockSize, setDefaultBlockSize] = useState(user?.settings?.default_block_size || 1024);
  const [autoThreshold, setAutoThreshold] = useState(user?.settings?.auto_defrag_threshold || 15.0);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = {
        full_name: fullName,
        settings: {
          default_allocation_method: defaultMethod,
          default_block_size: defaultBlockSize,
          auto_defrag_threshold: autoThreshold,
          theme: 'light'
        }
      };
      if (password) payload.password = password;

      await api.updateProfile(payload);
      await refreshProfile();
      toast.success('Settings and profile updated successfully');
      setPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDemo = async () => {
    try {
      setSeeding(true);
      await api.seedDemo();
      await refreshDevices();
      toast.success('Demonstration scenario seeded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed demo');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">Settings & Preferences</h2>
        <p className="text-xs text-ink-secondary mt-0.5">
          Configure simulator defaults, evolutionary hyperparameters, and researcher credentials
        </p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Profile Card */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-subtle-border pb-3">
            <User className="w-4 h-4 text-ink-primary" />
            <h3 className="font-bold text-sm text-ink-primary">Researcher Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">Username</label>
              <input
                type="text"
                disabled
                value={user?.username || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-canvas-light text-xs text-ink-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">Email</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-canvas-light text-xs text-ink-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Researcher Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-xs focus:outline-none focus:border-ink-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-xs focus:outline-none focus:border-ink-primary"
              />
            </div>
          </div>
        </Card>

        {/* Simulator Policy Defaults */}
        <Card className="space-y-4">
          <div className="flex items-center gap-2 border-b border-subtle-border pb-3">
            <Sliders className="w-4 h-4 text-ink-primary" />
            <h3 className="font-bold text-sm text-ink-primary">Storage Engine Defaults</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Default Allocation Method
              </label>
              <select
                value={defaultMethod}
                onChange={(e) => setDefaultMethod(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-white text-xs focus:outline-none focus:border-ink-primary"
              >
                <option value="first_fit">First Fit</option>
                <option value="best_fit">Best Fit</option>
                <option value="contiguous">Contiguous</option>
                <option value="linked">Linked</option>
                <option value="indexed">Indexed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Default Block Size (KB)
              </label>
              <select
                value={defaultBlockSize}
                onChange={(e) => setDefaultBlockSize(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border bg-white text-xs focus:outline-none focus:border-ink-primary"
              >
                <option value={512}>512 KB</option>
                <option value={1024}>1024 KB (1 MB)</option>
                <option value={2048}>2048 KB (2 MB)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-primary mb-1">
                Auto-Defrag Threshold (%)
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={autoThreshold}
                onChange={(e) => setAutoThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-subtle-border text-xs focus:outline-none focus:border-ink-primary"
              />
            </div>
          </div>
        </Card>

        {/* Visual Theme Info */}
        <Card className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-canvas-light flex items-center justify-center text-ink-primary">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-ink-primary">Design Philosophy & Theme</h4>
              <p className="text-[11px] text-ink-secondary">
                Minimal Modern SaaS Light Theme (Off-white #ECECEB canvas, Lime #8FED0E accents)
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-lime/20 text-ink-primary">
            Active Theme
          </span>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-between items-center pt-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSeedDemo}
            loading={seeding}
            icon={<Sparkles className="w-3.5 h-3.5 text-lime-600" />}
          >
            Reset to Capstone Demo Scenario
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={saving}
            icon={<Save className="w-3.5 h-3.5 text-lime" />}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
};

