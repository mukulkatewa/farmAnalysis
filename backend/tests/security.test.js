import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticate } from "../src/middleware/authFactory.js";
import { geometry, documentId } from "../src/utils/geometry.js";
import { validateImage } from "../src/utils/images.js";
import { aggregate } from "../src/services/vegetation.js";
const coords = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.01 },
  { lat: 0.01, lng: 0.01 },
  { lat: 0.01, lng: 0 },
];
test("missing and invalid bearer tokens never reach a paid handler", async () => {
  let verified = 0,
    next = 0,
    status;
  const auth = createAuthenticate(async () => {
    verified++;
    throw new Error("bad token");
  });
  const res = {
    status: (s) => {
      status = s;
      return res;
    },
    json: () => {},
  };
  for (const authorization of [
    undefined,
    "Basic abc",
    "Bearer bad token",
    "Bearer expired",
  ])
    await auth({ headers: { authorization } }, res, () => next++);
  assert.equal(next, 0);
  assert.equal(verified, 1);
  assert.equal(status, 401);
});
test("verified identity comes from the token, never the request body", async () => {
  const req = {
    headers: { authorization: "Bearer good" },
    body: { userId: "victim" },
  };
  let next = false;
  await createAuthenticate(async () => ({ uid: "alice" }))(req, {}, () => {
    next = true;
  });
  assert.equal(req.user.uid, "alice");
  assert.equal(next, true);
});
test("geometry accepts zero coordinates and normalizes rotation and winding", () => {
  const original = geometry({ coordinates: coords });
  const reverse = geometry({ coordinates: [...coords].reverse() });
  const rotated = geometry({
    coordinates: [...coords.slice(2), ...coords.slice(0, 2)],
  });
  assert.equal(original.geometryHash, reverse.geometryHash);
  assert.equal(original.geometryHash, rotated.geometryHash);
  assert.equal(original.bounds.minLat, 0);
});
test("invalid geometry and path injection are rejected before provider calls", () => {
  for (const coordinates of [
    [],
    [...coords, { lat: NaN, lng: 1 }],
    [coords[0], coords[2], coords[1], coords[3]],
    [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 1 },
      { lat: 1, lng: 1 },
    ],
  ])
    assert.throws(() => geometry({ coordinates }), { status: 400 });
  for (const id of ["../victim", "a/b", "", null])
    assert.throws(() => documentId(id), { status: 400 });
});
test("image uploads require real signatures and bounded pixel dimensions", () => {
  assert.throws(() => validateImage(null), { status: 400 });
  assert.throws(
    () =>
      validateImage({
        buffer: Buffer.from("not a jpeg"),
        mimetype: "image/jpeg",
      }),
    { status: 415 },
  );
});
test("heatmaps and statistics exclude pixels outside polygon and invalid pixels", () => {
  const geo = geometry({ coordinates: [coords[0], coords[1], coords[3]] });
  const pixels = new Float32Array(4 * 4 * 8);
  for (let i = 0; i < 16; i++)
    pixels.set([0.7, 0.3, 0.7, 0.7, 1, 0, 20000, 1], i * 8);
  const result = aggregate(pixels, 4, 4, geo);
  assert.ok(result.fieldPixels < 16);
  assert.equal(result.validPixels, result.fieldPixels);
  assert.equal(result.indices.NDVI.statistics.Healthy, 100);
  assert.equal(
    Buffer.from(result.indices.NDVI.heatmap_base64, "base64").readUInt32BE(0),
    0x89504e47,
  );
  pixels.fill(0);
  assert.throws(() => aggregate(pixels, 4, 4, geo), { status: 422 });
});
