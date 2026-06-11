# SWMM5 INP Maker

> README added by Robert Dickinson via Comet.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![SWMM5](https://img.shields.io/badge/EPA%20SWMM5-v5.2.4-005BAA)

## About

**SWMM5 INP Maker** is a React + TypeScript single-page web application for generating realistic EPA SWMM5 `.inp` model files. It uses physics-based, force-directed network synthesis (Barnes-Hut quadtree) to build hydraulic models with up to 10,000 junctions, entirely client-side and in-browser. An Express backend exposes a REST API for programmatic access, serves the frontend, and runs a compiled SWMM5 v5.2.4 binary for server-side simulation.

The goal is to give engineers a fast, comprehensive tool for building, validating, and simulating complex stormwater and wastewater networks without hand-editing input files.

This project is part of the SWMMEnablement collection.

## What's Inside

| Area | Description |
| --- | --- |
| `client/` | React + TypeScript frontend (Vite, Tailwind CSS, shadcn/ui) for model creation and visualization |
| `server/` | Express REST API, frontend hosting, and SWMM5 simulation runner |
| `shared/` | Shared types and schema definitions used by client and server |
| `script/` | Build and utility scripts |
| `swmm5` | Compiled EPA SWMM5 v5.2.4 binary for server-side simulation |
| `attached_assets/` | Supporting reference assets |

## Key Features

- Physics-based, force-directed network synthesis (Barnes-Hut quadtree) for realistic layouts
- Client-side generation of models with up to 10,000 junctions, no server dependency for generation
- Model DNA fingerprinting and bulk generation of multiple models
- Download all generated `.inp` files as a ZIP archive
- Server-side engine simulation and report generation via the bundled SWMM5 binary
- REST API for programmatic model creation and access

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Express
- **Database/ORM:** Drizzle (see `drizzle.config.ts`)
- **Simulation Engine:** EPA SWMM5 v5.2.4 (compiled binary)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/SWMMEnablement/SWMM-INP-Maker.git
cd SWMM-INP-Maker

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open the local URL printed by Vite in your browser.

```bash
# Build for production
npm run build
```

## License

See the repository for license details.
