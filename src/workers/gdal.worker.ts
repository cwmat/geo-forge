import type { GdalWorkerInbound, GdalWorkerOutbound } from "../types/worker-messages";
import initGdalJs from "gdal3.js";

/** Minimal Worker global scope — avoids adding "WebWorker" lib which conflicts with "DOM". */
interface WorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((this: WorkerScope, ev: MessageEvent) => unknown) | null;
  importScripts: (...urls: string[]) => void;
}

const ctx = self as unknown as WorkerScope;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Gdal: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let currentDataset: any = null;

function post(msg: GdalWorkerOutbound) {
  if (msg.type === "CONVERTED" && "arrayBuffer" in msg.payload) {
    ctx.postMessage(msg, [msg.payload.arrayBuffer]);
  } else {
    ctx.postMessage(msg);
  }
}

async function initGdal() {
  try {
    post({ type: "INIT_PROGRESS", payload: { message: "Loading GDAL WASM..." } });

    // We ARE the worker — useWorker: false runs GDAL directly in this thread
    // instead of trying to spawn a sub-worker.
    // WASM assets are served from public/gdal/ (copied via postinstall script).
    const base = import.meta.env.BASE_URL ?? "/";
    Gdal = await initGdalJs({
      path: `${base}gdal`,
      useWorker: false,
    });

    post({ type: "INIT_COMPLETE" });
  } catch (err) {
    console.error("[gdal.worker] INIT failed:", err);
    post({ type: "INIT_ERROR", payload: { message: (err as Error).message } });
  }
}

async function openFile(arrayBuffer: ArrayBuffer, filename: string) {
  if (!Gdal) {
    post({ type: "ERROR", payload: { message: "GDAL not initialized" } });
    return;
  }

  try {
    const blob = new Blob([arrayBuffer]);
    const file = new File([blob], filename);
    const result = await Gdal.open(file);
    const dataset = result.datasets[0];
    if (!dataset) throw new Error("No dataset found in file");

    currentDataset = dataset;
    const info = await Gdal.getInfo(dataset);

    const isGeoJson = /\.(geojson|json)$/i.test(filename);
    const crs = extractCrsFromInfo(info) ??
      (isGeoJson
        ? {
            wkt: 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433],AUTHORITY["EPSG","4326"]]',
            epsg: 4326,
            proj4string: "+proj=longlat +datum=WGS84 +no_defs",
            name: "WGS 84",
          }
        : null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const layers = (info.layers || []).map((l: any) => ({
      name: l.name || "default",
      featureCount: l.featureCount || 0,
      geometryType: l.geometryType || "Unknown",
      visible: true,
    }));

    // If no layers detected (e.g. simple GeoJSON), create a default one
    if (layers.length === 0) {
      layers.push({
        name: "default",
        featureCount: info.featureCount || 0,
        geometryType: "Unknown",
        visible: true,
      });
    }

    const datasetInfo = {
      layers,
      crs,
      driverName: info.driverName || info.driver || "Unknown",
      featureCount: info.featureCount || 0,
    };

    post({ type: "FILE_OPENED", payload: { datasetInfo } });
  } catch (err) {
    post({ type: "ERROR", payload: { message: (err as Error).message } });
  }
}

async function getFeatures(_layerName: string, _limit?: number) {
  if (!Gdal || !currentDataset) {
    post({ type: "ERROR", payload: { message: "No file loaded" } });
    return;
  }

  try {
    const output = await Gdal.ogr2ogr(currentDataset, ["-f", "GeoJSON"]);
    const bytes = await Gdal.getFileBytes(output);
    const text = new TextDecoder().decode(bytes);
    const geojson = JSON.parse(text);
    post({ type: "FEATURES", payload: { geojson } });
  } catch (err) {
    post({ type: "ERROR", payload: { message: (err as Error).message } });
  }
}

async function convert(outputFormat: string, options: string[] = []) {
  if (!Gdal || !currentDataset) {
    post({ type: "ERROR", payload: { message: "No file loaded" } });
    return;
  }

  try {
    const formatMap: Record<string, { flag: string; ext: string; mime: string }> = {
      geojson: { flag: "GeoJSON", ext: ".geojson", mime: "application/geo+json" },
      shapefile: { flag: "ESRI Shapefile", ext: ".shp", mime: "application/x-shapefile" },
      kml: { flag: "KML", ext: ".kml", mime: "application/vnd.google-earth.kml+xml" },
      geopackage: { flag: "GPKG", ext: ".gpkg", mime: "application/geopackage+sqlite3" },
      csv: { flag: "CSV", ext: ".csv", mime: "text/csv" },
      flatgeobuf: { flag: "FlatGeobuf", ext: ".fgb", mime: "application/octet-stream" },
    };

    const fmt = formatMap[outputFormat];
    if (!fmt) throw new Error(`Unsupported output format: ${outputFormat}`);

    const output = await Gdal.ogr2ogr(currentDataset, ["-f", fmt.flag, ...options]);
    const bytes = await Gdal.getFileBytes(output);
    const filename = `export${fmt.ext}`;

    post({
      type: "CONVERTED",
      payload: { arrayBuffer: bytes.buffer, filename, mimeType: fmt.mime },
    });
  } catch (err) {
    post({ type: "ERROR", payload: { message: (err as Error).message } });
  }
}

async function reproject(targetCrs: string) {
  if (!Gdal || !currentDataset) {
    post({ type: "ERROR", payload: { message: "No file loaded" } });
    return;
  }

  try {
    const output = await Gdal.ogr2ogr(currentDataset, ["-f", "GeoJSON", "-t_srs", targetCrs]);
    const bytes = await Gdal.getFileBytes(output);
    const text = new TextDecoder().decode(bytes);
    const geojson = JSON.parse(text);
    post({ type: "REPROJECTED", payload: { geojson } });
  } catch (err) {
    post({ type: "ERROR", payload: { message: (err as Error).message } });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCrsFromInfo(info: any): {
  wkt: string;
  epsg: number | null;
  proj4string: string;
  name: string;
} | null {
  const wkt = (info.coordinateSystem?.wkt as string) || (info.projectionWkt as string) || "";
  if (!wkt) return null;

  const epsgMatch = wkt.match(/EPSG[",[\]]*?(\d+)/);
  const nameMatch = wkt.match(/(?:GEOGCS|PROJCS)\["([^"]+)"/);

  return {
    wkt,
    epsg: epsgMatch ? parseInt(epsgMatch[1]!, 10) : null,
    proj4string: "",
    name: nameMatch?.[1] || "Unknown CRS",
  };
}

ctx.onmessage = async (e: MessageEvent<GdalWorkerInbound>) => {
  const msg = e.data;

  switch (msg.type) {
    case "INIT":
      await initGdal();
      break;
    case "OPEN_FILE":
      await openFile(msg.payload.arrayBuffer, msg.payload.filename);
      break;
    case "GET_FEATURES":
      await getFeatures(msg.payload.layerName, msg.payload.limit);
      break;
    case "CONVERT":
      await convert(msg.payload.outputFormat, msg.payload.options);
      break;
    case "REPROJECT":
      await reproject(msg.payload.targetCrs);
      break;
    case "CLOSE":
      currentDataset = null;
      break;
  }
};
