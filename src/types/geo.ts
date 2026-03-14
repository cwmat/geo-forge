export interface GeoLayer {
  name: string;
  featureCount: number;
  geometryType: string;
  visible: boolean;
}

export interface LoadedFile {
  name: string;
  size: number;
  format: string;
}

export interface CrsInfo {
  wkt: string;
  epsg: number | null;
  proj4string: string;
  name: string;
}

export interface DatasetInfo {
  layers: GeoLayer[];
  crs: CrsInfo | null;
  driverName: string;
  featureCount: number;
}

export type SupportedFormat =
  | "geojson"
  | "shapefile"
  | "kml"
  | "geopackage"
  | "csv"
  | "flatgeobuf";
