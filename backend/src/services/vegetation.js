import { fromArrayBuffer } from "geotiff";
import { deflateSync } from "node:zlib";
import { providerRequest, jsonOptions } from "./http.js";
import { HttpError } from "../utils/errors.js";

// The four standard indices use reflectance, not inferred disease probabilities.
// Compute them in Sentinel's evalscript, then mask and aggregate pixels locally.
export const EVALSCRIPT = `//VERSION=3
function setup(){return {input:[{bands:['B02','B04','B05','B08','SCL','dataMask'],units:['REFLECTANCE','REFLECTANCE','REFLECTANCE','REFLECTANCE','DN','DN']}],output:{bands:8,sampleType:'FLOAT32'},mosaicking:'ORBIT'};}
function evaluatePixel(samples,scenes){
  for(var i=0;i<samples.length;i++){
    var s=samples[i]; if(!s.dataMask) continue;
    var clear=[4,5,6].indexOf(s.SCL)>=0;
    if(!clear) continue;
    var n=s.B08,r=s.B04,b=s.B02,e=s.B05;
    var date=scenes.orbits[i] && scenes.orbits[i].dateFrom;
    return [(n-r)/(n+r),(n-e)/(n+e),1.5*(n-r)/(n+r+0.5),2.5*(n-r)/(n+6*r-7.5*b+1),1,0,date?Math.floor(new Date(date).getTime()/86400000):0,1];
  }
  var any=samples.some(function(s){return s.dataMask>0;});
  return [0,0,0,0,0,any?1:0,0,any?1:0];
}`;
const TYPES = ["NDVI", "NDRE", "SAVI", "EVI"];
const COLORS = [
  [215, 25, 28],
  [253, 174, 97],
  [166, 217, 106],
  [26, 150, 65],
];
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type),
    out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return out;
}
function png(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    pixels.copy(
      rows,
      y * (width * 4 + 1) + 1,
      y * width * 4,
      (y + 1) * width * 4,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
export function inside(x, y, ring) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
export function aggregate(raster, width, height, geo) {
  const maps = TYPES.map(() => Buffer.alloc(width * height * 4)),
    counts = TYPES.map(() => [0, 0, 0, 0]);
  let fieldPixels = 0,
    validPixels = 0,
    cloudPixels = 0;
  const dates = new Set();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const lng =
          geo.bbox[0] + ((x + 0.5) / width) * (geo.bbox[2] - geo.bbox[0]),
        lat = geo.bbox[3] - ((y + 0.5) / height) * (geo.bbox[3] - geo.bbox[1]);
      if (!inside(lng, lat, geo.polygon.coordinates[0])) continue;
      fieldPixels++;
      const i = (y * width + x) * 8;
      if (raster[i + 5]) cloudPixels++;
      if (
        !raster[i + 4] ||
        !TYPES.every((_, k) => Number.isFinite(raster[i + k]))
      )
        continue;
      validPixels++;
      if (raster[i + 6] > 0)
        dates.add(
          new Date(raster[i + 6] * 86400000).toISOString().slice(0, 10),
        );
      TYPES.forEach((type, k) => {
        const thresholds =
          type === "NDRE"
            ? [0.02, 0.12, 0.22]
            : type === "EVI"
              ? [0.2, 0.35, 0.5]
              : [0.15, 0.25, 0.4];
        const value = raster[i + k];
        const band =
          value < thresholds[0]
            ? 0
            : value < thresholds[1]
              ? 1
              : value < thresholds[2]
                ? 2
                : 3;
        counts[k][band]++;
        const color =
          type === "NDRE"
            ? [
                [189, 189, 189],
                [178, 255, 89],
                [27, 138, 60],
                [196, 154, 0],
              ][band]
            : COLORS[band];
        maps[k].set([...color, 255], (y * width + x) * 4);
      });
    }
  if (!validPixels)
    throw new HttpError(
      422,
      "No clear satellite pixels in this field. Try a later acquisition.",
    );
  const labels = ["Poor", "Moderate", "Good", "Healthy"];
  const indices = Object.fromEntries(
    TYPES.map((type, k) => [
      type,
      {
        success: true,
        model_used: `standard-${type.toLowerCase()}-reflectance-v1`,
        heatmap_base64: png(width, height, maps[k]).toString("base64"),
        statistics: Object.fromEntries(
          (type === "NDRE"
            ? ["Dormant", "Early growth", "Active growth", "Maturity"]
            : labels
          ).map((label, i) => [
            label,
            Number(((counts[k][i] / validPixels) * 100).toFixed(2)),
          ]),
        ),
      },
    ]),
  );
  return {
    indices,
    bounds: geo.bounds,
    geometryHash: geo.geometryHash,
    areaKm2: geo.areaKm2,
    validPixels,
    fieldPixels,
    analyzedAreaKm2: (geo.areaKm2 * validPixels) / fieldPixels,
    excludedPixelPercent: Number(
      (((fieldPixels - validPixels) / fieldPixels) * 100).toFixed(2),
    ),
    cloudOrInvalidPixelPercent: Number(
      ((cloudPixels / fieldPixels) * 100).toFixed(2),
    ),
    imageryDates: [...dates].sort(),
    source: "Sentinel-2 L2A reflectance",
    bandContract: "four-indices-valid-cloud-date-coverage-v1",
  };
}
export async function analyzeVegetation(geo) {
  if (!process.env.SENTINEL_CLIENT_ID || !process.env.SENTINEL_CLIENT_SECRET)
    throw new HttpError(503, "Satellite credentials are not configured");
  const signal = AbortSignal.timeout(110000);
  const token = await providerRequest(
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: process.env.SENTINEL_CLIENT_ID,
        client_secret: process.env.SENTINEL_CLIENT_SECRET,
      }),
      signal,
    },
  );
  const end = new Date(),
    start = new Date(Date.now() - 60 * 86400000);
  const image = await providerRequest(
    "https://sh.dataspace.copernicus.eu/api/v1/process",
    {
      ...jsonOptions({
        input: {
          bounds: {
            bbox: geo.bbox,
            geometry: geo.polygon,
            properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
          },
          data: [
            {
              type: "sentinel-2-l2a",
              dataFilter: {
                timeRange: { from: start.toISOString(), to: end.toISOString() },
                mosaickingOrder: "leastCC",
              },
            },
          ],
        },
        output: {
          width: 256,
          height: 256,
          responses: [
            { identifier: "default", format: { type: "image/tiff" } },
          ],
        },
        evalscript: EVALSCRIPT,
      }),
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
        Accept: "image/tiff",
      },
      signal,
    },
    "buffer",
  );
  const tiff = await fromArrayBuffer(
    image.buffer.slice(image.byteOffset, image.byteOffset + image.byteLength),
  );
  const tile = await tiff.getImage();
  if (
    tile.getWidth() !== 256 ||
    tile.getHeight() !== 256 ||
    tile.getSamplesPerPixel() !== 8
  )
    throw new HttpError(502, "Unexpected satellite raster contract");
  const pixels = await tile.readRasters({ interleave: true });
  return {
    ...aggregate(pixels, 256, 256, geo),
    requestedRange: { from: start.toISOString(), to: end.toISOString() },
  };
}
