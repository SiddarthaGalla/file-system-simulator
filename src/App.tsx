import React, { useState } from 'react';
import {
  HardDrive,
  Cpu,
  Layers,
  Terminal as TerminalIcon,
  BarChart2,
  Play,
  Plus,
  Trash2,
  Database,
  Search,
  AlertTriangle,
  Info
} from 'lucide-react';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { useTheme } from './context/ThemeContext';

interface MockBlock {
  id: number;
  type: 'free' | 'file-a' | 'file-b' | 'file-c' | 'meta';
  fileName?: string;
  fileOffset?: number;
  usedBytes?: number;
  nextBlock?: number | null;
}

const TOTAL_BLOCKS = 64;
const BLOCK_SIZE = 4096; // 4 KB

// Pre-seeded realistic disk layout demonstrating allocation, fragmentation & metadata
const INITIAL_BLOCKS: MockBlock[] = Array.from({ length: TOTAL_BLOCKS }, (_, i) => {
  if (i === 0) {
    return { id: i, type: 'meta', fileName: 'Superblock / Inode Map', usedBytes: 4096, nextBlock: null };
  }
  if (i === 1) {
    return { id: i, type: 'meta', fileName: 'FAT / Block Allocation Table', usedBytes: 4096, nextBlock: null };
  }
  // File A (Blue) - Contiguous run [2..7]
  if (i >= 2 && i <= 6) {
    return { id: i, type: 'file-a', fileName: 'kernel.sys', fileOffset: (i - 2) * BLOCK_SIZE, usedBytes: 4096, nextBlock: i + 1 };
  }
  if (i === 7) {
    return { id: i, type: 'file-a', fileName: 'kernel.sys', fileOffset: 5 * BLOCK_SIZE, usedBytes: 2150, nextBlock: null }; // Slack: 1946B
  }
  // Holes (Free space) [8..11]
  if (i >= 8 && i <= 11) {
    return { id: i, type: 'free' };
  }
  // File B (Green) - [12..17]
  if (i >= 12 && i <= 16) {
    return { id: i, type: 'file-b', fileName: 'db_records.dat', fileOffset: (i - 12) * BLOCK_SIZE, usedBytes: 4096, nextBlock: i === 16 ? null : i + 1 };
  }
  if (i === 17) {
    return { id: i, type: 'file-b', fileName: 'db_records.dat', fileOffset: 5 * BLOCK_SIZE, usedBytes: 3420, nextBlock: null };
  }
  // Free [18..21]
  if (i >= 18 && i <= 21) {
    return { id: i, type: 'free' };
  }
  // File C (Violet) - Fragmented linked list [22, 28, 35, 42]
  if (i === 22) return { id: i, type: 'file-c', fileName: 'web_access.log', fileOffset: 0, usedBytes: 4096, nextBlock: 28 };
  if (i === 28) return { id: i, type: 'file-c', fileName: 'web_access.log', fileOffset: 4096, usedBytes: 4096, nextBlock: 35 };
  if (i === 35) return { id: i, type: 'file-c', fileName: 'web_access.log', fileOffset: 8192, usedBytes: 4096, nextBlock: 42 };
  if (i === 42) return { id: i, type: 'file-c', fileName: 'web_access.log', fileOffset: 12288, usedBytes: 1200, nextBlock: null };

  // Metadata Inode blocks [23, 24]
  if (i === 23 || i === 24) {
    return { id: i, type: 'meta', fileName: `Inode Table Block #${i}`, usedBytes: 4096, nextBlock: null };
  }

  return { id: i, type: 'free' };
});

export const App: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'disk' | 'comparison' | 'terminal' | 'tokens'>('disk');
  const [blocks] = useState<MockBlock[]>(INITIAL_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<number>(7);
  const [activeHeadBlockId, setActiveHeadBlockId] = useState<number>(22);
  const [allocationMethod, setAllocationMethod] = useState<string>('contiguous-bestfit');

  const selectedBlock = blocks[selectedBlockId] || blocks[0];

  return (
    <>
      {/* Top Application Navigation */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">
            <HardDrive size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="brand-title">File-System Simulator</span>
              <span className="badge badge-blue" style={{ marginLeft: '8px' }}>OS Capstone</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span>Theme:</span>
            <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {resolvedTheme === 'dark' ? 'Midnight Navy' : 'Refined Light'}
            </span>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      {/* Main Container */}
      <main className="app-main">
        {/* KPI Metrics Summary Cards */}
        <section className="kpi-grid" aria-label="Disk System Metrics">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Disk Capacity</span>
              <HardDrive size={16} color="var(--color-primary)" />
            </div>
            <div className="metric-value">256.0 <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>KB</span></div>
            <div className="metric-sub">64 Blocks &bull; 4,096 B / block</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Allocated Payload</span>
              <Database size={16} color="var(--color-success)" />
            </div>
            <div className="metric-value">68.75 <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>%</span></div>
            <div className="metric-sub">176 KB used &bull; 80 KB free</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Internal Fragmentation</span>
              <AlertTriangle size={16} color="var(--color-warning)" />
            </div>
            <div className="metric-value">5.82 <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>KB</span></div>
            <div className="metric-sub">Slack bytes in tail blocks</div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">External Fragmentation</span>
              <Layers size={16} color="var(--color-secondary)" />
            </div>
            <div className="metric-value">18.75 <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-secondary)' }}>%</span></div>
            <div className="metric-sub">Largest contiguous chunk: 4 blocks</div>
          </div>
        </section>

        {/* View Switcher Tabs */}
        <nav className="tabs-bar" aria-label="Main Navigation Tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'disk' ? 'active' : ''}`}
            onClick={() => setActiveTab('disk')}
          >
            <HardDrive size={15} />
            Interactive Disk Grid
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            <BarChart2 size={15} />
            Multi-Algorithm Comparison
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            <TerminalIcon size={15} />
            OS Terminal Emulator
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            <Cpu size={15} />
            Design Tokens & Theme Guide
          </button>
        </nav>

        {/* Tab 1: Interactive Disk Grid */}
        {activeTab === 'disk' && (
          <div className="main-workbench">
            {/* Control Sidebar */}
            <aside className="sidebar-panel">
              <div>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                  Storage Controller
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Configure allocation policies and drive operations.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="alloc-strategy">Allocation Strategy</label>
                <select
                  id="alloc-strategy"
                  className="select"
                  value={allocationMethod}
                  onChange={(e) => setAllocationMethod(e.target.value)}
                >
                  <option value="contiguous-firstfit">Contiguous (First-Fit)</option>
                  <option value="contiguous-bestfit">Contiguous (Best-Fit)</option>
                  <option value="contiguous-worstfit">Contiguous (Worst-Fit)</option>
                  <option value="linked">Linked Allocation (Pointer Chains)</option>
                  <option value="fat">File Allocation Table (FAT)</option>
                  <option value="indexed">Single-Level Indexed</option>
                  <option value="inode">UNIX Inode (Multi-Level)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="create-filename">File Name</label>
                <input
                  id="create-filename"
                  type="text"
                  className="input"
                  placeholder="e.g. dataset.csv"
                  defaultValue="dataset.csv"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="create-filesize">File Size (Bytes)</label>
                <input
                  id="create-filesize"
                  type="number"
                  className="input"
                  defaultValue={14336}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Requires 4 blocks (16 KB allocated)
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn-primary">
                  <Plus size={15} />
                  Allocate File
                </button>
                <button type="button" className="btn btn-secondary">
                  <Search size={15} />
                  Simulate Random Seek
                </button>
                <button type="button" className="btn btn-outline">
                  <Play size={15} />
                  Run Churn Workload
                </button>
                <button type="button" className="btn btn-danger">
                  <Trash2 size={15} />
                  Format Drive (mkfs)
                </button>
              </div>

              <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  <Info size={14} color="var(--color-primary)" />
                  <span>Head Seek Latency: <strong>3.2 ms</strong></span>
                </div>
              </div>
            </aside>

            {/* Central Disk Grid & Inspector */}
            <section className="content-panel">
              <div className="disk-container">
                {/* Disk Toolbar & Legend */}
                <div className="disk-toolbar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Physical Disk Map</span>
                    <span className="badge badge-neutral">LBA 00..63</span>
                  </div>

                  <div className="disk-legend">
                    <div className="legend-item">
                      <div className="legend-swatch" style={{ background: 'var(--block-free-bg)', borderColor: 'var(--block-free-border)' }} />
                      <span>Free Block</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-swatch" style={{ background: 'var(--block-file-a-bg)', borderColor: 'var(--block-file-a-border)' }} />
                      <span>kernel.sys (File A)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-swatch" style={{ background: 'var(--block-file-b-bg)', borderColor: 'var(--block-file-b-border)' }} />
                      <span>db_records (File B)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-swatch" style={{ background: 'var(--block-file-c-bg)', borderColor: 'var(--block-file-c-border)' }} />
                      <span>web_log (File C)</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-swatch" style={{ background: 'var(--block-meta-bg)', borderColor: 'var(--block-meta-border)' }} />
                      <span>Metadata</span>
                    </div>
                  </div>
                </div>

                {/* 2D Block Matrix */}
                <div className="disk-grid" role="grid" aria-label="Secondary Storage Disk Blocks">
                  {blocks.map((b) => {
                    let typeClass = 'block-free';
                    if (b.type === 'file-a') typeClass = 'block-file-a';
                    if (b.type === 'file-b') typeClass = 'block-file-b';
                    if (b.type === 'file-c') typeClass = 'block-file-c';
                    if (b.type === 'meta') typeClass = 'block-meta';

                    const isSelected = selectedBlockId === b.id;
                    const hasHead = activeHeadBlockId === b.id;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        className={`disk-block ${typeClass} ${isSelected ? 'selected' : ''} ${hasHead ? 'has-head' : ''}`}
                        onClick={() => {
                          setSelectedBlockId(b.id);
                          setActiveHeadBlockId(b.id);
                        }}
                        title={`Block #${b.id}: ${b.type === 'free' ? 'Free' : b.fileName}`}
                        aria-label={`Block ${b.id}, ${b.type}`}
                      >
                        {b.id.toString().padStart(2, '0')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Block Inspector */}
              <div className="inspector-panel">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <HardDrive size={16} color="var(--color-primary)" />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                      Block Inspector &bull; Sector #{selectedBlock.id.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <span className={`badge ${
                    selectedBlock.type === 'free' ? 'badge-neutral' :
                    selectedBlock.type === 'meta' ? 'badge-amber' :
                    selectedBlock.type === 'file-a' ? 'badge-blue' :
                    selectedBlock.type === 'file-b' ? 'badge-green' : 'badge-violet'
                  }`}>
                    {selectedBlock.type.toUpperCase()}
                  </span>
                </div>

                <div className="inspector-grid">
                  <div className="inspector-item">
                    <span className="inspector-key">Owning File</span>
                    <span className="inspector-val">{selectedBlock.fileName || 'None (Unallocated)'}</span>
                  </div>
                  <div className="inspector-item">
                    <span className="inspector-key">Logical Offset</span>
                    <span className="inspector-val">
                      {selectedBlock.fileOffset !== undefined ? `${selectedBlock.fileOffset} B` : '—'}
                    </span>
                  </div>
                  <div className="inspector-item">
                    <span className="inspector-key">Payload Used</span>
                    <span className="inspector-val">
                      {selectedBlock.usedBytes !== undefined ? `${selectedBlock.usedBytes} / ${BLOCK_SIZE} B` : '0 B'}
                    </span>
                  </div>
                  <div className="inspector-item">
                    <span className="inspector-key">Internal Slack</span>
                    <span className="inspector-val" style={{ color: selectedBlock.usedBytes && selectedBlock.usedBytes < BLOCK_SIZE ? 'var(--color-warning)' : 'inherit' }}>
                      {selectedBlock.usedBytes !== undefined ? `${BLOCK_SIZE - selectedBlock.usedBytes} B` : '0 B'}
                    </span>
                  </div>
                  <div className="inspector-item">
                    <span className="inspector-key">Next Block Pointer</span>
                    <span className="inspector-val">
                      {selectedBlock.nextBlock !== undefined && selectedBlock.nextBlock !== null
                        ? `#${selectedBlock.nextBlock.toString().padStart(2, '0')}`
                        : selectedBlock.type === 'free' ? '—' : 'EOF (0xFF)'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Comparative Benchmarks */}
        {activeTab === 'comparison' && (
          <div className="content-panel">
            <div className="disk-container">
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                  Secondary Storage Allocation Benchmark
                </h3>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Evaluated with identical trace: 50 File Creates, 20 Random Deletions, 15 Dynamic Appends.
                </p>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Allocation Scheme</th>
                      <th>Direct Access Cost</th>
                      <th>Internal Frag.</th>
                      <th>External Frag.</th>
                      <th>Metadata Overhead</th>
                      <th>File Resizing</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Contiguous (Best-Fit)</td>
                      <td><code>O(1)</code> (Direct Math)</td>
                      <td>4.2%</td>
                      <td style={{ color: 'var(--color-error)', fontWeight: 600 }}>24.6%</td>
                      <td>0.4%</td>
                      <td>Difficult (Relocation)</td>
                      <td><span className="badge badge-amber">External Frag Risk</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Linked Allocation</td>
                      <td style={{ color: 'var(--color-error)' }}><code>O(k)</code> (Chain hops)</td>
                      <td>4.2%</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>0.0%</td>
                      <td>1.2% (Pointers)</td>
                      <td>Trivial (Append block)</td>
                      <td><span className="badge badge-blue">Slow Random Read</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>File Allocation Table (FAT)</td>
                      <td><code>O(1)</code> in RAM</td>
                      <td>4.2%</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>0.0%</td>
                      <td>3.1% (Table in RAM)</td>
                      <td>Trivial (Table update)</td>
                      <td><span className="badge badge-green">Recommended (Simple)</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>Single-Level Indexed</td>
                      <td><code>O(1)</code> (Index read)</td>
                      <td>4.2% + index block</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>0.0%</td>
                      <td style={{ color: 'var(--color-warning)' }}>6.8% (Index blocks)</td>
                      <td>Bounded by index</td>
                      <td><span className="badge badge-violet">Index Waste</span></td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600 }}>UNIX Inode (Hierarchical)</td>
                      <td><code>O(1)</code>..<code>O(3)</code></td>
                      <td>4.2%</td>
                      <td style={{ color: 'var(--color-success)', fontWeight: 600 }}>0.0%</td>
                      <td>2.4%</td>
                      <td>Excellent (Multi-level)</td>
                      <td><span className="badge badge-green">Industry Standard</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: OS Terminal Emulator */}
        {activeTab === 'terminal' && (
          <div className="terminal-window">
            <div className="terminal-header">
              <div className="terminal-dots">
                <div className="terminal-dot red" />
                <div className="terminal-dot yellow" />
                <div className="terminal-dot green" />
              </div>
              <div className="terminal-title">fs-shell &bull; bash /dev/sda1</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TTY 1</div>
            </div>
            <div className="terminal-body">
              <div><span className="terminal-prompt">root@os-lab:~$</span> mkfs -t inode -s 256 -b 4096</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                [OK] Formatted secondary storage: 256 blocks (1,048,576 bytes)<br />
                [OK] Initialized Superblock at LBA 00, Inode bitmap at LBA 01<br />
                [OK] Root directory Inode #2 established.
              </div>
              <br />
              <div><span className="terminal-prompt">root@os-lab:~$</span> touch kernel.sys 22KB</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Allocated 6 blocks (24,576 bytes) &bull; Internal Slack: 2,576 bytes.
              </div>
              <br />
              <div><span className="terminal-prompt">root@os-lab:~$</span> df -h</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Filesystem&nbsp;&nbsp;&nbsp;&nbsp;Size&nbsp;&nbsp;&nbsp;&nbsp;Used&nbsp;&nbsp;&nbsp;&nbsp;Avail&nbsp;&nbsp;&nbsp;&nbsp;Use%&nbsp;&nbsp;&nbsp;&nbsp;Mounted on<br />
                /dev/sda1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1.0M&nbsp;&nbsp;&nbsp;&nbsp;176K&nbsp;&nbsp;&nbsp;&nbsp;848K&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;17%&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/
              </div>
              <br />
              <div><span className="terminal-prompt">root@os-lab:~$</span> stat kernel.sys</div>
              <div style={{ color: 'var(--text-secondary)' }}>
                File: kernel.sys &bull; Size: 22528 Bytes &bull; Blocks: 6 &bull; Inode: 14<br />
                Pointers: Direct [02, 03, 04, 05, 06, 07]
              </div>
              <br />
              <div><span className="terminal-prompt">root@os-lab:~$</span> <span style={{ animation: 'blink 1s step-end infinite' }}>_</span></div>
            </div>
          </div>
        )}

        {/* Tab 4: Design Tokens & Palette Guide */}
        {activeTab === 'tokens' && (
          <div className="content-panel">
            <div className="disk-container">
              <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                Design System Palette & Specifications
              </h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                Disciplined developer-tool visual tokens supporting both Midnight Navy and Refined Light themes.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <div style={{ width: '100%', height: '36px', background: 'var(--bg-app)', border: '1px solid var(--border-default)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Main Background</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#0B1120 (Dark) / #F8FAFC (Light)</div>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <div style={{ width: '100%', height: '36px', background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Card & Panel Surface</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#151F32 (Dark) / #FFFFFF (Light)</div>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <div style={{ width: '100%', height: '36px', background: 'var(--color-primary)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Primary Accent (Electric Blue)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#3B82F6 (Dark) / #2563EB (Light)</div>
                </div>

                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <div style={{ width: '100%', height: '36px', background: 'var(--color-secondary)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>Secondary Accent (Violet)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#A78BFA (Dark) / #7C3AED (Light)</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
};

export default App;
