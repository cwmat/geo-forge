import type { DatasetInfo, CrsInfo } from "./geo";
import type { FeatureCollection } from "geojson";

export type GdalWorkerInbound =
  | { type: "INIT" }
  | { type: "OPEN_FILE"; payload: { arrayBuffer: ArrayBuffer; filename: string } }
  | { type: "GET_FEATURES"; payload: { layerName: string; limit?: number } }
  | { type: "CONVERT"; payload: { outputFormat: string; options?: string[] } }
  | { type: "REPROJECT"; payload: { targetCrs: string } }
  | { type: "CLOSE" };

export type GdalWorkerOutbound =
  | { type: "INIT_PROGRESS"; payload: { message: string } }
  | { type: "INIT_COMPLETE" }
  | { type: "INIT_ERROR"; payload: { message: string } }
  | { type: "FILE_OPENED"; payload: { datasetInfo: DatasetInfo } }
  | { type: "FEATURES"; payload: { geojson: FeatureCollection } }
  | {
      type: "CONVERTED";
      payload: { arrayBuffer: ArrayBuffer; filename: string; mimeType: string };
    }
  | { type: "REPROJECTED"; payload: { geojson: FeatureCollection; crs: CrsInfo } }
  | { type: "CRS_INFO"; payload: { crs: CrsInfo } }
  | { type: "ERROR"; payload: { message: string } };
