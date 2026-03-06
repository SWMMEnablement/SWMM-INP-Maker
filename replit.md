# SWMM5 INP MAKER

## Overview
A React/TypeScript web app that generates realistic EPA SWMM5 `.inp` files using physics-based force-directed network synthesis (Barnes-Hut quadtree). Model generation runs client-side in-browser, with a full REST API for programmatic access.

## Architecture
- **Frontend** built with React, TypeScript, Tailwind CSS, Shadcn/ui — all SWMM5 model generation in `swmm-engine.ts`
- **Backend** (Express) serves the frontend, provides REST API endpoints, and runs SWMM5 v5.2.4 engine simulations
- **REST API** at `/api/*` — 10 endpoints for generating, simulating, validating INP files, listing presets/patterns/sections
- **API Docs** at `/api/docs` — interactive Swagger-style documentation with "Try it" buttons and code examples

## Key Files
- `client/src/lib/swmm-engine.ts` — Complete physics engine: TerrainDEM (fBm noise), Barnes-Hut quadtree particle simulation, dendritic graph builder, INP file generator, ReSWMM discretization, profile path builder, rainfall profile generator, 5 generation methods, all constants from 1,729 real models. Full 56/56 SWMM5 section coverage.
- `client/src/lib/generators.ts` — 4 alternative network generation algorithms: Horton-Strahler recursive branching, L-System grammar (3 variants), Space Colonization, Minimum Spanning Tree (Prim's)
- `client/src/lib/rain-canvas.ts` — Rain Canvas Studio integration: 34 rainfall patterns across 8 categories (SCS/NRCS, Huff, Chicago, Alternating Block, Uniform/Triangular, Regional US, International, Historical), all with local computation fallback
- `client/src/lib/inp-parser.ts` — Client-side INP file parser: section detection, column mapping for 56 SWMM5 sections, descriptive statistics, histogram data
- `client/src/lib/inp-validator.ts` — Static INP validator with auto-repair: checks orphan nodes, adverse slopes, undefined references, zero-length conduits, missing sections, duplicate IDs, unusual values
- `client/src/pages/home.tsx` — Main page: tabbed layout (Generator + INP Viewer + Docs), config panel with hydrology controls, example presets, element cards, charts, stats, download, validation panel
- `client/src/components/validation-panel.tsx` — Validation results display: status, error/warning/fix counts, stage pipeline, collapsible details, download-fixed button
- `client/src/components/inp-viewer.tsx` — INP file viewer: drag-and-drop upload, categorized section sidebar, sortable/searchable data tables, statistics, SVG histograms, auto-validation on load
- `client/src/components/network-canvas.tsx` — Interactive HTML5 canvas with pan/zoom/tooltips for network preview
- `client/src/components/profile-canvas.tsx` — Longitudinal profile canvas showing invert/crown elevations from outfall to upstream
- `client/src/App.tsx` — Router setup (single page at `/`)

## Features
- 16 network generation methods: Force-Directed (Barnes-Hut), Horton-Strahler Branching, L-System Grammar (Dendritic/Grid/Radial variants), Space Colonization, Minimum Spanning Tree, D8 Flow Accumulation, Voronoi/Delaunay, Interceptor+Lateral, Perlin Noise+D8, Genetic Algorithm, Grid/Manhattan, Steiner Tree, Loop-and-Branch, Zone-Based Hierarchical, Diffusion-Limited Aggregation, Radial Spoke-and-Ring
- "All Methods" button generates all 18 method variants at once (16 methods + 3 L-System variants), displaying a comparison grid with network maps, stats, "Use This", and "Download" per method
- 38 example SWMM5 file presets (quick-load configurations, includes LID, WQ, Cold Climate Snowmelt, Full Coverage, and Complete model presets)
- US Customary / SI Metric unit toggle with sub-labels showing unit systems
- Configurable hydrology parameters:
  - Number of outfalls (manual or auto from model type ratio)
  - Number of subcatchments (manual or auto from model type ratio)
  - DWF node percentage (0-100%, controls how many junctions get dry weather flow)
  - DWF flow patterns (multi-select: Diurnal, Monthly, Weekend, Seasonal)
  - Inflow time series percentage (0-100%, external inflows on junctions)
  - Rainfall depth (configurable total depth in inches or mm)
  - Rainfall distribution (276 patterns via Rain Canvas Studio across 11 categories: SCS/NRCS, Huff Quartiles, Chicago, Alternating Block, Uniform/Triangular/Bimodal/Exponential/Step, Regional US — all 50 State DOTs + DC + PR, NOAA Atlas 14 Return Periods, International (67 countries/cities), Historical/Extreme (hurricanes, floods, cloudbursts), Synthetic IDF-Based, Climate Change Scenarios)
  - Infiltration method (Horton, Green-Ampt, Curve Number) — affects both [OPTIONS] and [INFILTRATION] section format
- Full 56/56 SWMM5 section coverage including:
  - Climate: [FILES], [EVAPORATION], [TEMPERATURE], [ADJUSTMENTS], [SNOWPACKS]
  - Hydraulic: [DIVIDERS], [OUTLETS], [GWF], [STREETS], [INLETS], [INLET_USAGE]
  - WQ/RDII: [LANDUSES], [COVERAGES], [LOADINGS], [RDII], [HYDROGRAPHS]
  - Map/Metadata: [SYMBOLS], [LABELS], [BACKDROP], [TAGS], [PROFILES], [VERTICES]
- Config flags: `enableSnowmelt`, `enableDividers`, `enableStreetInlets`, `enableCurvedLinks` (all default false)
- Transects and open channels: IRREGULAR cross-sections auto-generate [TRANSECTS] section with HEC-2 format station/elevation data (NC/X1/GR lines)
- Aquifers and Groundwater: toggleable [AQUIFERS] and [GROUNDWATER] sections with realistic soil properties and GW flow exchange per subcatchment
- LID Controls: toggleable [LID_CONTROLS] and [LID_USAGE] sections — 5 LID types (bio-retention, permeable pavement, rain garden, green roof, infiltration trench) assigned to ~30% of subcatchments
- Water Quality: toggleable [POLLUTANTS], [BUILDUP], [WASHOFF], [TREATMENT] sections — 5 pollutants (TSS, BOD, COD, TN, TP) with power-law buildup, EMC washoff, and treatment at storage nodes
- ReSWMM conduit discretization (Fixed Interval or Δx/D ratio methods, MNSA) with:
  - CFL time step recommendation (standard and conservative per Vasconcelos et al. 2018)
  - Loss distribution: entry/exit/average losses properly distributed across split segments
  - Length ratio analysis with discretization recommendation (>4× threshold)
  - MNSA stored as float (not rounded) for precision
- REST API (10 endpoints, open/no auth):
  - `POST /api/generate` — Generate INP from config (JSON or raw .inp via `?format=inp`)
  - `POST /api/generate-and-simulate` — Generate + run SWMM5 simulation in one call
  - `POST /api/simulate` — Run SWMM5 v5.2.4 on provided INP content
  - `POST /api/validate` — Static analysis with auto-repair
  - `GET /api/presets` — List all 38 example presets
  - `GET /api/presets/:name` — Get/generate specific preset (`?generate=true&format=inp`)
  - `GET /api/rainfall-patterns` — List all 276 rainfall distributions by category
  - `GET /api/sections` — List all 56 SWMM5 sections with grouping
  - `GET /api/config-schema` — Full config schema with types, defaults, ranges
  - `GET /api/info` — API metadata
  - `GET /api/docs` — Interactive API documentation page with "Try it" buttons
- Longitudinal profile view (outfall to upstream, invert + crown lines, tooltips)
- INP File Viewer: upload or pass generated .inp files, browse sections by category, sortable/searchable tables, descriptive statistics, histograms
- Static INP validation with auto-repair: runs automatically after generation and on file upload in viewer; prominent validation badge shows pass/fail status with fix count
- Server-side SWMM5 engine validation: after static validation, INP is sent to `POST /api/simulate` which patches duration to 1 minute, runs the compiled SWMM5 v5.2.4 binary, and returns continuity errors, routing errors, warnings, summary, and full RPT text
- "View SWMM5 Report (.rpt)" button: shows the engine's report file inline with download option — available on both successful and failed simulations for debugging
- "Open in SWMM5 Engine" button: downloads INP file and opens the companion SWMM5 Simulation Engine app for one-click simulation
- SWMM5 real-world statistics from 1,729 models (15.4M elements) in docs tab
- Comprehensive stats panel after generation with downloadable markdown report
- App Docs tab includes: Model Types, "Which Settings Should I Use?" scenario guide (6 scenarios), Offset Algorithm, SWMM5 Statistics, ReSWMM docs, FAQ, Glossary (15 technical terms incl. LID and WQ)

## Theme
- 6 themes: Light, Dark, UF Gators, EPA, Oregon State Beavers, Auburn Tigers — selectable via dropdown in header
- localStorage persistence (key: "swmm-theme"), values: "light" | "dark" | "uf" | "epa" | "osu" | "auburn"
- ThemeProvider in `client/src/components/theme-provider.tsx` manages theme classes on `<html>`
- Branded themes (uf/epa/osu/auburn) extend dark mode with `.dark` class + `.theme-{id}` CSS overrides
- CSS variable blocks in `client/src/index.css`: `.theme-uf` (Orange #FA4616 primary), `.theme-epa` (Green #2E8540 primary), `.theme-osu` (Scarlet #BB0000 primary), `.theme-auburn` (Burnt Orange #DD550C primary)
- Inline script in `client/index.html` applies stored theme before React mounts (no flash)
- Base water engineering theme: deep navy background (dark), sky blue primary (#38bdf8)
- Fonts: DM Sans (sans), Playfair Display (serif for titles), JetBrains Mono (mono)
- Canvas components (network, profile) are theme-aware and redraw on theme change

## Onboarding
- 6-step animated walkthrough overlay for first-time visitors
- Component: `client/src/components/onboarding.tsx`
- State stored in localStorage key "swmm-onboarding-complete"
- Can be re-triggered via the help (?) button in the header

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS + Shadcn/ui components
- wouter (routing)
- Express (server, minimal)

## No Database
This project intentionally has no database — all computation is client-side.
