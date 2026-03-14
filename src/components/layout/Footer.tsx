import { useGeoStore } from "@/stores/geo-store";
import { formatNumber } from "@/utils/format";

export function Footer() {
  const { gdalStatus, gdalProgress, parseStatus, datasetInfo, crsInfo, errorMessage } =
    useGeoStore();

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-surface-1 px-4 text-[11px] text-text-muted">
      <div className="flex items-center gap-3">
        {gdalStatus === "loading" && (
          <span className="text-accent">{gdalProgress || "Loading GDAL..."}</span>
        )}
        {gdalStatus === "error" && <span className="text-red-400">GDAL failed to load</span>}
        {gdalStatus === "ready" && parseStatus === "idle" && (
          <span className="text-accent">GDAL Ready</span>
        )}
        {parseStatus === "loading" && <span className="text-accent">Processing...</span>}
        {parseStatus === "error" && (
          <span className="text-red-400">{errorMessage || "Error"}</span>
        )}
        {parseStatus === "ready" && datasetInfo && (
          <>
            <span>{formatNumber(datasetInfo.featureCount)} features</span>
            <span>
              {datasetInfo.layers.length} layer{datasetInfo.layers.length !== 1 ? "s" : ""}
            </span>
            {crsInfo && (
              <span>{crsInfo.epsg ? `EPSG:${crsInfo.epsg}` : crsInfo.name}</span>
            )}
            <span className="text-text-muted/50">|</span>
            <span>{datasetInfo.driverName}</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span>Client-side only</span>
        <span className="text-text-muted/50">|</span>
        <span>Your data stays local</span>
      </div>
    </footer>
  );
}
