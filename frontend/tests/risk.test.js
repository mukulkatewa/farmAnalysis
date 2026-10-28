import test from "node:test";
import assert from "node:assert/strict";
import { riskScore } from "../src/utils/risk.js";
test("model risk preserves zero, percentage scale, and missing values", () => {
  assert.equal(riskScore(0), 0);
  assert.equal(riskScore("65.2"), 65.2);
  for (const value of [null, undefined, "", false, NaN, -1, 101, "unknown"])
    assert.equal(riskScore(value), null);
});
