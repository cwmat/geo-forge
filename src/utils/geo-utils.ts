import bbox from "@turf/bbox";
import center from "@turf/center";
import type { FeatureCollection } from "geojson";

export function getFeatureBounds(
  fc: FeatureCollection,
): [number, number, number, number] | null {
  if (!fc.features.length) return null;
  try {
    const [minLng, minLat, maxLng, maxLat] = bbox(fc);
    return [minLng, minLat, maxLng, maxLat];
  } catch {
    return null;
  }
}

export function getFeatureCenter(fc: FeatureCollection): [number, number] | null {
  if (!fc.features.length) return null;
  try {
    const c = center(fc);
    return c.geometry.coordinates as [number, number];
  } catch {
    return null;
  }
}
