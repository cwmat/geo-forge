import { useState, useCallback, type DragEvent } from "react";
import { Globe, Upload } from "lucide-react";
import { useGeoStore } from "@/stores/geo-store";
import { validateFile } from "@/utils/file-utils";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function DropZone() {
  const { gdalStatus, gdalProgress, gdalErrorMessage, loadFile, errorMessage, parseStatus } =
    useGeoStore();
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
      loadFile(file);
    },
    [loadFile],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const displayError = validationError || (parseStatus === "error" ? errorMessage : null);

  return (
    <div
      className="bg-app-gradient flex flex-1 flex-col items-center justify-center p-8"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        className={`flex max-w-lg flex-col items-center gap-6 rounded-2xl border-2 border-dashed p-12 transition-all ${
          isDragging
            ? "border-accent bg-accent/5 scale-[1.02]"
            : "border-border hover:border-border-hover"
        }`}
      >
        {gdalStatus === "loading" ? (
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-text-secondary">{gdalProgress || "Loading GDAL..."}</p>
          </div>
        ) : gdalStatus === "error" ? (
          <div className="flex flex-col items-center gap-4">
            <Globe className="h-16 w-16 text-red-400" />
            <p className="text-sm text-red-400">GDAL failed to load. Please refresh the page.</p>
            {gdalErrorMessage && (
              <p className="max-w-md break-all text-center text-xs text-red-400/70">
                {gdalErrorMessage}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="glow-accent rounded-2xl bg-surface-1/80 p-6">
              {isDragging ? (
                <Upload className="h-16 w-16 text-accent" />
              ) : (
                <Globe className="h-16 w-16 text-accent" />
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <h2 className="text-xl font-semibold text-text-primary">
                {isDragging ? "Drop it here" : "Drop a geospatial file"}
              </h2>
              <p className="text-center text-sm text-text-secondary">
                Shapefile (.zip), GeoJSON, KML, or GeoPackage — preview on a map, inspect
                attributes, reproject CRS, and export to any format.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {[".geojson", ".shp/.zip", ".kml", ".gpkg", ".csv", ".fgb"].map((ext) => (
                <span
                  key={ext}
                  className="rounded-full bg-surface-2 px-3 py-1 text-xs text-text-muted"
                >
                  {ext}
                </span>
              ))}
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-surface-0 transition-colors hover:bg-accent-hover">
              <Upload className="h-4 w-4" />
              Browse Files
              <input
                type="file"
                accept=".geojson,.json,.shp,.zip,.kml,.kmz,.gpkg,.csv,.fgb"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </label>

            {displayError && (
              <p className="text-center text-sm text-red-400">{displayError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
