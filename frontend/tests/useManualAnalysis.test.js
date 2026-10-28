import test from "node:test";
import assert from "node:assert/strict";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import { useManualAnalysis } from "../src/hooks/useManualAnalysis.js";
const dom = new JSDOM('<div id="root"></div>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function Controls({ field, run, load }) {
  const result = useManualAnalysis(field, run, load);
  return React.createElement(
    "div",
    null,
    React.createElement(
      "button",
      { onClick: () => result.analyze(), disabled: result.loading },
      "Analyze",
    ),
    React.createElement("span", null, result.data || result.error || "empty"),
  );
}
test("mount and field switches read saved data only; late old responses do not overwrite the new field", async () => {
  const root = createRoot(document.getElementById("root"));
  let calls = 0,
    oldResolve;
  const run = async () => {
    calls++;
    return "inference";
  };
  await act(async () =>
    root.render(
      React.createElement(Controls, {
        field: "hook-A",
        run,
        load: () =>
          new Promise((resolve) => {
            oldResolve = resolve;
          }),
      }),
    ),
  );
  await act(async () =>
    root.render(
      React.createElement(Controls, {
        field: "hook-B",
        run,
        load: async () => "B saved",
      }),
    ),
  );
  assert.match(document.body.textContent, /B saved/);
  await act(async () => oldResolve("A late"));
  assert.match(document.body.textContent, /B saved/);
  assert.equal(calls, 0);
  await act(async () => root.unmount());
});
test("only a click starts inference; repeated clicks coalesce and failure can be retried", async () => {
  const root = createRoot(document.getElementById("root"));
  let calls = 0,
    finish;
  const run = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  await act(async () =>
    root.render(React.createElement(Controls, { field: "hook-click", run })),
  );
  assert.equal(calls, 0);
  await act(async () => {
    document.querySelector("button").click();
    document.querySelector("button").click();
  });
  assert.equal(calls, 1);
  await act(async () => finish("finished"));
  assert.match(document.body.textContent, /finished/);
  let failed = true;
  const retry = async () => {
    if (failed) {
      failed = false;
      throw new Error("offline");
    }
    return "retried";
  };
  await act(async () =>
    root.render(
      React.createElement(Controls, { field: "hook-failure", run: retry }),
    ),
  );
  await act(async () => document.querySelector("button").click());
  assert.match(document.body.textContent, /offline/);
  await act(async () => document.querySelector("button").click());
  assert.match(document.body.textContent, /retried/);
  await act(async () => root.unmount());
});
