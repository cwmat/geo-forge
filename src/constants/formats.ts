export const SUPPORTED_EXTENSIONS = [
  ".geojson",
  ".json",
  ".shp",
  ".zip",
  ".kml",
  ".kmz",
  ".gpkg",
  ".csv",
  ".fgb",
] as const;

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB

export const OUTPUT_FORMATS = [
  { id: "geojson", label: "GeoJSON", extension: ".geojson" },
  { id: "shapefile", label: "Shapefile", extension: ".zip" },
  { id: "kml", label: "KML", extension: ".kml" },
  { id: "geopackage", label: "GeoPackage", extension: ".gpkg" },
  { id: "csv", label: "CSV", extension: ".csv" },
  { id: "flatgeobuf", label: "FlatGeobuf", extension: ".fgb" },
] as const;
