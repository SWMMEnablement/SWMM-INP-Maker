# SWMM5 INP MAKER

## Overview

A React/TypeScript single-page web application that generates realistic EPA SWMM5 `.inp` model files using physics-based force-directed network synthesis (Barnes-Hut quadtree). All SWMM5 model generation runs **client-side in-browser** with zero server dependencies for generation. The Express backend provides a REST API for programmatic access, serves the frontend, and runs a compiled SWMM5 v5.2.4 binary for server-side simulation.

**Scale**: ~14,600 lines of application code across 17 core files. The engine (`swmm-engine.ts`) alone is 2,579 lines and generates models with up to 10,000 junctions.

---

## Architecture

```
client/                          # React frontend (Vite + TypeScript)
  src/
    lib/
      swmm-engine.ts             # Core engine: network generation, INP writing (2,579 lines)
      generators.ts              # 4 alternative generation algorithms (1,378 lines)
      rain-canvas.ts             # 276+ rainfall patterns across 11 categories (1,053 lines)
      inp-parser.ts              # INP file reader: section detection, column mapping (233 lines)
      inp-validator.ts           # Static INP validator with auto-repair pipeline (522 lines)
      inp-transformer.ts         # INP anonymizer: rename + distort geometry (495 lines)
      queryClient.ts             # TanStack React Query config with default fetcher
      utils.ts                   # cn() utility for Tailwind class merging
    pages/
      home.tsx                   # Main page: 3-tab layout (Generator/Viewer/Docs) (3,341 lines)
      not-found.tsx              # 404 page
    components/
      inp-viewer.tsx             # INP file explorer: tables, stats, histograms, transform (1,601 lines)
      network-canvas.tsx         # Interactive HTML5 canvas: pan/zoom/tooltips for network map (299 lines)
      profile-canvas.tsx         # Longitudinal profile canvas: invert/crown elevations (331 lines)
      validation-panel.tsx       # Validation results display component (206 lines)
      onboarding.tsx             # 6-step animated walkthrough overlay (200 lines)
      theme-provider.tsx         # Theme context: 6 themes with localStorage persistence (74 lines)
      ui/                        # 30+ Shadcn/ui primitives (Button, Card, Select, Slider, etc.)
    hooks/
      use-toast.ts               # Toast notification hook
      use-mobile.tsx             # Mobile viewport detection hook
    index.css                    # Tailwind base + 6 theme CSS variable blocks (436 lines)
    main.tsx                     # React entry point
  index.html                     # HTML shell with theme-flicker-prevention script

server/
  index.ts                       # Express server entry, port 5000
  routes.ts                      # 12 REST API endpoints + SWMM5 simulation runner (657 lines)
  api-docs.html                  # Interactive Swagger-style API documentation (657 lines)
  vite.ts                        # Vite dev server middleware integration
  static.ts                      # Production static file serving
  storage.ts                     # Storage interface (no database used)

shared/
  schema.ts                      # Shared types (Drizzle schema placeholder)

swmm5                            # Compiled EPA SWMM5 v5.2.4 Linux binary (511 KB)
ReSWMM.md                        # ReSWMM discretization methodology documentation (547 lines)
```

### Data Flow

1. **Client-side generation**: User configures parameters in the UI -> `swmm-engine.ts` generates the full INP file in-browser (terrain DEM, node placement, pipe sizing, all 56 sections) -> results displayed with stats, network map, profile view
2. **Server-side simulation**: Generated INP is sent to `POST /api/simulate` -> server patches duration to 1 minute -> runs `swmm5` binary -> parses `.rpt` file -> returns continuity errors, warnings, and full report text
3. **REST API**: External clients can call any endpoint directly (no auth required) to generate, simulate, validate, or transform models programmatically

### Key Design Decisions

- **No database**: All computation is stateless and client-side. No user accounts, no persistent storage.
- **Client-heavy**: The engine, parser, validator, and transformer all run in the browser. The server is only needed for SWMM5 binary execution and API access.
- **Physics-based generation**: Models use fractional Brownian motion for terrain, Barnes-Hut quadtree for node placement, and dendritic graph construction for pipe networks -- producing realistic hydraulic networks, not random graphs.

---

## File-by-File Reference

### `client/src/lib/swmm-engine.ts` (2,579 lines)

The core engine. Everything needed to generate a complete SWMM5 model.

**Key exports:**
- `generateModel(config: SwmmConfig, onProgress?: (pct: number) => void): GeneratedModel` -- Main entry point. Returns `{ inpText, stats, coords, conduits, outfalls, storageNodes }`.
- `EXAMPLE_PRESETS` -- Array of 38 preset configurations (see Presets section below)
- `ALL_SECTIONS` -- Array of all 56 SWMM5 section names in write order
- `RATIOS` -- Model type ratios for element counts (conduit/subcatch/outfall/storage/pump/orifice/weir per junction)
- `GENERATION_METHOD_LABELS` -- Display names for 16 generation methods
- `L_SYSTEM_VARIANT_LABELS` -- Display names for 3 L-System variants
- `INFILTRATION_LABELS` -- Display names for 3 infiltration methods
- `getSections(...)` -- Returns the ordered list of INP sections based on config flags
- `compute(...)` -- Calculates element counts from N and RATIOS

**Internal pipeline (in order):**
1. `TerrainDEM` class -- Generates 2D elevation grid using fBm (fractal Brownian motion) noise
2. `buildBarnesHutTree()` / `computeBarnesHutForce()` -- Spatial force computation with O(N log N) quadtree
3. `forceSim()` -- Iterative force-directed node placement (repulsion + spring + gravity + terrain alignment)
4. `buildDendriticGraph()` -- Constructs tree-structured pipe network from node positions
5. `assignPipes()` -- Selects pipe diameters based on upstream accumulation and random variation
6. Conduit creation with loss assignment (`entryLoss`, `exitLoss`, `avgLoss`)
7. `reswmmDiscretize()` -- Optional conduit splitting (fixed interval or Dx/D ratio)
8. `writeInp()` -- Writes all 56 sections in correct order to produce valid INP text
9. Stats computation (CFL time step, length ratio, shape distribution, etc.)

**Critical ordering rule**: `[ORIFICES]` and `[WEIRS]` must be written BEFORE `[XSECTIONS]` in the generated INP file. The `getSections()` function enforces this.

**SWMM5 field count requirements** (from debugging):
- `[SUBCATCHMENTS]`: needs 8+ fields per line
- `[BUILDUP]`: needs 7 fields per line
- `[TREATMENT]`: uses `R = fraction` syntax
- `[SNOWPACKS]` REMOVAL line: must NOT end with `*`
- `[TRANSECTS]` X1 line: needs 10 fields

**ConduitData interface:**
```typescript
interface ConduitData {
  name: string; from: string; to: string;
  len: number; rough: number;
  inOff: number; outOff: number;
  diam: number; shape: string;
  entryLoss: number; exitLoss: number; avgLoss: number;
}
```

**Pipe sizes:**
- US: `[6, 8, 10, 12, 15, 18, 21, 24, 30, 36, 42, 48, 54, 60, 72, 84, 96, 120, 144]` inches (stored as feet: divide by 12)
- SI: `[0.15, 0.20, 0.225, 0.25, 0.30, 0.375, 0.45, 0.525, 0.60, 0.75, 0.90, 1.05, 1.20, 1.35, 1.50, 1.80, 2.10, 2.40, 3.00, 3.60]` meters

**ReSWMM discretization (conduit splitting):**
- Fixed Interval: splits conduits into segments of `fixedMinLength` to `fixedMaxLength`
- Dx/D Ratio: splits conduits where length/diameter exceeds `dxDRatio`
- MNSA (Minimum Nodal Surface Area): stored as float (e.g., 12.566), applied as ponded area at new intermediate junctions
- Loss distribution: entry loss -> first segment only, exit loss -> last segment only, avg loss -> divided equally across all segments
- CFL time step: `standard = min(L / sqrt(g * D))` across all conduits; `conservative = standard * 0.10`; g = 32.174 ft/s^2 (US) or 9.81 m/s^2 (SI)
- Length ratio: `max(L) / min(L)` flagged when >4x

**Progress callback**: monotonically increasing: 5 -> 10 -> 30 -> 46 -> 52 -> 60 -> 68 -> 75 -> 82 -> 88 -> 95%

---

### `client/src/lib/generators.ts` (1,378 lines)

Four alternative network generation algorithms, each exporting a function matching the signature `(nodes, nConduits, config) => ConduitData[]`:

1. **Horton-Strahler Branching** -- Recursive stream ordering, realistic dendritic branching patterns
2. **L-System Grammar** -- 3 variants (Dendritic, Grid, Radial) using production rules for network topology
3. **Space Colonization** -- Attraction-point based growth algorithm
4. **Minimum Spanning Tree** -- Prim's algorithm on Euclidean distance graph

The remaining 12 generation methods (D8 Flow, Voronoi/Delaunay, Interceptor+Lateral, Perlin+D8, Genetic Algorithm, Grid/Manhattan, Steiner Tree, Loop-and-Branch, Zone-Based Hierarchical, DLA, Radial Spoke-and-Ring) are implemented inline in `swmm-engine.ts`.

---

### `client/src/lib/rain-canvas.ts` (1,053 lines)

276+ rainfall distribution patterns organized into 11 categories:

| Category | Count | Examples |
|----------|-------|---------|
| SCS / NRCS | 6 | Type I, IA, II, III, MSE3, MSE4 |
| Huff Quartiles | 12 | Q1-Q4 at 10%, 50%, 90% probability |
| Chicago | 18 | r = 0.1 to 0.9 (incl. 0.375) |
| Alternating Block | 11 | 5-min to 60-min intervals |
| Uniform / Triangular | 18 | Uniform, Front/Center/Rear-loaded, Bimodal, Exponential, Step |
| Regional US -- State DOT | 54 | All 50 states + DC + NYC + Charlotte + Puerto Rico |
| NOAA Atlas 14 Return Periods | 30 | 1-yr to 1000-yr for 1-hr, 6-hr, 24-hr durations |
| International | 69 | 67 countries/cities worldwide |
| Historical / Extreme | 32 | Named hurricanes, flash floods, cloudbursts |
| Synthetic IDF-Based | 18 | Various IDF curve configurations |
| Climate Change Scenarios | 10 | RCP 4.5/8.5, SSP 1-2.6 through SSP 5-8.5 |

Each pattern has: `{ id: string, name: string, region: string, peak: number }`. The `peak` value determines where in the hyetograph the peak intensity falls (0.0-1.0).

Local computation fallback generates the temporal distribution using the peak position, so no external API is needed.

---

### `client/src/lib/inp-parser.ts` (233 lines)

Reads raw `.inp` text and produces a structured `ParsedInpFile` object:

```typescript
interface ParsedInpFile {
  filename: string; sizeBytes: number; lineCount: number;
  sections: ParsedSection[];
}
interface ParsedSection {
  name: string; headers: string[]; rows: string[][]; comments: string[];
}
```

- `SECTION_COLUMNS` map defines expected column headers for all 56 SWMM5 sections
- Falls back to inferring columns from `;;` comment headers
- `computeSectionStats()` returns descriptive statistics (min, max, mean, median, std dev, count, zeros, unique) for all numeric columns
- `getNumericColumns()` identifies which columns contain numeric data
- `buildHistogram()` generates bin data for SVG histogram rendering

---

### `client/src/lib/inp-validator.ts` (522 lines)

Multi-stage static validation pipeline with auto-repair:

**Validation stages (in order):**
1. Structure -- Section headers, field counts, required sections
2. References -- Node/link references exist, no undefined targets
3. Geometry -- Adverse slopes, zero-length conduits, offset validation
4. Hydraulics -- Manning's n range, pipe diameter plausibility
5. Completeness -- Missing XSECTIONS for links, orphan nodes

**Auto-repair capabilities:**
- Removes orphan nodes (no connecting links)
- Fixes adverse slopes (swaps invert elevations)
- Adds missing XSECTIONS entries with default CIRCULAR 1.0
- Removes duplicate element IDs
- Fixes zero-length conduits (sets minimum 10 ft/3 m)

**Output:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[]; warnings: string[]; fixes: string[];
  stages: { name: string; passed: boolean; details: string[] }[];
  fixedInp: string | null;
  totalTime: number;
  nodeCount: number; linkCount: number; subcatchCount: number;
  engineNote: string;
}
```

---

### `client/src/lib/inp-transformer.ts` (495 lines)

Reads existing INP files and applies transforms for anonymization/distortion:

**Rename scope** -- All of these element types get new sequential IDs:
- Nodes: J1, J2, ... (junctions, outfalls, storage, dividers)
- Links: L1, L2, ... (conduits, pumps, orifices, weirs, outlets)
- Subcatchments: S1, S2, ...
- Rain gages: RG1, RG2, ...
- Curves: CRV1, CRV2, ...
- Patterns: PAT1, PAT2, ...
- Time series: TS1, TS2, ...
- Transects: TR1, TR2, ...
- Aquifers: AQ1, AQ2, ...
- LID controls: LID1, LID2, ...
- Pollutants: POL1, POL2, ...
- Land uses: LU1, LU2, ...
- Hydrograph units: UH1, UH2, ...
- Snowpacks: SP1, SP2, ...
- Streets: STR1, STR2, ...
- Inlets: INL1, INL2, ...

All names get a configurable prefix (e.g., prefix "X" -> XJ1, XL1, XS1, ...).

**Geometric transforms:**
- Rotation: 0-360 degrees
- Scale: 0.1x to 5.0x
- Translation: arbitrary X/Y offset
- Mirror: flip X, Y, or both axes
- Jitter: random noise on coordinates (seeded RNG for reproducibility)

**Elevation transforms:**
- Offset: +/- 500 ft/m
- Scale: 0.5x to 2.0x
- Jitter: random elevation noise

**Dimension transforms:**
- Scales XSECTIONS dimensions and conduit lengths by `dimensionScale`

**Output:**
```typescript
interface TransformResult {
  inp: string;                    // Transformed INP text
  nameMap: Record<string, string>; // Original -> new name mapping
  stats: { nodesRenamed, linksRenamed, subcatchRenamed, coordsTransformed, elevationsTransformed };
}
```

---

### `client/src/pages/home.tsx` (3,341 lines)

The main (and only) page. Three tabs:

**Tab 1: Generator**
- Left panel: configuration controls (model size, type, units, terrain, detail, land use, generation method, hydrology params, toggles for LID/WQ/snowmelt/dividers/streets/curved links, ReSWMM discretization)
- "Generate INP" button with progress bar
- Right panel (after generation): stats cards, network map canvas, download buttons, validation badge, SWMM5 engine results
- "All Methods" comparison grid: generates all 18 method variants, displays side-by-side with network maps
- 38 example preset buttons organized by category

**Tab 2: INP Viewer**
- Drag-and-drop file upload or "View in INP Viewer" from generator
- Section sidebar grouped by category (Hydrology, Hydraulics, Quality, Loading, Geometry, Settings)
- Sortable/searchable data tables with pagination (50 rows/page)
- Descriptive statistics view per section
- SVG histogram charts for any numeric column
- Network map and longitudinal profile views
- Re-validate button for on-demand validation
- Transform panel (see inp-transformer.ts above)

**Tab 3: Docs**
- Model Types reference table
- "Which Settings Should I Use?" scenario guide (6 real-world scenarios)
- Offset Algorithm explanation
- SWMM5 Statistics from 1,729 real-world models (15.4M elements)
- ReSWMM discretization documentation
- FAQ section
- Glossary (15 technical terms including LID and WQ)

**Key state variables:**
- `result`: generated model result (inpText, stats, coords, etc.)
- `activeTab`: "generator" | "viewer" | "docs"
- `viewerInpText`: bridge between generator and viewer tabs
- `comparing`: boolean for "All Methods" comparison mode
- `comparisonResults`: array of all 18 method results for comparison grid

---

### `client/src/components/inp-viewer.tsx` (1,601 lines)

Self-contained INP file exploration component with:
- `ViewerNetworkCanvas` -- Renders node/link network from parsed coordinates
- `ViewerProfileCanvas` -- Renders longitudinal profile from parsed elevations
- `StatsTable` -- Descriptive statistics for all numeric columns
- `FullHistogram` -- SVG histogram with bins, axes, tooltips
- Transform panel integration (opens/closes via button, applies transforms, shows results)

---

### `server/routes.ts` (657 lines)

**Concurrency guard**: `activeGenerations` counter with `MAX_CONCURRENT_GENERATIONS = 5`. Returns HTTP 429 when exceeded.

**`buildConfig(body: any): SwmmConfig`** -- Validates and sanitizes all incoming config parameters with defaults, enum validation, and numeric clamping. All generation endpoints use this.

**12 REST API Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/generate` | Generate INP from config. Returns JSON `{inp, stats}` or raw `.inp` with `?format=inp` |
| `POST` | `/api/generate-and-simulate` | Generate + run SWMM5 simulation in one call |
| `POST` | `/api/simulate` | Run SWMM5 v5.2.4 on provided INP content |
| `POST` | `/api/validate` | Static analysis with auto-repair |
| `POST` | `/api/transform` | Transform/anonymize INP (rename elements, distort geometry). Returns JSON or raw `.inp` with `?format=inp` |
| `GET` | `/api/info` | API metadata (version, endpoints, capabilities) |
| `GET` | `/api/presets` | List all 38 example presets with configurations |
| `GET` | `/api/presets/:name` | Get/generate specific preset. `?generate=true` to generate, `&format=inp` for raw INP |
| `GET` | `/api/rainfall-patterns` | List all 276+ rainfall distributions by category |
| `GET` | `/api/sections` | List all 56 SWMM5 sections with grouping |
| `GET` | `/api/config-schema` | Full config schema with types, defaults, ranges, descriptions |
| `GET` | `/api/docs` | Interactive Swagger-style HTML documentation |

**Simulation flow** (`POST /api/simulate`):
1. Validate INP string (min 100 chars, max 10MB)
2. Create temp directory with `mkdtemp`
3. Patch `[OPTIONS]` to force 1-minute simulation (Jan 1, 2025)
4. Write patched INP to `model.inp`
5. Execute `swmm5` binary with 60-second timeout
6. Read `.rpt` file and parse for continuity errors, routing errors, warnings
7. Clean up temp files
8. Return results with full report text

---

## SwmmConfig Interface

```typescript
interface SwmmConfig {
  N: number;                    // Junctions (10-10,000)
  type: ModelType;              // 'sanitary' | 'stormwater' | 'combined' | 'transport_only' | 'rdii_calibration' | 'pump_intensive' | 'wos_intensive'
  units: 'US' | 'SI';
  terrain: TerrainType;         // 'flat' | 'moderate' | 'hilly' | 'mountainous'
  detail: DetailLevel;          // 'basic' | 'moderate' | 'detailed'
  landUse: LandUseType;         // 'mixed' | 'residential' | 'commercial' | 'industrial'
  outfallElev: number;
  generationMethod: GenerationMethod; // 16 options (see below)
  lSystemVariant: LSystemVariant;     // 'dendritic' | 'grid' | 'radial'
  infiltrationMethod: InfiltrationMethod; // 'HORTON' | 'GREEN_AMPT' | 'CURVE_NUMBER'
  numOutfalls: number | null;   // null = auto from RATIOS
  numSubcatchments: number | null;
  dwfNodePct: number;           // 0-100
  dwfPatterns: string[];        // ['Diurnal','Monthly','Weekend','Seasonal']
  inflowTsPct: number;          // 0-100
  rainfallDepth: number;        // inches or mm
  rainfallDuration: number;     // hours (0.5-72)
  rainfallDist: string;         // pattern ID from rain-canvas catalog
  enableAquifers: boolean;
  enableGroundwater: boolean;
  enableLID: boolean;
  enableWQ: boolean;
  enableSnowmelt: boolean;
  enableDividers: boolean;
  enableStreetInlets: boolean;
  enableCurvedLinks: boolean;
  reswmm: ReswmmConfig;
}

interface ReswmmConfig {
  enabled: boolean;
  method: 'none' | 'fixed_interval' | 'dx_d_ratio';
  fixedMinLength: number;       // 10-500
  fixedMaxLength: number;       // 50-1000
  dxDRatio: number;             // 1-20
  mnsa: number;                 // 0.1-100 (stored as float, default 12.566)
}
```

---

## 16 Generation Methods

| Key | Label | Source |
|-----|-------|--------|
| `force_directed` | Force-Directed (Barnes-Hut) | swmm-engine.ts |
| `horton_strahler` | Horton-Strahler Branching | generators.ts |
| `l_system` | L-System Grammar (3 variants) | generators.ts |
| `space_colonization` | Space Colonization | generators.ts |
| `mst` | Minimum Spanning Tree | generators.ts |
| `d8_flow` | D8 Flow Accumulation | swmm-engine.ts |
| `voronoi_delaunay` | Voronoi / Delaunay | swmm-engine.ts |
| `interceptor_lateral` | Interceptor + Lateral | swmm-engine.ts |
| `perlin_d8` | Perlin Noise + D8 | swmm-engine.ts |
| `genetic_algorithm` | Genetic Algorithm | swmm-engine.ts |
| `grid_manhattan` | Grid / Manhattan | swmm-engine.ts |
| `steiner_tree` | Steiner Tree | swmm-engine.ts |
| `loop_and_branch` | Loop-and-Branch | swmm-engine.ts |
| `zone_hierarchical` | Zone-Based Hierarchical | swmm-engine.ts |
| `dla` | Diffusion-Limited Aggregation | swmm-engine.ts |
| `radial_spoke_ring` | Radial Spoke-and-Ring | swmm-engine.ts |

"All Methods" comparison generates all 16 + 3 L-System variants = 18 total results.

---

## 38 Example Presets

1. Small Residential Sanitary
2. Medium Stormwater Network
3. Large Combined Sewer (SI)
4. Pump Station Intensive
5. Mountain Stormwater (SI)
6. RDII Calibration Model
7. Commercial Combined (Detailed)
8. Weir/Orifice/Storage Intensive
9. Transport Only (Large)
10. Mega Stormwater (5,000 Junctions)
11. Small SI Sanitary (Metric)
12. Industrial Pump Network
13. ReSWMM Fixed Interval (Sanitary)
14. ReSWMM Dx/D Ratio (Stormwater)
15. Tiny Test Model
16. Flat Commercial Stormwater
17. Dense Urban Combined (SI)
18. Suburban Residential (Large)
19. Hilly Industrial Combined
20. CSO Control with ReSWMM
21. Mountain Village (SI, Small)
22. Transport + ReSWMM (SI, Large)
23. RDII Hilly Residential
24. Ultra-Large Stormwater (10K)
25. Flat Pump Station Chain
26. Horton-Strahler Branching (Medium)
27. L-System Dendritic (Small)
28. L-System Grid Pattern
29. Space Colonization (Large)
30. Minimum Spanning Tree (MST)
31. Mixed Use Moderate (Template)
32. ReSWMM Fine Mesh (Combined)
33. Mountainous Combined (Large)
34. Green Infrastructure (LID)
35. Water Quality Modeling
36. Complete Model (LID + WQ)
37. Cold Climate Snowmelt (SI)
38. Full Coverage (All Sections)

---

## 56 SWMM5 Sections (in write order)

**Settings**: [TITLE], [OPTIONS], [FILES], [EVAPORATION], [TEMPERATURE], [ADJUSTMENTS], [REPORT]
**Hydrology**: [RAINGAGES], [SUBCATCHMENTS], [SUBAREAS], [INFILTRATION], [AQUIFERS], [GROUNDWATER], [GWF], [SNOWPACKS]
**Nodes**: [JUNCTIONS], [OUTFALLS], [DIVIDERS], [STORAGE]
**Links**: [CONDUITS], [PUMPS], [ORIFICES], [WEIRS], [OUTLETS], [XSECTIONS], [TRANSECTS], [STREETS], [INLETS], [INLET_USAGE], [LOSSES]
**Controls/Loading**: [CONTROLS], [INFLOWS], [DWF], [PATTERNS], [RDII], [HYDROGRAPHS], [LOADINGS]
**Water Quality**: [POLLUTANTS], [LANDUSES], [COVERAGES], [BUILDUP], [WASHOFF], [TREATMENT]
**Curves/Time**: [CURVES], [TIMESERIES]
**LID**: [LID_CONTROLS], [LID_USAGE]
**Geometry**: [COORDINATES], [VERTICES], [Polygons], [SYMBOLS], [LABELS], [BACKDROP], [MAP]
**Metadata**: [TAGS], [PROFILES]

---

## Model Type Ratios (RATIOS)

Defines element counts as multipliers of N (junction count):

| Type | Conduit | Subcatch | Outfall | Storage | Pump | Orifice | Weir |
|------|---------|----------|---------|---------|------|---------|------|
| stormwater | 1.05x | 0.8x | 0.003x | 0.01x | 0.005x | 0.01x | 0.002x |
| sanitary | 1.03x | 0x | 0.002x | 0.02x | 0.01x | 0.005x | 0.001x |
| combined | 1.08x | 1.0x | 0.005x | 0.03x | 0.01x | 0.02x | 0.005x |
| transport_only | 1.02x | 0x | 0.002x | 0.005x | 0.003x | 0.002x | 0x |
| rdii_calibration | 1.0x | 0.7x | 0.05x | 0.01x | 0.005x | 0.005x | 0.001x |
| pump_intensive | 1.15x | 0.3x | 0.005x | 0.08x | 0.04x | 0.03x | 0.005x |
| wos_intensive | 1.10x | 0.5x | 0.008x | 0.12x | 0.01x | 0.08x | 0.06x |

---

## Theme System

6 themes selectable via dropdown in the header:

| ID | Name | Primary Color | Base |
|----|------|---------------|------|
| `light` | Light | Sky Blue #38bdf8 | Light mode |
| `dark` | Dark | Sky Blue #38bdf8 | Dark mode |
| `uf` | UF Gators | Orange #FA4616 | Dark + `.theme-uf` |
| `epa` | EPA | Green #2E8540 | Dark + `.theme-epa` |
| `osu` | Oregon State Beavers | Scarlet #BB0000 | Dark + `.theme-osu` |
| `auburn` | Auburn Tigers | Burnt Orange #DD550C | Dark + `.theme-auburn` |

- localStorage key: `swmm-theme`
- `ThemeProvider` in `theme-provider.tsx` manages `.dark` and `.theme-{id}` classes on `<html>`
- Inline `<script>` in `index.html` applies stored theme before React mounts (prevents flash)
- Canvas components (network, profile) are theme-aware and redraw on theme change
- CSS variables defined in `index.css` under `:root`, `.dark`, `.theme-uf`, `.theme-epa`, `.theme-osu`, `.theme-auburn`
- Fonts: DM Sans (sans), Playfair Display (serif for titles), JetBrains Mono (mono)

---

## Onboarding

- 6-step animated walkthrough overlay for first-time visitors
- Component: `client/src/components/onboarding.tsx`
- State stored in localStorage key `swmm-onboarding-complete`
- Can be re-triggered via the help (?) button in the header
- Steps cover: model size, model type, generation method, hydrology settings, generation, results

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 18.3.1 |
| Language | TypeScript | 5.6.3 |
| Build Tool | Vite | 7.3.0 |
| CSS | Tailwind CSS | 3.4.17 |
| UI Components | Shadcn/ui (Radix primitives) | Various |
| Data Fetching | TanStack React Query | 5.60.5 |
| Routing | wouter | 3.3.5 |
| Forms | react-hook-form + @hookform/resolvers | 7.55.0 |
| Icons | lucide-react + react-icons | 0.453.0 / 5.4.0 |
| Animation | framer-motion | 11.13.1 |
| Server | Express | 5.0.1 |
| Runtime | tsx (TypeScript executor) | 4.20.5 |
| Schema Validation | Zod + drizzle-zod | 3.24.2 / 0.7.0 |
| SWMM5 Engine | EPA SWMM5 v5.2.4 | Compiled Linux binary |

---

## Running the Project

- **Development**: `npm run dev` (runs Express + Vite dev server on port 5000)
- **Production build**: `npm run build` (compiles to `dist/`)
- **Production start**: `npm start` (serves from `dist/`)
- **Type check**: `npm run check` (`tsc`)
- The workflow named "Start application" runs `npm run dev`

---

## No Database

This project intentionally has no database. All computation is stateless and client-side. The server is only used for:
1. Serving the frontend
2. Running the SWMM5 binary for simulation
3. Providing the REST API

No user accounts, sessions, or persistent data storage.

---

## Known Constraints and Gotchas

- **Max model size**: 10,000 junctions (UI slider limit). Larger models may take several seconds to generate.
- **SWMM5 binary**: Linux x86_64 only. The `swmm5` binary at project root must be executable (`chmod +x`).
- **Simulation timeout**: 60 seconds max per simulation run.
- **API concurrency**: Max 5 concurrent generation requests (429 returned when exceeded).
- **INP file size limit**: 10MB for API upload (validate/simulate/transform endpoints).
- **Section name casing**: Most sections use UPPERCASE but `[Polygons]` uses mixed case (matches SWMM5 convention).
- **No emoji in UI**: Use text-based indicators/warnings, not emoji (except section icons in the viewer sidebar).
- **Progress callback**: The `onProgress` percentages are hardcoded milestones, not true completion percentages.
