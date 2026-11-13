# Intelligent File Storage & Allocation Management System for Reducing Fragmentation in Cloud Storage Environments

[![Operating Systems Capstone](https://img.shields.io/badge/Project-Operating_Systems_Capstone-181818?style=flat-square)](#)
[![Python](https://img.shields.io/badge/Backend-Python_Flask_3-8FED0E?style=flat-square&logo=python&logoColor=181818)](#)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-181818?style=flat-square&logo=react)](#)
[![Tailwind CSS](https://img.shields.io/badge/Theme-Ronas_IT_Minimalist_SaaS-8FED0E?style=flat-square&logo=tailwindcss&logoColor=181818)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-181818?style=flat-square)](#)

---

## 1. Project Overview

A professional, full-stack, enterprise-grade cloud file system simulator built as an Operating Systems Capstone Project. It models virtual disk allocation, computes mathematical fragmentation metrics (file fragmentation and external free-space fragmentation), compares classical OS allocation schemes (**Contiguous**, **Linked**, and **Indexed** with **First Fit** and **Best Fit** placement strategies), and optimizes sector allocation using an evolutionary **Genetic Algorithm (GA)** engine.

### Visual Design Reference
Crafted following the minimalist SaaS design philosophy of the [Ronas IT Dribbble Design](https://dribbble.com/shots/25708347-Delivery-Web-App-Design):
- Off-white canvas (`#ECECEB`) with white secondary card surfaces (`#FFFFFF`).
- High-contrast charcoal text (`#181818`) with muted subtitle accents (`#5B5B59`).
- Energetic lime green (`#8FED0E`) used sparingly for primary actions, active indicators, and optimal status badges.
- Large rounded cards (`rounded-3xl`), subtle hairline borders (`#E1E1DE`), balanced whitespace, and clean Lucide iconography.

---

## 2. Core Modules & Technical Architecture

```
file-system-simulator/
├── backend/
│   ├── api/                     # REST Blueprints (auth, storage, files, allocation, GA, defrag, analytics, reports)
│   ├── engine/                  # Core Algorithmic Engines
│   │   ├── allocation_manager.py       # Contiguous, Linked, Indexed, First Fit, Best Fit
│   │   ├── fragmentation_analyzer.py   # Mathematical fragmentation & slack calculator
│   │   ├── genetic_algorithm.py        # Real working Genetic Algorithm with elitism & order crossover
│   │   ├── defragmenter.py             # Atomic transactional defragmentation engine
│   │   ├── virtual_disk.py             # Low-level virtual sector management
│   │   └── report_generator.py         # ReportLab PDF generator & CSV exports
│   ├── models/                  # SQLAlchemy ORM Models (User, StorageDevice, VirtualFile, StorageBlock, etc.)
│   ├── tests/                   # Automated unit & end-to-end integration test suite
│   ├── uploads/                 # Safe physical file storage sandbox
│   ├── app.py                   # Flask Application Factory & entrypoint
│   ├── config.py                # Environment configuration
│   └── requirements.txt         # Python dependencies
└── frontend/
    ├── src/
    │   ├── components/          # Reusable UI cards, modals, buttons, badges, storage block grid
    │   ├── context/             # AuthContext, StorageContext, ToastContext
    │   ├── pages/               # 12 complete full-featured views
    │   ├── services/            # Typed Fetch API client
    │   ├── types/               # TypeScript interfaces
    │   ├── App.tsx              # Router & Protected route configuration
    │   └── main.tsx
    ├── tailwind.config.js       # Tailored color palette & spacing
    └── package.json
```

---

## 3. Features Implemented

1. **Authentication Module**: Secure JWT token authentication, password hashing with Werkzeug, protected routing, and user profiles.
2. **Dashboard Module**: Dynamic storage statistics (total capacity, used, available, fragmentation %, wasted slack storage), donut capacity charts, and historical trend lines.
3. **File Management Module**: Single/multiple drag-and-drop file upload, file downloads, deletion with automatic block recycling, folder hierarchy, and search filtering.
4. **Virtual Storage Device Module**: Create virtual disks, configure capacity (MB) and block size (KB), calculate total sector count, switch active disks, and reset to clean state.
5. **Interactive Storage Map**: Live responsive 100-block sector grid color-coded by file, block inspector with logical block indexes and pointer chains, plus **Side-by-Side Current vs. GA-Optimized layout comparison**.
6. **Fragmentation Analysis Module**: Single-click storage scanner computing **File Fragmentation Ratio**, **External Fragmentation %**, **Internal Slack Fragmentation (KB)**, and extents per file.
7. **Allocation Algorithms Lab**: Interactive playground demonstrating **Contiguous Allocation** (First Fit / Best Fit), **Linked Allocation**, and **Indexed Allocation** (i-nodes) with real measured execution latency.
8. **Genetic Algorithm Optimizer**: Real working Python GA engine featuring multiset chromosome permutations, tournament selection, Order Crossover (OX), block coalescing mutations, elitism, and generation-wise convergence charts.
9. **Dynamic Defragmentation Engine**: Manual file-targeted and automatic threshold-based defragmentation with transactional database rollback safety.
10. **Performance Monitor**: Empirical benchmark charts measuring algorithm execution latency (ms) vs. simulated physical disk head read seek latency.
11. **Comparison Analytics**: Side-by-side comparative matrix of all 6 methods identifying explicit metric winners (Fastest Allocation, Lowest Read Seek, Highest Utilization, Best Overall Balance).
12. **Reports & Audit Trail**: Immutable ledger of all operations, plus 1-click **ReportLab PDF Report Export** and **CSV Data Dumps**.
13. **One-Click Demo Data Button**: Instantly seeds a realistic fragmented cloud storage scenario with preloaded files and non-contiguous free spaces for immediate demonstrations.

---

## 4. Getting Started (Windows Setup Guide)

### Prerequisites
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js v18+** (Tested on Node.js v24)
- **VS Code** or terminal of your choice

---

### Step 1: Install Dependencies

#### Backend Dependencies:
Open a PowerShell terminal in the project root:
```powershell
cd backend
pip install -r requirements.txt
```

#### Frontend Dependencies:
```powershell
cd ../frontend
npm install
```

---

### Step 2: Running the Application

To run the application, open **two separate terminal windows** in VS Code:

#### Terminal 1 — Start the Flask Backend (Port 5000):
```powershell
cd "s:\Personal\My Projects\file-system-simulator\backend"
python app.py
```
> The backend server will start at `http://127.0.0.1:5000` with the SQLite database initialized at `backend/storage_simulator.db`.

#### Terminal 2 — Start the React Frontend (Port 5173):
```powershell
cd "s:\Personal\My Projects\file-system-simulator\frontend"
npm run dev
```
> The frontend development server will launch at `http://localhost:5173`. Open this URL in your web browser.

---

## 5. Instant Project Demonstration

1. Navigate to `http://localhost:5173/login`.
2. Click **"Fill Demo Credentials"** (or use username: `demo_admin`, password: `password123`) and click **Sign In** (or register a new researcher account).
3. In the top navigation bar, click the **"DEMO DATA"** button with the lime badge.
4. This instantly populates:
   - A 100-block virtual disk (100 MB).
   - 8 realistic uploaded files across folders (`Documents`, `Source Code`, `Media`).
   - Strategic non-contiguous free spaces mimicking realistic cloud fragmentation.
5. Click **"Storage Map"** in the sidebar to inspect the color-coded sectors and fragmented files.
6. Click **"GA Optimization"**, select your desired population and generations, and click **"RUN OPTIMIZATION"**.
7. Watch the live generation-by-generation fitness convergence chart, inspect the extent reductions, and click **"APPLY OPTIMIZED ALLOCATION"** to update the virtual disk!
8. Click **"Reports & History"** and download the generated **PDF Report** or **CSV Export**.

---

## 6. Running Backend Unit & E2E Tests

The backend includes a comprehensive automated test suite covering algorithm allocations, fragmentation mathematics, genetic algorithm invariants, and complete REST API workflows:

```powershell
cd backend
python -m unittest discover -s tests
```

Expected output:
```
Ran 8 tests in ~8.8s
OK
```

---

## 7. Mathematical Formulations

- **File Fragmentation Ratio ($R_{frag}$)**:
  $$R_{frag} = \frac{\sum E_f - N_{files}}{\sum E_f} \times 100\%$$
  where $E_f$ is the number of extents for file $f$, and $N_{files}$ is the count of files with active block allocations.

- **External Fragmentation Percentage ($E_{ext}$)**:
  $$E_{ext} = \left(1 - \frac{L_{free}}{T_{free}}\right) \times 100\%$$
  where $L_{free}$ is the largest contiguous free extent and $T_{free}$ is the total number of free blocks on disk.

- **Genetic Algorithm Multi-Objective Fitness ($F$)**:
  $$F = w_1 \cdot (1 - \text{NormFrag}) + w_2 \cdot \left(\frac{L_{free}}{T_{free}}\right) - w_3 \cdot \left(\frac{B_{moved}}{B_{total}}\right)$$
  where $w_1 = 0.55$, $w_2 = 0.30$, and $w_3 = 0.15$ (fully configurable in the UI).

