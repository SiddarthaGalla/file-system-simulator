# File-System Simulator

An interactive web-based simulator designed to visualize and benchmark secondary storage allocation methods, disk fragmentation, I/O access times, and space utilization.

Built as an Operating Systems capstone project by [Siddartha Galla](https://github.com/SiddarthaGalla).

---

## Why I Built This

When studying operating systems from textbooks like Silberschatz (*Operating System Concepts*) or Remzi's *OSTEP*, concepts like contiguous vs. indexed allocation or internal vs. external fragmentation are explained with static 2D diagrams. In practice, the real trade-offs only become obvious when you actually run a dynamic workload:

- You allocate and delete 30 files, and suddenly Contiguous allocation fails with `ENOSPC` even though 40% of the disk is technically free (external fragmentation).
- You try to seek to byte offset 45,000 in a Linked allocation scheme and realize the simulated disk head has to make dozens of block hops just to reach the data.
- You look at Indexed or Inode allocation and notice how much storage is actually eaten up by index blocks and pointer tables for small files.

I built this simulator to make those trade-offs interactive, visual, and quantifiable. It lets you experiment with different allocation methods in real time, run automated stress workloads, and compare them side by side under the exact same sequence of file operations.

---

## Core Allocation Methods Simulated

| Strategy | Allocation Logic | Random Access Cost | External Fragmentation | Dynamic Resizing | Notes & Trade-offs |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Contiguous Allocation** | Finds a consecutive run of $N$ free blocks using **First-Fit**, **Best-Fit**, or **Worst-Fit**. | $O(1)$ — single direct offset calculation: $\text{Base} + k$. | **High** — Free blocks get stranded in gaps between files. | Difficult — requires contiguous free space at the tail or full file relocation. | Excellent sequential read performance, but suffers badly under file churn. |
| **Linked Allocation** | Each block stores data plus a trailing pointer to the next block address. | $O(k)$ — must sequentially traverse $k$ disk blocks. | **Zero** — any free block anywhere on disk can be used. | Very simple — grab any free block and append to pointer chain. | Eliminates external fragmentation, but random access is slow and reliable pointer integrity is critical. |
| **File Allocation Table (FAT)** | Centralizes block-to-block pointers into a single lookup table kept in memory. | $O(1)$ disk seek — table chain traversed in RAM, only 1 actual disk read. | **Zero** — any free block is utilized. | Easy — update FAT table entry in memory and disk cache. | Modeled after MS-DOS FAT12/16/32. High table memory overhead for large disks. |
| **Single-Level Indexed** | Each file has a dedicated index block containing an array of direct block pointers. | $O(1)$ — 1 read to the index block, 1 read to the data block. | **Zero** — blocks can be scattered across the disk. | Limited by index block capacity ($\text{BlockSize} / \text{PointerSize}$). | Great direct access, but wastes an entire block on metadata even for 1-byte files. |
| **UNIX Inode (Multi-Level)** | Hierarchical structure with direct pointers (0–9), a single indirect pointer, and a double indirect pointer. | $O(1)$ direct; $O(2)$ single indirect; $O(3)$ double indirect. | **Zero** — completely non-contiguous. | Flexible — handles small files without overhead and scales to large files. | Modeled after classic UNIX / ext file systems. |

---

## Key Features

### 1. Interactive 2D Disk Block Grid
- Visual grid representing physical disk blocks (configurable from 64 up to 2,048 blocks, with block sizes from 512 B to 8 KB).
- Color-coded by file identity and block type (user data, Inodes, index blocks, FAT table, superblock, free space).
- Hover inspection: Click or hover any block to inspect its physical sector address, owning file, logical block offset, next pointer, and internal slack bytes.
- Step-by-step playback: Slow down operations to watch First-Fit or Best-Fit scan the disk block-by-block.

### 2. Multi-Algorithm Arena (Side-by-Side Comparison)
- Run identical workloads across multiple allocation strategies simultaneously.
- Feeds the exact same sequence of file operations (creates, deletes, appends, random seeks) into Contiguous, Linked, FAT, Indexed, and Inode engines.
- Real-time comparison delta table highlighting winners and losers for fragmentation, metadata overhead, and seek counts.

### 3. Disk Defragmentation & Compaction Lab
- Visualizes online disk defragmentation for Contiguous allocation.
- Watch scattered files migrate toward block 0 in real time to coalesce fragmented free space into a single contiguous pool.
- Tracks metrics: total blocks moved, read/write cycles incurred, and simulated defrag time.

### 4. Real-Time Telemetry & Charts
- **Fragmentation Progression (Line Chart)**: Tracks external fragmentation percentage as churn increases.
- **I/O Access Latency (Bar Chart)**: Compares seek distance and simulated milliseconds for sequential reads vs. random offset reads.
- **Storage Composition (Donut Chart)**: Breaks down total disk usage into user payload vs. internal slack waste vs. allocation metadata.

### 5. OS Terminal / CLI Mode
An integrated monospace terminal supporting standard UNIX-style commands for users who prefer CLI workflows:
```bash
# Initialize a disk with 256 blocks of 4KB each using Inode allocation
mkfs -t inode -s 256 -b 4096

# Create files
touch report.pdf 14KB
touch database.db 64KB

# Read sequential or seek to an offset
read report.pdf
read database.db --offset 16384

# Inspect block layout and inode stats
stat database.db
df -h
ls -l

# Delete and trigger defragmentation
rm report.pdf
defrag
```

### 6. Workload Generators
Includes pre-configured real-world scenario presets:
- **High Churn (Stress Test)**: Rapidly allocates and removes variable-sized files to induce extreme external fragmentation.
- **Web Server Logs**: Append-heavy workload with continuous small writes.
- **OLTP Database**: Fixed-size files with frequent random offset reads and writes.
- **Multimedia Streaming**: Large sequential files to test uninterrupted block throughput.

---

## Metrics & Mathematical Models

### Internal Fragmentation ($IF$)
Slack bytes wasted in the final block of a file:
$$N = \lceil \frac{S}{B} \rceil, \quad IF = (N \times B) - S \quad (0 \le IF < B)$$
$$\% IF = \frac{\sum IF_i}{\sum (N_i \times B)} \times 100$$
*(Where $S$ is file size in bytes, and $B$ is block size).*

### External Fragmentation ($EF$)
Occurs in Contiguous allocation when total free space $F_{total} \ge S$, but no single contiguous chunk $C_{max} \ge S$:
$$EF\% = \left( 1 - \frac{C_{max}}{F_{total}} \right) \times 100$$

### Access Latency Simulation ($T_{access}$)
Simulates physical disk head movement across track/block numbers:
$$T_{seek} = \text{base\_seek} + (\Delta \text{tracks} \times \text{head\_travel\_rate})$$
- **Contiguous**: Direct address calculation ($1$ disk seek).
- **Linked**: Traversal requires $k$ disk reads to reach the $k$-th block.
- **FAT**: In-memory pointer traversal ($0$ disk seeks for table lookup, $1$ disk seek to fetch target block).
- **Indexed / Inode**: $1$ seek to fetch index/inode block $+ 1$ seek to read target block (or $2$ for indirect blocks).

---

## Tech Stack & Architecture

- **Frontend Framework**: React 19 + TypeScript (Vite)
- **Styling**: Vanilla CSS with custom properties (CSS design tokens, responsive grid, glassmorphic dark theme)
- **Visuals & Charts**: HTML5 Canvas for dense block grids + Chart.js for telemetry graphs
- **Icons**: Lucide Icons
- **Simulation Core**: Pure TypeScript engine, decoupled from React state for deterministic and benchmark-grade simulation runs

```text
file-system-simulator/
├── src/
│   ├── core/                  # Pure OS simulation engine (no UI dependencies)
│   │   ├── Disk.ts            # Simulated physical block array & R/W head
│   │   ├── types.ts           # Block, Inode, File, and Metric interfaces
│   │   ├── allocators/        # Contiguous, Linked, FAT, Indexed, Inode
│   │   ├── free-space/        # Bit Vector & Free List managers
│   │   └── metrics/           # Fragmentation & latency calculators
│   ├── components/            # UI Components
│   │   ├── disk/              # 2D Grid, block tooltip, head animator
│   │   ├── comparison/        # Multi-disk side-by-side view
│   │   ├── analytics/         # Charts (fragmentation, seeks, capacity)
│   │   ├── defrag/            # Visual defragmentation animator
│   │   └── terminal/          # OS CLI shell emulator
│   ├── presets/               # Benchmark workload definitions
│   ├── styles/                # Vanilla CSS tokens and component stylesheets
│   ├── App.tsx                # Main view coordinator
│   └── main.tsx               # Bootstrap
├── REQUIREMENTS.md            # Detailed Software Requirements Specification (SRS)
├── README.md                  # Project documentation
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SiddarthaGalla/file-system-simulator.git
   cd file-system-simulator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## Educational Use & Capstone Evaluation

This project was built to satisfy the requirements of an undergraduate Operating Systems capstone. Evaluators can:
1. Validate theoretical claims made in lecture notes against empirical simulation data.
2. Observe edge cases like file allocation failures under severe external fragmentation.
3. Compare space overhead ratios (metadata vs. payload) across different block sizes.
4. Export simulation benchmark runs as JSON reports for lab submissions.

---

## License

This project is licensed under the [MIT License](LICENSE).
