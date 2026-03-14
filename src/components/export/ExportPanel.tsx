import { useGeoStore } from "@/stores/geo-store";
import { useUiStore } from "@/stores/ui-store";
import { OUTPUT_FORMATS } from "@/constants/formats";
import { X, FileDown } from "lucide-react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const FORMAT_ICONS: Record<string, string> = {
  geojson: "{ }",
  shapefile: ".shp",
  kml: ".kml",
  geopackage: ".gpkg",
  csv: ".csv",
  flatgeobuf: ".fgb",
};

export function ExportPanel() {
  const { requestConvert, exportStatus, loadedFile } = useGeoStore();
  const { exportModalOpen, setExportModalOpen } = useUiStore();

  if (!exportModalOpen) return null;

  const handleExport = (formatId: string) => {
    requestConvert(formatId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-surface-1 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <FileDown className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-semibold text-text-primary">Export</h2>
            {loadedFile && (
              <span className="text-xs text-text-muted">from {loadedFile.name}</span>
            )}
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Format grid */}
        <div className="p-5">
          {exportStatus === "converting" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-text-secondary">Converting...</p>
            </div>
          ) : exportStatus === "done" ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="rounded-full bg-accent/20 p-3">
                <FileDown className="h-8 w-8 text-accent" />
              </div>
              <p className="text-sm text-text-primary">Download started!</p>
              <button
                onClick={() => setExportModalOpen(false)}
                className="rounded bg-surface-2 px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-surface-3"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {OUTPUT_FORMATS.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => handleExport(fmt.id)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-0 p-4 transition-all hover:border-accent/50 hover:bg-surface-2"
                >
                  <span className="font-mono text-lg font-bold text-accent">
                    {FORMAT_ICONS[fmt.id]}
                  </span>
                  <span className="text-xs font-medium text-text-primary">{fmt.label}</span>
                  <span className="text-[10px] text-text-muted">{fmt.extension}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
