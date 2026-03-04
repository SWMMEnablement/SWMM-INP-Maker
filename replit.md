# SWMM5 INP MAKER

## Overview
A fully client-side React/TypeScript web app that generates realistic EPA SWMM5 `.inp` files using physics-based force-directed network synthesis (Barnes-Hut quadtree). All generation runs in-browser — no database or backend API needed.

## Architecture
- **Frontend-only app** built with React, TypeScript, Tailwind CSS, Shadcn/ui
- Backend (Express) exists only to serve the frontend — no API routes used
- All SWMM5 model generation is performed client-side in `swmm-engine.ts`

## Key Files
- `client/src/lib/swmm-engine.ts` — Complete physics engine: TerrainDEM (fBm noise), Barnes-Hut quadtree particle simulation, dendritic graph builder, INP file generator, ReSWMM discretization, profile path builder, rainfall profile generator, 5 generation methods, all constants from 1,729 real models
- `client/src/lib/generators.ts` — 4 alternative network generation algorithms: Horton-Strahler recursive branching, L-System grammar (3 variants), Space Colonization, Minimum Spanning Tree (Prim's)
- `client/src/lib/rain-canvas.ts` — Rain Canvas Studio integration: 34 rainfall patterns across 8 categories (SCS/NRCS, Huff, Chicago, Alternating Block, Uniform/Triangular, Regional US, International, Historical), all with local computation fallback
- `client/src/lib/inp-parser.ts` — Client-side INP file parser: section detection, column mapping for 40+ SWMM5 sections, descriptive statistics, histogram data
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
- 33 example SWMM5 file presets (quick-load configurations, with rationale text on key presets)
- US Customary / SI Metric unit toggle with sub-labels showing unit systems
- Configurable hydrology parameters:
  - Number of outfalls (manual or auto from model type ratio)
  - Number of subcatchments (manual or auto from model type ratio)
  - DWF node percentage (0-100%, controls how many junctions get dry weather flow)
  - DWF flow patterns (multi-select: Diurnal, Monthly, Weekend, Seasonal)
  - Inflow time series percentage (0-100%, external inflows on junctions)
  - Rainfall depth (configurable total depth in inches or mm)
  - Rainfall distribution (34 patterns via Rain Canvas Studio: SCS I/IA/II/III, Huff Q1-Q4, Chicago, Alternating Block, Triangular, Regional US, International, Historical)
  - Infiltration method (Horton, Green-Ampt, Curve Number) — affects both [OPTIONS] and [INFILTRATION] section format
- Transects and open channels: IRREGULAR cross-sections auto-generate [TRANSECTS] section with HEC-2 format station/elevation data (NC/X1/GR lines)
- Aquifers and Groundwater: toggleable [AQUIFERS] and [GROUNDWATER] sections with realistic soil properties and GW flow exchange per subcatchment
- ReSWMM conduit discretization (Fixed Interval or Δx/D ratio methods, MNSA)
- Longitudinal profile view (outfall to upstream, invert + crown lines, tooltips)
- INP File Viewer: upload or pass generated .inp files, browse sections by category, sortable/searchable tables, descriptive statistics, histograms
- Static INP validation with auto-repair: runs automatically after generation and on file upload in viewer
- SWMM5 real-world statistics from 1,729 models (15.4M elements) in docs tab
- Comprehensive stats panel after generation with downloadable markdown report
- App Docs tab includes: Model Types, "Which Settings Should I Use?" scenario guide (6 scenarios), Offset Algorithm, SWMM5 Statistics, ReSWMM docs, FAQ, Glossary (13 technical terms)

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
