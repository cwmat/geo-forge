import { useGeoStore } from "@/stores/geo-store";
import { Layers, Eye, EyeOff } from "lucide-react";
import { formatNumber } from "@/utils/format";

export function LayerPanel() {
  const { layers, activeLayerName, setActiveLayer, toggleLayerVisibility } = useGeoStore();

  if (!layers.length) {
    return (
      <div className="p-4 text-xs text-text-muted">
        No layers loaded. Drop a geospatial file to begin.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium text-text-secondary">
        <Layers className="h-3.5 w-3.5" />
        Layers
      </div>
      <div className="flex flex-col">
        {layers.map((layer) => (
          <div
            key={layer.name}
            className={`flex items-center gap-2 border-b border-border/50 px-3 py-2 text-xs transition-colors ${
              activeLayerName === layer.name
                ? "bg-accent/10 text-text-primary"
                : "text-text-secondary hover:bg-surface-2"
            }`}
          >
            <button
              onClick={() => toggleLayerVisibility(layer.name)}
              className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
              title={layer.visible ? "Hide layer" : "Show layer"}
            >
              {layer.visible ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 opacity-50" />
              )}
            </button>
            <button
              onClick={() => setActiveLayer(layer.name)}
              className="flex min-w-0 flex-1 flex-col items-start gap-0.5"
            >
              <span className="truncate font-medium">{layer.name}</span>
              <span className="text-text-muted">
                {formatNumber(layer.featureCount)} features &middot; {layer.geometryType}
              </span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
