# SWMM5 INP MAKER

## Overview

The SWMM5 INP Maker is a React/TypeScript single-page web application designed to generate realistic EPA SWMM5 `.inp` model files. It utilizes physics-based force-directed network synthesis (Barnes-Hut quadtree) to create models with up to 10,000 junctions. A key feature is its client-side model generation, operating entirely in-browser without server dependencies for generation. An Express backend provides a REST API for programmatic access, serves the frontend, and runs a compiled SWMM5 v5.2.4 binary for server-side simulation. The project aims to provide a comprehensive tool for stormwater and wastewater modeling, enabling users to rapidly create, validate, and simulate complex hydraulic networks.

## User Preferences

- **Communication Style**: Clear and concise explanations are preferred.
- **Workflow**: I prefer iterative development with clear steps and confirmation before major changes.
- **Interaction**: Ask before making any significant architectural or design changes.
- **Code Style**: Maintain consistency with existing TypeScript and React best practices.
- **Output**: Detailed statistics and clear visualization of generated models are highly valued.
- **No Database**: This project intentionally has no database. All computation is stateless and client-side. The server is only used for:
    1. Serving the frontend
    2. Running the SWMM5 binary for simulation
    3. Providing the REST API
    No user accounts, sessions, or persistent data storage.
- **No emoji in UI**: Use text-based indicators/warnings, not emoji (except section icons in the viewer sidebar).

## System Architecture

The application is structured with a `client` directory for the React frontend (Vite + TypeScript) and a `server` directory for the Express backend. Shared types are managed in the `shared` directory. The core `swmm-engine.ts` handles network generation and INP writing, leveraging alternative generation algorithms and rainfall pattern libraries.

**Client-side Generation**:
Users configure parameters in the UI, and `swmm-engine.ts` generates the complete INP file in the browser, including terrain DEM, node placement, pipe sizing, and all 56 SWMM5 sections. Results are displayed with statistics, network maps, and profile views.

**Server-side Simulation**:
Generated INP files are sent to a `POST /api/simulate` endpoint. The server then executes the `swmm5` binary, parses the `.rpt` file, and returns simulation results including continuity errors and warnings.

**REST API**:
A comprehensive REST API allows external clients to programmatically generate, simulate, validate, or transform models.

**Key Design Decisions**:
- **Stateless Operation**: No database is used; all computation is stateless and client-side.
- **Client-Heavy Architecture**: Most complex operations (engine, parser, validator, transformer) run in the browser.
- **Physics-Based Generation**: Models use fractional Brownian motion for terrain, Barnes-Hut quadtree for node placement, and dendritic graph construction for realistic hydraulic networks.

**UI/UX Decisions**:
- The frontend is a single-page application with a 3-tab layout (Generator/Viewer/Docs).
- Uses Shadcn/ui for primitives and Tailwind CSS for styling.
- Six distinct themes are available, with `localStorage` persistence.
- Interactive HTML5 canvases are used for network maps and longitudinal profiles.
- An onboarding walkthrough guides first-time users.

**Feature Specifications**:
- **Shareable Config URLs**: Model configurations can be encoded in URLs for sharing.
- **Hyetograph Preview**: Inline bar charts visualize rainfall distribution.
- **Method Tournament**: Compares and ranks 18 generation methods by simulation continuity error.
- **Model DNA Fingerprinting**: Extracts and displays a 12-metric fingerprint, comparing it to a reference dataset.
- **Bulk API Mode**: `POST /api/bulk-generate` for generating and optionally simulating up to 50 models.
- **Model Certification Badge**: Provides a quality score and grade based on simulation performance.
- **INP Diff Comparison**: Side-by-side comparison of two generated models.
- **INP Transformer**: Anonymizes INP files by renaming elements and distorting geometry.

**Core Libraries & Frameworks**:
- **Frontend**: React 18.3.1, TypeScript 5.6.3, Vite 7.3.0, Tailwind CSS 3.4.17, Shadcn/ui, TanStack React Query.
- **Backend**: Express 5.0.1, tsx 4.20.5, Zod 3.24.2.

## External Dependencies

- **EPA SWMM5 v5.2.4**: A compiled Linux binary is used on the server for performing hydraulic simulations.
- **Vite**: Frontend build tool.
- **TanStack React Query**: Used for data fetching and caching in the React application.
- **Shadcn/ui**: Provides UI components based on Radix primitives.
- **lucide-react, react-icons**: Icon libraries.
- **framer-motion**: Animation library for UI elements.
- **wouter**: A tiny routing library for React.
- **react-hook-form + @hookform/resolvers**: Form management and validation.
- **Zod + drizzle-zod**: Schema validation for API requests and shared types.