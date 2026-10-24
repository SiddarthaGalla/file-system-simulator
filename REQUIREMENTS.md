# 📋 Software Requirements Specification (SRS)
## File-System Simulator: Storage Allocation, Fragmentation & Performance Analyzer
**Course / Subject**: Operating Systems (CS Capstone)  
**Document Version**: 1.0.0  
**Target Platform**: Modern Web Browsers (Chrome, Firefox, Edge, Safari)

---

## 1. Executive Summary & Purpose

The purpose of this software is to provide an interactive, visual, and mathematically sound simulation environment to study how Operating System file systems manage secondary storage blocks. 

The software directly contrasts the five classic storage allocation mechanisms:
1. **Contiguous Allocation** (with First-Fit, Best-Fit, and Worst-Fit placement policies)
2. **Linked Allocation** (Chained block pointers)
3. **File Allocation Table (FAT)** (Centralized pointer table)
4. **Single-Level Indexed Allocation** (Dedicated index blocks)
5. **Multi-Level / Inode-Based Hierarchical Allocation** (UNIX / ext style with direct, single-indirect, and double-indirect blocks)

It exposes the fundamental trade-offs in:
- **Fragmentation**: Internal slack vs. External unusable block holes.
- **Access Latency**: Sequential scans vs. direct random access head seeks.
- **Storage Efficiency**: Usable user data vs. metadata structures (pointers, FAT, Inodes, Bitmaps).
- **File Growth Dynamics**: Dynamic block extension vs. file relocation vs. compaction.

---

## 2. Functional Requirements (FR)

### FR-1: Disk & File System Initialization
- **FR-1.1**: User can configure physical disk parameters:
  - Total Disk Blocks: `64`, `128`, `256`, `512`, `1024`, `2048`, `4096`.
  - Block Size: `512 B`, `1 KB`, `2 KB`, `4 KB`, `8 KB`.
  - Simulated Disk Head Seek Time ($T_{seek}$): configurable (default `5 ms`).
  - Simulated Block Transfer Time ($T_{transfer}$): configurable (default `0.1 ms`).
- **FR-1.2**: User can select the active allocation scheme (Contiguous, Linked, FAT, Indexed, Inode).
- **FR-1.3**: For Contiguous allocation, user can choose the fit strategy: **First-Fit**, **Best-Fit**, or **Worst-Fit**.
- **FR-1.4**: Support disk format (`format` / `mkfs`) to clear all allocations and rebuild the free space structure.

### FR-2: File & Directory Management Operations
- **FR-2.1 Create File**:
  - Input: File Name, Size (in KB or Bytes), initial content or synthetic random bytes.
  - Allocator allocates blocks according to the active strategy.
  - If insufficient contiguous space exists (in Contiguous) or insufficient total space exists (in any strategy), an explicit OS error message is shown (e.g. `ENOSPC: No space left on device` or `EFBIG: Cannot find contiguous chunk`).
- **FR-2.2 Read File**:
  - Support **Sequential Read**: Reads all blocks from start to finish; calculates total seeks, hops, and simulated elapsed time.
  - Support **Random Access Read**: User specifies target byte offset or block index $k$; simulator computes the exact pointer traversal/seek path and logs the number of block reads required.
- **FR-2.3 Dynamic Append / Resize File**:
  - User can extend file size.
  - Tests whether the allocator can expand in-place or must fail / chain / allocate new indirect pointers.
- **FR-2.4 Delete File**:
  - Frees all allocated blocks and returns them to the free space manager (Bit Vector or Free List).
  - Demonstrates how deletions create holes/fragmentation on disk.

### FR-3: Multi-Algorithm Head-to-Head Comparison Arena
- **FR-3.1 Synchronized Workload Execution**:
  - User can define or select a batch workload (e.g., "Create 15 files -> Delete 5 files -> Append 3 files -> Random read 10 blocks").
  - The simulator executes the identical workload simultaneously across all chosen allocation methods.
- **FR-3.2 Real-time Delta Matrix**:
  - A comparison table updating dynamically with:
    - Usable Data Blocks vs. Metadata Blocks.
    - Internal Fragmentation (Bytes and %).
    - External Fragmentation (Score and largest free run).
    - Total Simulated Head Travel / Seek distance.
    - Worst-case Random Access Time for block $k$.

### FR-4: Disk Defragmentation & Compaction Simulator
- **FR-4.1 Visual Compaction**:
  - Specifically available for Contiguous and Linked allocations.
  - Step-by-step or animated compaction where fragmented blocks are migrated toward block 0 to coalesce all free space into one contiguous chunk.
- **FR-4.2 Defrag Cost Metrics**:
  - Measures total blocks read and rewritten, head traversal units, and temporary memory overhead during compaction.

### FR-5: Inode & Pointer Hierarchy Inspector
- **FR-5.1 Block-Level Inspection**:
  - Clicking any block on the disk visualizer reveals:
    - Block Index & Physical Sector.
    - Owning File ID & Name.
    - Relative Block Offset within file.
    - Next Block Pointer (for Linked / FAT).
    - Slack Bytes (unused bytes causing internal fragmentation).
- **FR-5.2 Inode Tree View**:
  - Visual hierarchy showing Inode fields: File permissions, Owner, Size, Direct Pointers [0..11], Single Indirect Pointer, Double Indirect Pointer.

### FR-6: Interactive OS Terminal / Shell
- **FR-6.1 Monospace CLI Support**:
  - Accepts standard UNIX-like disk commands:
    - `mkfs -t <type> [-b <blockSize>] [-s <diskBlocks>]`
    - `touch <name> <size>`
    - `read <name> [--offset <bytes>]`
    - `rm <name>`
    - `ls -l`
    - `df -h`
    - `stat <name>`
    - `defrag`
    - `benchmark <preset>`
    - `help` / `clear`

### FR-7: Workload Presets & Generators
- **FR-7.1 Built-in Scenarios**:
  - **High Churn (Stress Test)**: Rapidly creates and deletes files of random sizes to produce Swiss-cheese fragmentation.
  - **Web Server Logs**: Append-heavy workload with small, frequent extensions.
  - **Database Index & Records**: Large primary file with frequent random access seeks.
  - **Multimedia Streamer**: Large sequential files testing sequential throughput.
- **FR-7.2 Custom Scripting / JSON Workload Import & Export**:
  - User can save custom traces and load them for lab assignments.

---

## 3. Non-Functional Requirements (NFR)

### NFR-1: Visual Aesthetics & UX
- Modern, clean, dark-mode-first aesthetic inspired by professional developer and OS diagnostics tools.
- Vibrant, accessible color palette to differentiate files and block types.
- Micro-interactions: Smooth hover states, glowing indicators for active read/write head, tooltip callouts.
- Responsive layout adapting from laptop screens to large lab monitors.

### NFR-2: Performance & Rendering Speed
- 60 FPS performance when visualizing disk arrays of up to 4,096 blocks.
- Optimized CSS Grid or HTML5 Canvas rendering without DOM thrashing during high-speed batch benchmark runs.

### NFR-3: Deterministic & Educational Accuracy
- Exact implementation of textbook OS algorithms (Silberschatz, Galvin, Gagne - *Operating System Concepts* and Tanenbaum - *Modern Operating Systems*).
- Deterministic random seeds so benchmarks yield identical, reproducible results across runs.

---

## 4. Detailed Data Models & Specifications

### 4.1 Disk Block Model
```typescript
export interface DiskBlock {
  id: number;                     // 0 to TotalBlocks - 1
  status: 'free' | 'data' | 'index' | 'inode' | 'fat' | 'superblock';
  fileId: string | null;          // ID of file occupying this block
  fileName: string | null;        // Human-readable file name
  fileBlockIndex: number;         // 0th block of file, 1st, etc.
  usedBytes: number;              // Actual payload bytes in this block
  nextBlockId: number | null;     // Linked list pointer / FAT pointer
  color: string;                  // Distinct hex color per file
}
```

### 4.2 Inode Data Structure
```typescript
export interface Inode {
  inodeNumber: number;
  fileName: string;
  fileSizeBytes: number;
  blockCount: number;
  createdAt: number;
  modifiedAt: number;
  directPointers: number[];       // e.g., 10 direct block addresses
  singleIndirectPointer: number | null; // Points to an index block
  doubleIndirectPointer: number | null; // Points to a block of index blocks
}
```

### 4.3 Allocation Strategies Matrix

| Strategy | Allocation Logic | Random Access Cost | External Fragmentation | Dynamic File Growth |
| :--- | :--- | :--- | :--- | :--- |
| **Contiguous** | Finds consecutive run of $N$ free blocks (First/Best/Worst Fit). | $O(1)$ — Direct address calculation: $\text{Base} + k$. | **High** — Free holes between files cannot fit larger files. | **Difficult** — Requires contiguous free trailing blocks or entire file relocation. |
| **Linked** | Links arbitrary free blocks using trailing pointer in each block. | $O(k)$ — Must traverse through $k$ disk blocks sequentially. | **Zero** — Any free block anywhere on disk can be used. | **Easy** — Grab any free block and attach to chain. |
| **FAT** | Traversal pointers stored in a single centralized table in RAM. | $O(1)$ disk seek after in-RAM pointer traversal. | **Zero** — Any free block is utilized. | **Easy** — Update FAT table entry. |
| **Indexed** | Single dedicated index block holds an array of direct pointers. | $O(1)$ — 1 read to index block + 1 read to data block. | **Zero** — Dispersed blocks permitted. | **Limited** by capacity of single index block ($BlockSize / PointerSize$). |
| **UNIX Inode** | Multi-level hierarchy (Direct, Single Indirect, Double Indirect). | $O(1)$ for direct; $O(2)$ or $O(3)$ for indirect blocks. | **Zero** — Dispersed blocks permitted. | **Excellent** — Supports small files efficiently and scales to huge files. |

---

## 5. UI Layout & View Specifications

```text
+-----------------------------------------------------------------------------------------+
| [Header] 🗄️ OS File-System Simulator  | [Tabs: Playground | Comparison | Defrag | Terminal] |
+-----------------------------------------------------------------------------------------+
| [Left Control Sidebar]            | [Center: Interactive Disk Visualization]            |
| - Scheme: Contiguous (Best-Fit)   | +-------------------------------------------------+ |
| - Capacity: 256 Blocks (4KB each) | | [0][1][2][3][4][5][6][7][8][9][10]...          | |
| - Controls:                       | | [Color-coded Blocks: Free, File A, File B, Inode]| |
|   * Create File (Name, Size)      | +-------------------------------------------------+ |
|   * Read File (Seq / Random)      | [Selected Block Inspector]                          |
|   * Delete / Append File          | Block #42 | File: "kernel.log" | Slack: 1,240 Bytes |
|   * Load Workload Preset          | +-------------------------------------------------+ |
|                                   | [Real-time KPI Bar]                                 |
|                                   | Usable: 68% | Int Frag: 4.2% | Ext Frag: 18.5%    |
+-----------------------------------------------------------------------------------------+
| [Bottom Analytics Panel]                                                                |
| [Line Chart: Fragmentation Trend] | [Bar Chart: Access Seek Cost] | [Log/Event Console] |
+-----------------------------------------------------------------------------------------+
```

---

## 6. Implementation Milestones

- **Phase 1: Specifications & Architecture (Current)**
  - Requirements Specification (`REQUIREMENTS.md`) and Project Overview (`README.md`).
- **Phase 2: Core Simulation Engine**
  - Implement `Disk`, `Block`, `BaseAllocator`, `ContiguousAllocator`, `LinkedAllocator`, `FatAllocator`, `IndexedAllocator`, `InodeAllocator`, and metrics calculations with unit tests.
- **Phase 3: Visual Presentation & UI Foundations**
  - Design system with CSS variables, Disk Block Grid/Canvas, hover inspector, and file operation controls.
- **Phase 4: Multi-Algorithm Arena & Analytics**
  - Side-by-side synchronized comparison runner, real-time Chart.js telemetry graphs.
- **Phase 5: Defrag Lab, Interactive Shell & Workload Presets**
  - Visual defragmentation animation, terminal emulator, built-in OS workload presets.
- **Phase 6: Verification, Polish & Documentation**
  - Capstone report export feature, browser performance testing, and user guide.
