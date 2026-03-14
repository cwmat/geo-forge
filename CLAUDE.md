# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Type-check (tsc -b) then production build to dist/
npm run preview      # Serve the production build locally
npm run lint         # ESLint
npm run format       # Prettier (src/**/*.{ts,tsx,css})
```

No test runner is configured yet.

## What This App Does

GeoForge is a fully client-side geospatial file viewer/converter. Users drop Shapefile ZIPs, GeoJSON, KML, or GeoPackage files, preview them on a MapLibre map, inspect feature attributes, reproject CRS, and export to other formats. All processing happens in-browser via GDAL compiled to WebAssembly — nothing is sent to a server.

## Architecture

### Data Flow

```
File drop → ArrayBuffer → Web Worker (gdal3.js WASM) → GeoJSON → Zustand store → MapLibre renders
```

The entire processing pipeline runs through a single **GDAL Web Worker** (`src/workers/gdal.worker.ts`). The main thread never touches gdal3.js directly. ArrayBuffers are **transferred** (not copied) to the worker for performance.

### Worker Message Protocol

Communication between the main thread and the GDAL worker uses **typed discriminated unions** defined in `src/types/worker-messages.ts`:

- `GdalWorkerInbound`: `INIT`, `OPEN_FILE`, `GET_FEATURES`, `CONVERT`, `REPROJECT`, `CLOSE`
- `GdalWorkerOutbound`: `INIT_COMPLETE`, `INIT_ERROR`, `FILE_OPENED`, `FEATURES`, `CONVERTED`, `REPROJECTED`, `ERROR`, etc.

The worker is a **module-level singleton** created lazily in `src/stores/geo-store.ts` via `getGdalWorker()`. All inbound messages go through `worker.postMessage()` calls in store actions; all outbound messages are routed through a single `handleWorkerMessage()` switch that updates Zustand state.

### State Management

Two Zustand stores (no persist middleware):

- **`geo-store.ts`** — GDAL worker lifecycle (`gdalStatus`), loaded file metadata, GeoJSON features, CRS info, export state. Contains all worker communication logic.
- **`ui-store.ts`** — Sidebar/panel visibility, selected feature, bottom panel height, export modal state.

### App State Machine

`App.tsx` renders one of three views based on `parseStatus`:
- `"idle"` or `"error"` → `DropZone` (file input)
- `"loading"` → loading spinner
- `"ready"` → `Workspace` (map + sidebar + attribute table)

GDAL WASM initialization fires on mount via `useEffect` → `initGdal()`.

### Workspace Layout

`Workspace.tsx` is a flex layout with:
- **Left sidebar** (collapsible, 256px) — tabbed between LayerPanel and CrsPanel
- **Center** — MapLibre map filling remaining space
- **Bottom panel** (collapsible, drag-resizable) — virtualized AttributeTable
- **Export modal** — overlay triggered from Header

### GDAL WASM Asset Pipeline

gdal3.js requires two large binary files at runtime: `gdal3WebAssembly.wasm` (~27MB) and `gdal3WebAssembly.data` (~11MB). These are copied from `node_modules/gdal3.js/dist/package/` to `public/gdal/` via the `postinstall` script (`scripts/copy-gdal-assets.mjs`). The `public/gdal/` directory is gitignored.

**Critical:** The worker initializes gdal3.js with `useWorker: false` because our code already runs inside a Web Worker. Without this flag, gdal3.js tries to spawn a sub-worker which fails. The `path` option points to the `public/gdal/` directory where Vite serves the static assets.

### WASM / COOP-COEP

gdal3.js may require `SharedArrayBuffer`. Vite dev server sets `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers. For GitHub Pages (no custom headers), `public/coi-serviceworker.js` intercepts responses and injects `credentialless` COEP headers. This causes a one-time reload on first visit.

**Known risk:** COEP `require-corp` blocks cross-origin OSM tiles. If tiles fail to load, switch COEP to `credentialless` in vite.config.ts headers.

## Conventions

This project mirrors the sibling `json-surgeon` project in the same `wasm-apps/` directory.

- **Named exports** for all components except `App.tsx` (default export)
- **`@/*` path alias** for `src/` — use it for all imports
- **Double quotes**, 100 char print width, trailing commas (Prettier with tailwindcss plugin)
- **Tailwind CSS v4** via `@tailwindcss/vite` — theme tokens defined in `@theme` block in `src/index.css`, not in a tailwind.config file
- **Abyssal Teal** dark theme: accent `#50fa7b` (green), surfaces are dark teal gradients. Use `bg-surface-{0-4}`, `text-text-{primary,secondary,muted}`, `border-border`, `text-accent` etc.
- **`h-dvh`** for viewport height, **`min-h-0`** on flex children that need to scroll
- Worker messages use **discriminated union types** (`{ type: "ACTION"; payload: {...} }`)
- Prefix unused function parameters with `_` (ESLint `argsIgnorePattern: "^_"`)
- `noUncheckedIndexedAccess` is enabled — array/object indexing returns `T | undefined`

## Key Dependencies

- **gdal3.js** — GDAL compiled to WASM; excluded from Vite optimizeDeps; loaded with `useWorker: false` inside our own worker; WASM assets served from `public/gdal/`
- **@vis.gl/react-maplibre** + **maplibre-gl** — map rendering; GeoJSON rendered via `<Source>` + `<Layer>` components in `LayerRenderer.tsx`
- **@turf/bbox**, **@turf/center** — lightweight geo calculations (tree-shakeable)
- **@tanstack/react-virtual** — virtualizes the attribute table rows
- **vite-plugin-wasm** + **vite-plugin-top-level-await** — configured for both main bundle and `worker` config in vite.config.ts
