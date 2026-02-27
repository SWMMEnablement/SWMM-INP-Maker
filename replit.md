# SWMM5 INP MAKER

## Overview
A fully client-side React/TypeScript web app that generates realistic EPA SWMM5 `.inp` files using physics-based force-directed network synthesis (Barnes-Hut quadtree). All generation runs in-browser — no database or backend API needed.

## Architecture
- **Frontend-only app** built with React, TypeScript, Tailwind CSS, Shadcn/ui
- Backend (Express) exists only to serve the frontend — no API routes used
- All SWMM5 model generation is performed client-side in `swmm-engine.ts`

## Key Files
- `client/src/lib/swmm-engine.ts` — Complete physics engine: TerrainDEM (fBm noise), Barnes-Hut quadtree particle simulation, dendritic graph builder, INP file generator, all constants from 338 real models
- `client/src/pages/home.tsx` — Main page: tabbed layout (Generator + Docs), config panel, element cards, charts, stats, download
- `client/src/components/network-canvas.tsx` — Interactive HTML5 canvas with pan/zoom/tooltips for network preview
- `client/src/App.tsx` — Router setup (single page at `/`)

## Theme
- Dark mode only (class="dark" on html)
- Water engineering theme: deep navy background, sky blue primary (#38bdf8), indigo (#818cf8), emerald (#34d399)
- Fonts: DM Sans (sans), Playfair Display (serif for titles), JetBrains Mono (mono)

## Tech Stack
- React + TypeScript + Vite
- Tailwind CSS + Shadcn/ui components
- wouter (routing)
- Express (server, minimal)

## No Database
This project intentionally has no database — all computation is client-side.
