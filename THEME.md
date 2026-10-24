# 🎨 Design System & UI Theme Specification

> **File-System Simulator — Developer-Tool Aesthetics & UI Architecture**  
> Visual design tokens, color palettes, typography hierarchy, surfaces, and signature disk block visualization standards.

---

## 1. Visual Direction & Design Philosophy

The File-System Simulator interface is inspired by high-end developer tools, modern IDEs (VS Code, JetBrains), and system diagnostic suites (Datadog, Linear, Raycast). It delivers a dense, disciplined, technical aesthetic with:

- **Restrained Elevation**: Thin `1px` borders, subtle box shadows, and controlled surface layering instead of heavy, distracting glassmorphism or generic glowing gradients.
- **Disciplined Geometry**: Non-pill buttons and inputs, using crisp `4px`, `6px`, and `8px` radii to preserve an authentic engineering tool appearance.
- **Strict Visual Hierarchy**: Purpose-driven color allocation—Blue is reserved for primary interactions and File A; Green, Amber, and Red are strictly preserved for status feedback and explicit file/metadata mappings.

---

## 2. Color Palette & Tokens

### 2.1 Primary Theme: Midnight Navy (Dark)
Default theme designed for long developer sessions in lab environments:

| Token | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--bg-app` | `#0B1120` | Root application background. |
| `--bg-card` | `#151F32` | Primary panel and container surface. |
| `--bg-surface` | `#1C2940` | Secondary surface, input backgrounds, active rows. |
| `--bg-surface-hover` | `#23334F` | Hover state for secondary surfaces. |
| `--border-default` | `#263449` | Subtle component dividers and card borders. |
| `--border-hover` | `#384A66` | Interactive border hover feedback. |
| `--color-primary` | `#3B82F6` | Electric Blue: primary actions, focused outlines. |
| `--color-secondary` | `#A78BFA` | Restrained Violet: secondary accents and badges. |
| `--color-success` | `#22C55E` | Green: success alerts, File B allocation. |
| `--color-warning` | `#F59E0B` | Amber: warnings, internal fragmentation slack, metadata blocks. |
| `--color-error` | `#EF4444` | Red: errors, destructive actions (`mkfs`). |
| `--text-primary` | `#F8FAFC` | High-contrast body and heading text. |
| `--text-secondary` | `#94A3B8` | Subtitles, labels, and table column headers. |
| `--text-muted` | `#64748B` | Disabled indicators, footnotes, LBA ranges. |

---

### 2.2 Refined Light Theme
A high-contrast light theme engineered for daytime readability without eye strain:

| Token | Hex Value | Role & Usage |
| :--- | :--- | :--- |
| `--bg-app` | `#F8FAFC` | Light slate app background. |
| `--bg-card` | `#FFFFFF` | Crisp pure white panel background. |
| `--bg-surface` | `#F1F5F9` | Muted cool-grey secondary surface. |
| `--bg-surface-hover` | `#E2E8F0` | Hover state for interactive controls. |
| `--border-default` | `#E2E8F0` | Clean dividers and borders. |
| `--color-primary` | `#2563EB` | Crisp Royal Blue: primary CTA and selections. |
| `--color-secondary` | `#7C3AED` | Refined Purple: secondary highlights. |
| `--color-success` | `#16A34A` | Green status and File B block fill. |
| `--color-warning` | `#D97706` | Deep amber metadata and warning state. |
| `--color-error` | `#DC2626` | Red error and destructive actions. |
| `--text-primary` | `#0F172A` | Deep slate text for maximum legibility. |
| `--text-secondary` | `#64748B` | Secondary descriptive labels. |
| `--text-muted` | `#94A3B8` | Subtle metadata and inactive markers. |

---

## 3. Signature Disk Block Visualization Style

The numbered 2D disk block visualizer is the visual anchor of the application. It maps logical block addresses (LBA) to physical sectors with consistent semantic colors:

```text
+----+  +----+  +----+  +----+  +----+  +----+  +----+  +----+
| 00 |  | 01 |  | 02 |  | 03 |  | 04 |  | 05 |  | 06 |  | 07 |
|Meta|  |Meta|  |File|  |File|  |File|  |File|  |File|  |Tail|  ...
+----+  +----+  +----+  +----+  +----+  +----+  +----+  +----+
 Super    FAT    <-------- File A: kernel.sys -------->  Slack
```

### Block Color Specifications

| Block Category | Dark Theme (Midnight Navy) | Light Theme (Refined Light) | Purpose / Meaning |
| :--- | :--- | :--- | :--- |
| **Free Block** | `#131B2A` bg / `#222E42` border | `#F8FAFC` bg / `#E2E8F0` border | Available storage block. |
| **File A (Blue)** | `#1E3A8A` bg / `#3B82F6` border | `#DBEAFE` bg / `#93C5FD` border | Allocated to `kernel.sys`. |
| **File B (Green)** | `#14532D` bg / `#22C55E` border | `#DCFCE7` bg / `#86EFAC` border | Allocated to `db_records.dat`. |
| **File C (Violet)**| `#4C1D95` bg / `#A78BFA` border | `#F3E8FF` bg / `#D8B4FE` border | Allocated to `web_access.log`. |
| **Metadata** | `#78350F` bg / `#F59E0B` border | `#FEF3C7` bg / `#FCD34D` border | Superblock, Inodes, FAT entries. |
| **Selected** | `2px solid #60A5FA` outline | `2px solid #2563EB` outline | Block currently in Inspector. |
| **R/W Head** | `#F43F5E` glowing dot | `#E11D48` dot | Active disk head position. |

---

## 4. Typography System

The application combines modern sans-serif for UI clarity with monospace for technical data:

- **Primary Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- **Monospace Font**: `JetBrains Mono`, `ui-monospace`, `Consolas`, `monospace`
- **Tabular Figures**: All numerical metrics utilize `font-variant-numeric: tabular-nums` to prevent horizontal jitter during rapid simulation updates.

### Typographic Hierarchy

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Heading 1 / Title** | `1.25rem (20px)` | 700 (Bold) | `1.2` | Top brand bar, modal headers. |
| **Heading 2 / Section**| `1.00rem (16px)` | 600 (Semibold) | `1.3` | Panel titles, table headers. |
| **Metric KPI Value** | `1.50rem (24px)` | 700 (Bold) | `1.1` | Space percentage, seek count. |
| **Body / Inputs** | `0.875rem (14px)`| 400 / 500 | `1.5` | Standard form controls, buttons. |
| **Labels / Badges** | `0.75rem (12px)` | 500 / 600 | `1.2` | Input labels, status chips. |
| **Monospace Identifiers**| `0.6875rem (11px)`| 500 | `1.0` | Block grid numbers, LBA offsets. |

---

## 5. Theme Switching & Persistence

Theme toggling is managed through `src/context/ThemeContext.tsx`:
1. **Three State Modes**: `dark`, `light`, or `system`.
2. **Dynamic HTML Attribute**: Sets `data-theme="dark"` or `data-theme="light"` on `<html>`.
3. **OS System Listener**: Detects changes in `window.matchMedia('(prefers-color-scheme: dark)')` when in `system` mode.
4. **Local Storage**: Persists user selection across browser sessions under key `fs-sim-theme`.
5. **Reduced Motion**: All animations and transitions respect `@media (prefers-reduced-motion: reduce)`.
