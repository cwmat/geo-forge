import { Source, Layer } from "@vis.gl/react-maplibre";
import type { FeatureCollection } from "geojson";

interface LayerRendererProps {
  features: FeatureCollection;
}

export function LayerRenderer({ features }: LayerRendererProps) {
  return (
    <Source id="geo-data" type="geojson" data={features}>
      {/* Polygon fill */}
      <Layer
        id="geo-fill"
        type="fill"
        filter={["==", "$type", "Polygon"]}
        paint={{
          "fill-color": "#50fa7b",
          "fill-opacity": 0.15,
        }}
      />
      {/* Polygon outline */}
      <Layer
        id="geo-outline"
        type="line"
        filter={["==", "$type", "Polygon"]}
        paint={{
          "line-color": "#50fa7b",
          "line-width": 1.5,
        }}
      />
      {/* Line */}
      <Layer
        id="geo-line"
        type="line"
        filter={["==", "$type", "LineString"]}
        paint={{
          "line-color": "#8be9fd",
          "line-width": 2,
        }}
      />
      {/* Point */}
      <Layer
        id="geo-point"
        type="circle"
        filter={["==", "$type", "Point"]}
        paint={{
          "circle-radius": 5,
          "circle-color": "#50fa7b",
          "circle-stroke-color": "#0a0f0d",
          "circle-stroke-width": 1,
        }}
      />
    </Source>
  );
}
