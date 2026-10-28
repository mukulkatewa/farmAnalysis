import test from "node:test";
import assert from "node:assert/strict";
import { getAnalysis, requestAnalysis } from "../src/utils/analysisRequests.js";
import React from "react";
import { renderToString } from "react-dom/server";
import { useManualAnalysis } from "../src/hooks/useManualAnalysis.js";

test("rendering analysis controls with missing or cached data never runs inference", async () => {
  let calls = 0;
  const run = async () => {
    calls++;
    return "unexpected";
  };
  function Controls({ field }) {
    const analysis = useManualAnalysis(field, run);
    return React.createElement(
      "button",
      { onClick: analysis.analyze },
      analysis.data || "Analyze",
    );
  }
  assert.match(
    renderToString(React.createElement(Controls, { field: "render-empty" })),
    /Analyze/,
  );
  await requestAnalysis("render-cached", async () => "Saved result");
  assert.match(
    renderToString(React.createElement(Controls, { field: "render-cached" })),
    /Saved result/,
  );
  assert.equal(calls, 0);
});

test("reading missing results never starts work", () => {
  assert.equal(getAnalysis("unseen-field"), null);
});

test("concurrent clicks share one request, completed results remain readable", async () => {
  let calls = 0;
  let finish;
  const run = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = requestAnalysis("same-field", run);
  const second = requestAnalysis("same-field", run);
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  finish({ forecast: 12 });
  const result = await first;
  assert.equal(getAnalysis("same-field"), result);
  assert.ok(Date.parse(result.completedAt));
});

test("different users, fields and indices keep separate results", async () => {
  for (const key of [
    "user1-field1-NDVI",
    "user2-field1-NDVI",
    "user1-field2-NDVI",
    "user1-field1-EVI",
  ]) {
    await requestAnalysis(key, async () => key);
    assert.equal(getAnalysis(key).data, key);
  }
});

test("failure releases the request and an explicit retry succeeds", async () => {
  await assert.rejects(
    requestAnalysis("retry", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
  assert.equal(getAnalysis("retry"), null);
  assert.equal((await requestAnalysis("retry", async () => "ok")).data, "ok");
});

test("explicit reanalysis replaces a saved result", async () => {
  await requestAnalysis("refresh", async () => "old");
  await requestAnalysis("refresh", async () => "new");
  assert.equal(getAnalysis("refresh").data, "new");
});
