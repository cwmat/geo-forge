# GeoForge

Drop a Shapefile (.shp/.dbf/.prj zip), GeoJSON, KML, or GeoPackage.
Preview on a MapLibre map, inspect attributes, reproject CRS,
and export to any other supported format. Zero server round-trips.

**Fully Client-Side | No Server Required | Your Data Stays Local**

---

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev
```

## Requirements

- Node.js >= 20 LTS
- npm >= 10
- Modern browser with WebAssembly support (Chrome 90+, Firefox 89+, Safari 15+, Edge 90+)

## Scripts

| Command            | Description                              |
|--------------------|------------------------------------------|
| `npm run dev`      | Start Vite dev server on port 5173       |
| `npm run build`    | Type-check and build to `dist/`          |
| `npm run preview`  | Serve the production build locally       |
| `npm run lint`     | Run ESLint                               |
| `npm run format`   | Format source files with Prettier        |

## Supported Formats

| Format     | Import | Export | Extension(s)       |
|------------|--------|--------|--------------------|
| GeoJSON    | Yes    | Yes    | `.geojson`, `.json` |
| Shapefile  | Yes    | Yes    | `.zip` (containing .shp/.dbf/.prj) |
| KML        | Yes    | Yes    | `.kml`, `.kmz`     |
| GeoPackage | Yes    | Yes    | `.gpkg`            |
| CSV        | Yes    | Yes    | `.csv`             |
| FlatGeobuf | Yes    | Yes    | `.fgb`             |

## How It Works

1. **Drop a file** on the landing page (or click "Browse Files" / "Open File")
2. The file is read as an ArrayBuffer and sent to a **Web Worker** running gdal3.js
3. GDAL opens the file, extracts layer info and CRS, then converts to GeoJSON
4. GeoJSON is rendered on a **MapLibre GL** map with auto-fit bounds
5. Use the **sidebar** to toggle layers and view/change the coordinate reference system
6. Use the **bottom panel** to inspect feature attributes in a scrollable table
7. Click **Export** in the header to convert and download in any supported format

All processing happens in your browser via WebAssembly. Nothing is sent to a server.

## Tech Stack

| Layer            | Technology                           |
|------------------|--------------------------------------|
| Framework        | React 19                             |
| Build            | Vite 6                               |
| Language         | TypeScript ~5.7                      |
| State            | Zustand 5                            |
| Styling          | Tailwind CSS 4                       |
| WASM Runtime     | gdal3.js (GDAL compiled to WASM)     |
| Map              | MapLibre GL + @vis.gl/react-maplibre |
| Geo Utilities    | Turf.js (bbox, center)               |
| CRS              | proj4                                |
| Table            | @tanstack/react-virtual              |
| Icons            | Lucide React                         |
| Linting          | ESLint 9 + Prettier                  |

## Project Structure

```
src/
├── main.tsx                          # Entry point
├── App.tsx                           # Root — idle/loading/workspace states
├── index.css                         # Tailwind v4 theme (Abyssal Teal)
├── components/
│   ├── layout/                       # MainLayout, Header, Footer
│   ├── shared/                       # Button, ErrorBoundary, ProgressBar, etc.
│   ├── input/DropZone.tsx            # File drag-and-drop
│   ├── map/                          # MapView, LayerRenderer
│   ├── attributes/AttributeTable.tsx # Virtualized feature property table
│   ├── layers/LayerPanel.tsx         # Layer list with visibility toggles
│   ├── crs/CrsPanel.tsx              # CRS info and reprojection
│   ├── export/ExportPanel.tsx        # Format selection and download
│   └── Workspace.tsx                 # Main workspace orchestrator
├── stores/
│   ├── geo-store.ts                  # GDAL worker, file state, features
│   └── ui-store.ts                   # Sidebar, panels, selection
├── workers/
│   └── gdal.worker.ts                # GDAL WASM in a Web Worker
├── types/
│   ├── geo.ts                        # GeoLayer, CrsInfo, DatasetInfo
│   └── worker-messages.ts            # Typed worker message unions
├── utils/
│   ├── format.ts                     # formatBytes, formatNumber
│   ├── file-utils.ts                 # Validation, extension detection
│   └── geo-utils.ts                  # Turf bbox/center helpers
└── constants/
    └── formats.ts                    # Supported extensions, output formats
```

## COOP/COEP and SharedArrayBuffer

gdal3.js may require `SharedArrayBuffer`, which needs cross-origin isolation headers.

- **Dev server:** Vite is configured with `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers automatically.
- **GitHub Pages:** A service worker shim (`public/coi-serviceworker.js`) intercepts responses and injects the required headers. This causes a one-time page reload on first visit.
- **Other static hosts (Netlify, Vercel, Cloudflare):** Add the headers in your hosting config. See the plan file for examples.

## Deployment

### GitHub Pages (automated)

Push to `main` and the GitHub Actions workflow (`.github/workflows/deploy.yml`) will build and deploy automatically. Make sure **Settings > Pages > Source** is set to **GitHub Actions**.

### Manual deploy to any static host

```bash
npm run build
# Upload the dist/ folder to your host
```

For hosts that support custom headers, add:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: credentialless
```

If your host cannot set headers, the `coi-serviceworker.js` shim handles it automatically.

## Data Privacy

All data is processed locally in your browser. Nothing is uploaded to any server.

- Clearing browser cache will remove any cached WASM modules
- The ~38MB GDAL WASM binary is downloaded once and cached by the service worker
- Files you drop are read into memory, processed, and never persisted

## License

MIT
