import { useState } from "react";
import { useGeoStore } from "@/stores/geo-store";
import { MapPin, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/shared/Button";

const COMMON_CRS = [
  { label: "WGS 84", value: "EPSG:4326" },
  { label: "Web Mercator", value: "EPSG:3857" },
  { label: "NAD83", value: "EPSG:4269" },
  { label: "ETRS89", value: "EPSG:4258" },
];

export function CrsPanel() {
  const { crsInfo, parseStatus, requestReproject } = useGeoStore();
  const [targetCrs, setTargetCrs] = useState("");
  const [wktExpanded, setWktExpanded] = useState(false);

  const handleReproject = () => {
    const crs = targetCrs.trim();
    if (!crs) return;
    requestReproject(crs);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-text-secondary">
        <MapPin className="h-3.5 w-3.5" />
        Coordinate Reference System
      </div>

      {crsInfo ? (
        <div className="flex flex-col gap-3 p-3">
          {/* Current CRS */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Current CRS
            </span>
            <span className="text-xs text-text-primary">
              {crsInfo.epsg ? `EPSG:${crsInfo.epsg}` : "Unknown EPSG"}
            </span>
            <span className="text-xs text-text-secondary">{crsInfo.name}</span>
          </div>

          {/* WKT (collapsible) */}
          {crsInfo.wkt && (
            <div>
              <button
                onClick={() => setWktExpanded(!wktExpanded)}
                className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-text-muted hover:text-text-secondary"
              >
                {wktExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                WKT Definition
              </button>
              {wktExpanded && (
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-surface-0 p-2 font-mono text-[10px] text-text-muted">
                  {crsInfo.wkt}
                </pre>
              )}
            </div>
          )}

          {/* Reproject */}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
              Reproject to
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={targetCrs}
                onChange={(e) => setTargetCrs(e.target.value)}
                placeholder="EPSG:4326"
                className="min-w-0 flex-1 rounded border border-border bg-surface-0 px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
              <Button
                onClick={handleReproject}
                disabled={!targetCrs.trim() || parseStatus === "loading"}
                variant="primary"
                size="sm"
              >
                Go
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {COMMON_CRS.map((crs) => (
                <button
                  key={crs.value}
                  onClick={() => setTargetCrs(crs.value)}
                  className={`rounded-full px-2 py-0.5 text-[10px] transition-colors ${
                    targetCrs === crs.value
                      ? "bg-accent/20 text-accent"
                      : "bg-surface-2 text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {crs.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 text-xs text-text-muted">No CRS information available.</div>
      )}
    </div>
  );
}
