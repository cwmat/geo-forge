import { Globe, Trash2, Upload, Download } from "lucide-react";
import { useGeoStore } from "@/stores/geo-store";
import { useUiStore } from "@/stores/ui-store";
import { formatBytes } from "@/utils/format";

export function Header() {
  const { loadedFile, parseStatus, clear } = useGeoStore();
  const { setExportModalOpen } = useUiStore();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface-1 px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" />
          <h1 className="text-sm font-semibold tracking-tight text-text-primary">GeoForge</h1>
        </div>

        {loadedFile && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="rounded bg-surface-2 px-2 py-0.5">{loadedFile.name}</span>
            <span>{formatBytes(loadedFile.size)}</span>
            <span className="text-text-muted">|</span>
            <span>{loadedFile.format}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {parseStatus === "ready" && (
          <>
            <button
              onClick={() => setExportModalOpen(true)}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
            <button
              onClick={clear}
              className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </>
        )}
        {parseStatus === "idle" && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary">
            <Upload className="h-3.5 w-3.5" />
            Open File
            <input
              type="file"
              accept=".geojson,.json,.shp,.zip,.kml,.kmz,.gpkg,.csv,.fgb"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) useGeoStore.getState().loadFile(file);
              }}
            />
          </label>
        )}
      </div>
    </header>
  );
}
