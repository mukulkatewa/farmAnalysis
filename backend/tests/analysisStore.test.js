import test from "node:test";
import assert from "node:assert/strict";
import {
  createAnalysisStore,
  reserveUsage,
} from "../src/services/analysisStore.js";
import { memoryFirestore } from "./memoryFirestore.js";
const input = (extra = {}) => ({
  uid: "alice",
  key: "field-geometry-version",
  kind: "forecast",
  input: {},
  idempotencyKey: "12345678-1234-1234-1234-123456789012",
  ...extra,
});
test("quota and concurrency caps fail closed, expired leases release concurrency", () => {
  assert.throws(() => reserveUsage({ used: 20 }, 0, "id", 20, 2), {
    status: 429,
  });
  assert.throws(
    () =>
      reserveUsage(
        { used: 1, active: { first: 10, second: 10 } },
        0,
        "id",
        20,
        2,
      ),
    { status: 429 },
  );
  assert.equal(
    reserveUsage({ used: 1, active: { old: 1 } }, 2, "id", 20, 1).used,
    2,
  );
});
test("result survives a new store instance and is owner-scoped", async () => {
  const db = memoryFirestore(),
    store = createAnalysisStore(db);
  const saved = await store.execute(input(), async () => ({
    forecast: "saved",
  }));
  assert.equal(
    (await createAnalysisStore(db).latest("alice", input().key)).result
      .forecast,
    "saved",
  );
  assert.equal(await store.latest("bob", input().key), null);
  assert.equal(await store.read("bob", saved.meta.id), null);
});
test("idempotency, fresh-result reuse and explicit refresh avoid duplicate charges", async () => {
  const db = memoryFirestore(),
    store = createAnalysisStore(db);
  let calls = 0;
  const work = async () => ({ calls: ++calls });
  const first = await store.execute(input(), work);
  assert.equal((await store.execute(input(), work)).meta.id, first.meta.id);
  assert.equal(
    (
      await store.execute(
        input({ idempotencyKey: "other-request-000001" }),
        work,
      )
    ).meta.id,
    first.meta.id,
  );
  await store.execute(
    input({ idempotencyKey: "other-request-000002", refresh: true }),
    work,
  );
  assert.equal(calls, 2);
  const global = [...db.docs.entries()].find(([k]) => k.endsWith("_global"))[1];
  assert.equal(global.used, 2);
  assert.deepEqual(global.active, {});
  await assert.rejects(
    store.execute(input({ input: { changed: true } }), work),
    { status: 409 },
  );
});
test("simultaneous requests for the same geometry cannot both start work", async () => {
  const store = createAnalysisStore(memoryFirestore());
  let finish;
  let started;
  const ready = new Promise((resolve) => {
    started = resolve;
  });
  const first = store.execute(input(), () => {
    started();
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  await ready;
  await assert.rejects(
    store.execute(input({ idempotencyKey: "parallel-request-001" }), async () =>
      assert.fail("duplicate provider call"),
    ),
    { status: 409 },
  );
  finish({ ok: true });
  await first;
});
test("failed work is charged once and cannot silently replay with the same key", async () => {
  const db = memoryFirestore(),
    store = createAnalysisStore(db);
  await assert.rejects(
    store.execute(input(), async () => {
      throw new Error("timeout");
    }),
    /timeout/,
  );
  await assert.rejects(
    store.execute(input(), async () => assert.fail("duplicate")),
    { status: 409 },
  );
  assert.equal(
    (
      await store.execute(
        input({ idempotencyKey: "explicit-retry-00001" }),
        async () => ({ ok: true }),
      )
    ).result.ok,
    true,
  );
});
test("large payloads are split below Firestore document size limits", async () => {
  const store = createAnalysisStore(memoryFirestore()),
    data = "x".repeat(1200000);
  assert.equal(
    (await store.execute(input(), async () => ({ data }))).result.data.length,
    data.length,
  );
});
