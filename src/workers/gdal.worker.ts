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
/** Tracks the active CRS after reprojection (e.g. "EPSG:3857"). null = source CRS. */
let activeTargetCrs: string | null = null;

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
      shapefile: { flag: "ESRI Shapefile", ext: ".zip", mime: "application/zip" },
      kml: { flag: "KML", ext: ".kml", mime: "application/vnd.google-earth.kml+xml" },
      geopackage: { flag: "GPKG", ext: ".gpkg", mime: "application/geopackage+sqlite3" },
      csv: { flag: "CSV", ext: ".csv", mime: "text/csv" },
      flatgeobuf: { flag: "FlatGeobuf", ext: ".fgb", mime: "application/octet-stream" },
    };

    const fmt = formatMap[outputFormat];
    if (!fmt) throw new Error(`Unsupported output format: ${outputFormat}`);

    const crsArgs = activeTargetCrs ? ["-t_srs", activeTargetCrs] : [];
    const output = await Gdal.ogr2ogr(currentDataset, ["-f", fmt.flag, ...crsArgs, ...options], "export");

    // For formats where the driver isn't in gdal3.js's internal map (e.g. CSV),
    // the output path ends up as .unknown and getFileBytes returns empty.
    // Fall back to getOutputFiles() to discover what GDAL actually wrote.
    let bytes: Uint8Array = await Gdal.getFileBytes(output);

    if (bytes.length === 0) {
      const outputFiles = await Gdal.getOutputFiles();
      const match = outputFiles.find((f: { path: string }) => f.path.endsWith(fmt.ext));
      if (match) {
        bytes = await Gdal.getFileBytes(match.path);
      }
    }

    // Multi-file formats: Shapefile (.shp/.shx/.dbf/.prj) → ZIP
    if (outputFormat === "shapefile" && output.all?.length > 1) {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const entry of output.all) {
        const fileBytes = await Gdal.getFileBytes(entry);
        const name = entry.local?.split("/").pop() ?? entry.real?.split("/").pop() ?? "file";
        files.push({ name, data: fileBytes });
      }
      const zipBuffer = buildZip(files);
      post({
        type: "CONVERTED",
        payload: { arrayBuffer: zipBuffer, filename: "export.zip", mimeType: "application/zip" },
      });
    } else {
      const filename = `export${fmt.ext}`;
      post({
        type: "CONVERTED",
        payload: { arrayBuffer: bytes.buffer, filename, mimeType: fmt.mime },
      });
    }
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
    activeTargetCrs = targetCrs;

    // Build CRS info from the target CRS string
    const epsgMatch = targetCrs.match(/(\d+)/);
    const epsgCode = epsgMatch ? parseInt(epsgMatch[1]!, 10) : null;
    const crsNames: Record<number, string> = {
      4326: "WGS 84",
      3857: "WGS 84 / Pseudo-Mercator",
      4269: "NAD83",
      4258: "ETRS89",
    };
    const crs = {
      wkt: "",
      epsg: epsgCode,
      proj4string: "",
      name: (epsgCode && crsNames[epsgCode]) || targetCrs,
    };

    // Convert from source to WGS 84 GeoJSON for MapLibre display
    const display = await Gdal.ogr2ogr(currentDataset, ["-f", "GeoJSON", "-t_srs", "EPSG:4326"]);
    const bytes = await Gdal.getFileBytes(display);
    const text = new TextDecoder().decode(bytes);
    const geojson = JSON.parse(text);

    post({ type: "REPROJECTED", payload: { geojson, crs } });
  } catch (err) {
    post({ type: "ERROR", payload: { message: (err as Error).message } });
  }
}

/** Build an uncompressed ZIP archive from a list of named byte arrays. */
function buildZip(files: { name: string; data: Uint8Array }[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);

    // Local file header (30 bytes + name + data)
    const local = new Uint8Array(30 + nameBytes.length + file.data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression: STORE
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);
    local.set(file.data, 30 + nameBytes.length);
    localHeaders.push(local);

    // Central directory header (46 bytes + name)
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0, true); // flags
    cv.setUint16(10, 0, true); // compression: STORE
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0, true); // mod date
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true); // extra length
    cv.setUint16(32, 0, true); // comment length
    cv.setUint16(34, 0, true); // disk number
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, offset, true); // local header offset
    central.set(nameBytes, 46);
    centralHeaders.push(central);

    offset += local.length;
  }

  const centralSize = centralHeaders.reduce((s, c) => s + c.length, 0);

  // End of central directory (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // central dir disk
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // central dir offset
  ev.setUint16(20, 0, true); // comment length

  const totalSize = offset + centralSize + 22;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const lh of localHeaders) { result.set(lh, pos); pos += lh.length; }
  for (const ch of centralHeaders) { result.set(ch, pos); pos += ch.length; }
  result.set(eocd, pos);

  return result.buffer;
}

/** CRC-32 used by ZIP format. */
function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
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
      activeTargetCrs = null;
      break;
  }
};
