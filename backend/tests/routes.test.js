import test from "node:test";
import assert from "node:assert/strict";
process.env.NODE_ENV = "test";
const { default: app } = await import("../server.js");
test("all paid endpoints and legacy field writes reject anonymous requests", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    for (const path of [
      "/api/ai/generate",
      "/api/ai/insight",
      "/api/ai/alert-descriptions",
      "/api/analyze-ndvi",
      "/api/analyses/forecast",
      "/api/analyses/analytics",
      "/api/disease/predict",
      "/api/pest/predict",
      "/api/notifications",
      "/api/report/generate",
      "/field/process-region",
    ]) {
      const response = await fetch(url + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "victim" }),
      });
      assert.equal(response.status, 401, path);
    }
    for (const path of [
      "/api/analyses/forecast?fieldId=victim",
      "/api/directory",
      "/api/user/profile",
    ])
      assert.equal((await fetch(url + path)).status, 401, path);
    assert.equal((await fetch(url + "/")).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
