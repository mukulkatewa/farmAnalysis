import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import { createReportHandler } from "../src/controllers/report.controller.js";
const context = {
  field: { id: "farm", fieldName: "My farm", coordinates: [] },
  geo: { geometryHash: "geometry", lat: 0, lng: 0 },
  key: "vegetation",
};
test("export reads existing snapshots, labels missing sections, and never calls providers", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => assert.fail("Export must not invoke providers");
  try {
    const handler = createReportHandler({
      getContext: async (req, kind) => ({ ...context, key: kind }),
      getUser: async () => ({ firstName: "Farmer" }),
      snapshotStore: {
        latest: async (uid, key) =>
          key === "vegetation"
            ? {
                meta: { id: "saved", generatedAt: Date.now(), stale: true },
                result: { indices: {}, imageryDates: [] },
              }
            : null,
      },
    });
    const res = new PassThrough();
    res.headersSent = false;
    res.setHeader = () => {};
    const chunks = [];
    res.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve) => res.on("end", resolve));
    await handler({ user: { uid: "alice" }, body: { fieldId: "farm" } }, res);
    await done;
    assert.equal(Buffer.concat(chunks).subarray(0, 4).toString(), "%PDF");
  } finally {
    globalThis.fetch = original;
  }
});
test("export without saved analysis returns a useful conflict instead of starting analysis", async () => {
  const handler = createReportHandler({
    getContext: async () => context,
    getUser: async () => ({}),
    snapshotStore: { latest: async () => null },
  });
  await assert.rejects(
    handler({ user: { uid: "alice" }, body: { fieldId: "farm" } }, {}),
    { status: 409 },
  );
});
