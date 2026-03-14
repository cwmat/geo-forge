import { useRef, useEffect, useCallback } from "react";
import { Map, NavigationControl, ScaleControl } from "@vis.gl/react-maplibre";
import type { MapRef, MapLayerMouseEvent } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LayerRenderer } from "./LayerRenderer";
import { useGeoStore } from "@/stores/geo-store";
import { useUiStore } from "@/stores/ui-store";
import { getFeatureBounds } from "@/utils/geo-utils";
import { Maximize2 } from "lucide-react";

const BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export function MapView() {
  const mapRef = useRef<MapRef>(null);
  const features = useGeoStore((s) => s.features);
  const { setSelectedFeatureId, setBottomPanel } = useUiStore();

  const fitBounds = useCallback(() => {
    if (!features || !mapRef.current) return;
    const bounds = getFeatureBounds(features);
    if (bounds) {
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 15, duration: 1000 });
    }
  }, [features]);

  // Auto-fit bounds when features change
  useEffect(() => {
    fitBounds();
  }, [fitBounds]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const queried = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ["geo-fill", "geo-line", "geo-point"],
      });
      const feature = queried[0];
      if (feature) {
        setSelectedFeatureId(feature.id ?? feature.properties?.id ?? null);
        setBottomPanel("attributes");
      } else {
        setSelectedFeatureId(null);
      }
    },
    [setSelectedFeatureId, setBottomPanel],
  );

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 2 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={BASEMAP_STYLE}
        attributionControl={false}
        onClick={handleClick}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-left" />
        {features && <LayerRenderer features={features} />}
      </Map>

      {features && (
        <button
          onClick={fitBounds}
          className="absolute top-3 left-3 z-10 rounded bg-surface-1 p-1.5 text-text-secondary shadow-lg transition-colors hover:bg-surface-2 hover:text-text-primary"
          title="Fit to bounds"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
