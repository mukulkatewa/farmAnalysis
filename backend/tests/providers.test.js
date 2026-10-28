import test from "node:test";
import assert from "node:assert/strict";
import { providerRequest } from "../src/services/http.js";
import { notificationContact } from "../src/utils/contacts.js";
test("provider requests have deadlines, reject errors, and do not disclose provider bodies", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.ok(options.signal instanceof AbortSignal);
      return new Response(JSON.stringify({ ok: true }));
    };
    assert.deepEqual(await providerRequest("https://example.com"), {
      ok: true,
    });
    globalThis.fetch = async () =>
      new Response("private provider detail", { status: 429 });
    await assert.rejects(
      providerRequest("https://example.com"),
      (error) => error.status === 429 && !error.message.includes("private"),
    );
    globalThis.fetch = async () => new Response("not JSON");
    await assert.rejects(providerRequest("https://example.com"), {
      status: 502,
    });
    globalThis.fetch = async () =>
      new Response("x".repeat(4 * 1024 * 1024 + 1));
    await assert.rejects(providerRequest("https://example.com"), {
      status: 502,
    });
  } finally {
    globalThis.fetch = original;
  }
});
test("notification recipients come from verified identity, never a mutable profile alone", () => {
  assert.throws(
    () =>
      notificationContact(
        { email: "unverified@example.com" },
        { phone: "+12345678901" },
      ),
    { status: 400 },
  );
  assert.deepEqual(
    notificationContact(
      { email_verified: true, email: "verified@example.com" },
      { email: "attacker@example.com", phone: "+12345678901" },
    ),
    { email: "verified@example.com", phone: null },
  );
  assert.deepEqual(
    notificationContact(
      { phone_number: "+12345678901" },
      { phone: "+12345678901" },
    ),
    { email: null, phone: "+12345678901" },
  );
});
