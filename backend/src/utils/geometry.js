import { createHash } from "node:crypto";
import { HttpError } from "./errors.js";
export const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function documentId(value, name = "fieldId") {
  if (typeof value !== "string" || !/^[\w-]{1,128}$/.test(value))
    throw new HttpError(400, `Invalid ${name}`);
  return value;
}
export function geometry(field) {
  const coords = field.coordinates;
  if (!Array.isArray(coords) || coords.length < 3 || coords.length > 200)
    throw new HttpError(
      400,
      "Draw a field polygon with 3–200 points before analyzing.",
    );
  let points = coords.map((p) => {
    const lat = Array.isArray(p) ? p[1] : p.lat;
    const lng = Array.isArray(p) ? p[0] : p.lng;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 85 ||
      Math.abs(lng) > 180
    )
      throw new HttpError(400, "Invalid field coordinates");
    return [lng, lat];
  });
  if (JSON.stringify(points[0]) === JSON.stringify(points.at(-1))) points.pop();
  if (new Set(points.map((p) => p.join(","))).size !== points.length)
    throw new HttpError(400, "Polygon has repeated vertices");
  const cross = (a, b, c) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const area =
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length];
        return sum + p[0] * q[1] - q[0] * p[1];
      }, 0),
    ) / 2;
  if (area < 1e-10) throw new HttpError(400, "Polygon has no area");
  const on = (a, b, p) =>
    Math.abs(cross(a, b, p)) < 1e-12 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1]);
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      const a = points[i],
        b = points[(i + 1) % points.length],
        c = points[j],
        d = points[(j + 1) % points.length];
      if (
        (cross(a, b, c) * cross(a, b, d) < 0 &&
          cross(c, d, a) * cross(c, d, b) < 0) ||
        on(a, b, c) ||
        on(a, b, d) ||
        on(c, d, a) ||
        on(c, d, b)
      )
        throw new HttpError(400, "Polygon must not intersect itself");
    }
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]);
  const bbox = [
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys),
  ];
  const lat = (bbox[1] + bbox[3]) / 2,
    lng = (bbox[0] + bbox[2]) / 2;
  if (
    (bbox[2] - bbox[0]) * 111 * Math.cos((lat * Math.PI) / 180) > 10 ||
    (bbox[3] - bbox[1]) * 111 > 10
  )
    throw new HttpError(400, "Field extent exceeds 10 km");
  // Normalize orientation and starting vertex for stable result identity.
  const candidates = [points, [...points].reverse()].map((list) => {
    const start = list.reduce(
      (best, p, i) =>
        JSON.stringify(p) < JSON.stringify(list[best]) ? i : best,
      0,
    );
    return [...list.slice(start), ...list.slice(0, start)];
  });
  points = candidates.sort((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b)),
  )[0];
  const polygon = { type: "Polygon", coordinates: [[...points, points[0]]] };
  return {
    polygon,
    bbox,
    lat,
    lng,
    geometryHash: hash(polygon),
    bounds: {
      minLng: bbox[0],
      minLat: bbox[1],
      maxLng: bbox[2],
      maxLat: bbox[3],
    },
    areaKm2: area * 111 * 111 * Math.cos((lat * Math.PI) / 180),
  };
}
