import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderOpen,
  HardDrive,
  Grid,
  Activity,
  Cpu,
  Dna,
  Zap,
  BarChart3,
  Layers,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import { useStorage } from '../../context/StorageContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggle,
  mobileOpen,
  onCloseMobile
}) => {
  const { activeDevice } = useStorage();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'File Management', path: '/files', icon: FolderOpen },
    { label: 'Storage Devices', path: '/devices', icon: HardDrive },
    { label: 'Storage Map', path: '/storage-map', icon: Grid },
    { label: 'Fragmentation Analysis', path: '/fragmentation', icon: Activity },
    { label: 'Allocation Algorithms', path: '/allocation', icon: Cpu },
    { label: 'GA Optimization', path: '/optimization', icon: Dna },
    { label: 'Defragmentation', path: '/defragmentation', icon: Zap },
    { label: 'Performance Monitor', path: '/performance', icon: BarChart3 },
    { label: 'Comparison Analytics', path: '/comparison', icon: Layers },
    { label: 'Reports & History', path: '/reports', icon: FileText },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-subtle-border">
      {/* Brand Header */}
      <div className="flex items-center justify-between p-5 border-b border-subtle-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-ink-primary flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-sm">
            FS
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-ink-primary leading-tight">
                AegisStorage
              </span>
              <span className="text-[10px] text-ink-secondary">OS Intelligent Simulator</span>
            </div>
          )}
        </div>
        <button
          onClick={onToggle}
          className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-canvas-light transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-ink-primary text-white font-semibold shadow-sm'
                    : 'text-ink-secondary hover:text-ink-primary hover:bg-canvas-light'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
              {!collapsed && item.path === '/optimization' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-lime" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom active device indicator */}
      {!collapsed && (
        <div className="p-4 m-3 bg-canvas-light rounded-2xl border border-subtle-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-ink-secondary uppercase tracking-wider">
              Active Disk
            </span>
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          </div>
          <div className="font-semibold text-xs text-ink-primary truncate">
            {activeDevice ? activeDevice.name : 'No Disk Selected'}
          </div>
          {activeDevice && (
            <div className="text-[10px] text-ink-secondary mt-1 flex justify-between">
              <span>{activeDevice.used_blocks} / {activeDevice.total_blocks} blocks</span>
              <span>{Math.round((activeDevice.used_blocks / (activeDevice.total_blocks || 1)) * 100)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block transition-all duration-300 h-screen sticky top-0 shrink-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {content}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onCloseMobile} />
          <div className="relative w-72 h-full z-10 shadow-2xl animate-slide-right">
            {content}
          </div>
        </div>
      )}
    </>
  );
};

