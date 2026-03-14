import { create } from "zustand";
import type { GeoLayer, LoadedFile, CrsInfo, DatasetInfo } from "@/types/geo";
import type { GdalWorkerOutbound } from "@/types/worker-messages";
import type { FeatureCollection } from "geojson";

export type GdalStatus = "idle" | "loading" | "ready" | "error";
export type ParseStatus = "idle" | "loading" | "ready" | "error";

interface GeoStore {
  // GDAL WASM state
  gdalStatus: GdalStatus;
  gdalErrorMessage: string | null;
  gdalProgress: string;

  // File state
  loadedFile: LoadedFile | null;
  datasetInfo: DatasetInfo | null;
  layers: GeoLayer[];
  activeLayerName: string | null;

  // GeoJSON for rendering
  features: FeatureCollection | null;
  crsInfo: CrsInfo | null;

  // Parse status
  parseStatus: ParseStatus;
  errorMessage: string | null;

  // Export state
  exportStatus: "idle" | "converting" | "done" | "error";

  // Actions
  initGdal: () => void;
  loadFile: (file: File) => void;
  clear: () => void;
  setActiveLayer: (name: string) => void;
  toggleLayerVisibility: (name: string) => void;
  requestFeatures: (layerName: string) => void;
  requestConvert: (outputFormat: string, options?: string[]) => void;
  requestReproject: (targetCrs: string) => void;
  resetExportStatus: () => void;
}

let gdalWorker: Worker | null = null;

function getGdalWorker(): Worker {
  if (!gdalWorker) {
    gdalWorker = new Worker(new URL("@/workers/gdal.worker.ts", import.meta.url), {
      type: "module",
    });
  }
  return gdalWorker;
}

function detectFormat(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    geojson: "GeoJSON",
    json: "GeoJSON",
    shp: "Shapefile",
    zip: "Shapefile (ZIP)",
    kml: "KML",
    kmz: "KMZ",
    gpkg: "GeoPackage",
    csv: "CSV",
    fgb: "FlatGeobuf",
  };
  return map[ext ?? ""] ?? "Unknown";
}

export const useGeoStore = create<GeoStore>()((set, get) => ({
  gdalStatus: "idle",
  gdalErrorMessage: null,
  gdalProgress: "",
  loadedFile: null,
  datasetInfo: null,
  layers: [],
  activeLayerName: null,
  features: null,
  crsInfo: null,
  parseStatus: "idle",
  errorMessage: null,
  exportStatus: "idle",

  initGdal: () => {
    if (get().gdalStatus !== "idle") return;
    set({ gdalStatus: "loading", gdalProgress: "Initializing GDAL..." });

    const worker = getGdalWorker();
    worker.onmessage = (e: MessageEvent<GdalWorkerOutbound>) => {
      handleWorkerMessage(e.data, set, get);
    };
    worker.onerror = (e) => {
      console.error("[geo-store] Worker error:", e);
      set({
        gdalStatus: "error",
        gdalErrorMessage: e.message || "Worker failed to load",
      });
    };
    worker.postMessage({ type: "INIT" });
  },

  loadFile: (file: File) => {
    const { gdalStatus } = get();
    if (gdalStatus !== "ready") return;

    set({
      parseStatus: "loading",
      errorMessage: null,
      loadedFile: { name: file.name, size: file.size, format: detectFormat(file.name) },
      features: null,
      datasetInfo: null,
      layers: [],
      activeLayerName: null,
      crsInfo: null,
    });

    const reader = new FileReader();
    reader.onload = () => {
      const worker = getGdalWorker();
      const buffer = reader.result as ArrayBuffer;
      worker.postMessage(
        { type: "OPEN_FILE", payload: { arrayBuffer: buffer, filename: file.name } },
        [buffer],
      );
    };
    reader.onerror = () => {
      set({ parseStatus: "error", errorMessage: "Failed to read file" });
    };
    reader.readAsArrayBuffer(file);
  },

  clear: () => {
    getGdalWorker().postMessage({ type: "CLOSE" });
    set({
      loadedFile: null,
      datasetInfo: null,
      layers: [],
      activeLayerName: null,
      features: null,
      crsInfo: null,
      parseStatus: "idle",
      errorMessage: null,
      exportStatus: "idle",
    });
  },

  setActiveLayer: (name) => set({ activeLayerName: name }),

  toggleLayerVisibility: (name) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.name === name ? { ...l, visible: !l.visible } : l)),
    })),

  requestFeatures: (layerName: string) => {
    getGdalWorker().postMessage({ type: "GET_FEATURES", payload: { layerName } });
  },

  requestConvert: (outputFormat: string, options?: string[]) => {
    set({ exportStatus: "converting" });
    getGdalWorker().postMessage({ type: "CONVERT", payload: { outputFormat, options } });
  },

  requestReproject: (targetCrs: string) => {
    set({ parseStatus: "loading" });
    getGdalWorker().postMessage({ type: "REPROJECT", payload: { targetCrs } });
  },

  resetExportStatus: () => set({ exportStatus: "idle" }),
}));

function handleWorkerMessage(
  data: GdalWorkerOutbound,
  set: (
    partial:
      | Partial<ReturnType<typeof useGeoStore.getState>>
      | ((
          state: ReturnType<typeof useGeoStore.getState>,
        ) => Partial<ReturnType<typeof useGeoStore.getState>>),
  ) => void,
  _get: () => ReturnType<typeof useGeoStore.getState>,
) {
  switch (data.type) {
    case "INIT_PROGRESS":
      set({ gdalProgress: data.payload.message });
      break;

    case "INIT_COMPLETE":
      set({ gdalStatus: "ready", gdalProgress: "" });
      break;

    case "INIT_ERROR":
      set({ gdalStatus: "error", gdalErrorMessage: data.payload.message });
      break;

    case "FILE_OPENED": {
      const { datasetInfo } = data.payload;
      const firstLayer = datasetInfo.layers[0];
      set({
        datasetInfo,
        layers: datasetInfo.layers,
        crsInfo: datasetInfo.crs,
        activeLayerName: firstLayer?.name ?? null,
      });
      // Auto-request features for the first layer
      if (firstLayer) {
        getGdalWorker().postMessage({
          type: "GET_FEATURES",
          payload: { layerName: firstLayer.name },
        });
      }
      break;
    }

    case "FEATURES":
      set({ features: data.payload.geojson, parseStatus: "ready" });
      break;

    case "REPROJECTED":
      set({ features: data.payload.geojson, crsInfo: data.payload.crs, parseStatus: "ready" });
      break;

    case "CONVERTED": {
      const { arrayBuffer, filename, mimeType } = data.payload;
      triggerDownload(arrayBuffer, filename, mimeType);
      set({ exportStatus: "done" });
      break;
    }

    case "CRS_INFO":
      set({ crsInfo: data.payload.crs });
      break;

    case "ERROR":
      set({ parseStatus: "error", errorMessage: data.payload.message, exportStatus: "idle" });
      break;
  }
}

function triggerDownload(arrayBuffer: ArrayBuffer, filename: string, mimeType: string) {
  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
