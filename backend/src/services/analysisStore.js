import { randomUUID } from "node:crypto";
import { hash } from "../utils/geometry.js";
import { HttpError } from "../utils/errors.js";

export const VERSION = "field-analysis-v3-masked-reflectance";
export const TTL = 24 * 60 * 60 * 1000;
const LEASE = 5 * 60 * 1000;
const limit = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`Invalid ${name}`);
  return value;
};
export function reserveUsage(state, now, id, dailyLimit, concurrency) {
  const active = Object.fromEntries(
    Object.entries(state.active || {}).filter(([, until]) => until > now),
  );
  if (
    (state.used || 0) >= dailyLimit ||
    Object.keys(active).length >= concurrency
  )
    throw new HttpError(429, "Analysis usage limit reached. Try later.");
  return {
    used: (state.used || 0) + 1,
    active: { ...active, [id]: now + LEASE },
  };
}
export function createAnalysisStore(db) {
  const user = (uid) => db.collection("users").doc(uid);
  async function read(uid, id) {
    const ref = user(uid).collection("analysisRuns").doc(id),
      snap = await ref.get();
    if (!snap.exists || snap.data().status !== "complete") return null;
    const meta = snap.data();
    const parts = await Promise.all(
      Array.from({ length: meta.parts }, (_, i) =>
        ref.collection("parts").doc(String(i)).get(),
      ),
    );
    if (parts.some((p) => !p.exists))
      throw new HttpError(503, "Saved result is incomplete");
    const result = JSON.parse(
      Buffer.from(
        parts.map((p) => p.data().data).join(""),
        "base64",
      ).toString(),
    );
    return {
      result,
      meta: {
        id,
        kind: meta.kind,
        fieldId: meta.fieldId,
        geometryHash: meta.geometryHash,
        version: meta.version,
        generatedAt: meta.generatedAt,
        expiresAt: meta.expiresAt,
        stale: Date.now() > meta.expiresAt,
      },
    };
  }
  async function latest(uid, key) {
    const snap = await user(uid).collection("analysisKeys").doc(key).get();
    return snap.data()?.lastId ? read(uid, snap.data().lastId) : null;
  }
  async function execute(
    {
      uid,
      isGuest = false,
      key,
      kind,
      fieldId = null,
      geometryHash = null,
      input,
      idempotencyKey,
      refresh = false,
    },
    work,
  ) {
    if (!/^[\w-]{16,128}$/.test(idempotencyKey || ""))
      throw new HttpError(400, "Idempotency-Key header required");
    const now = Date.now(),
      day = new Date(now).toISOString().slice(0, 10),
      id = randomUUID();
    const keyRef = user(uid).collection("analysisKeys").doc(key);
    const requestRef = user(uid)
      .collection("analysisRequests")
      .doc(hash(idempotencyKey));
    const runRef = user(uid).collection("analysisRuns").doc(id);
    const userUsage = db.collection("analysisUsage").doc(`${day}_${hash(uid)}`),
      globalUsage = db.collection("analysisUsage").doc(`${day}_global`);
    const guestUsage = db.collection('analysisUsage').doc(`${day}_guests`);
    const fingerprint = hash({ key, input, refresh });
    const decision = await db.runTransaction(async (tx) => {
      const [keySnap, requestSnap, u, g, guest] = await Promise.all([
        tx.get(keyRef),
        tx.get(requestRef),
        tx.get(userUsage),
        tx.get(globalUsage),
        ...(isGuest ? [tx.get(guestUsage)] : []),
      ]);
      const previous = requestSnap.data(),
        saved = keySnap.data() || {};
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new HttpError(
            409,
            "Request key was already used with different inputs",
          );
        if (previous.status === "complete") return previous.id;
        throw new HttpError(
          409,
          "Request is running or already attempted. Check saved results before retrying.",
        );
      }
      if (!refresh && saved.lastId && saved.expiresAt > now) {
        tx.set(requestRef, {
          fingerprint,
          status: "complete",
          id: saved.lastId,
        });
        return saved.lastId;
      }
      if (saved.leaseUntil > now)
        throw new HttpError(
          409,
          "An analysis of these inputs is already running",
        );
      const nextU = reserveUsage(
        u.data() || {},
        now,
        id,
        isGuest ? limit('ANALYSIS_GUEST_DAILY_LIMIT',3) : limit("ANALYSIS_USER_DAILY_LIMIT", 20),
        isGuest ? 1 : limit("ANALYSIS_USER_CONCURRENCY", 2),
      );
      const nextG = reserveUsage(
        g.data() || {},
        now,
        id,
        limit("ANALYSIS_GLOBAL_DAILY_LIMIT", 500),
        limit("ANALYSIS_GLOBAL_CONCURRENCY", 10),
      );
      tx.set(userUsage, nextU);
      tx.set(globalUsage, nextG);
      if(isGuest) tx.set(guestUsage,reserveUsage(guest?.data() || {},now,id,limit('ANALYSIS_GUEST_GLOBAL_DAILY_LIMIT',50),limit('ANALYSIS_GUEST_GLOBAL_CONCURRENCY',3)));
      tx.set(keyRef, { ...saved, runningId: id, leaseUntil: now + LEASE });
      tx.set(requestRef, { fingerprint, status: "running", id });
      tx.set(runRef, {
        kind,
        fieldId,
        geometryHash,
        version: VERSION,
        status: "running",
        startedAt: now,
      });
      return null;
    });
    if (decision) return read(uid, decision);
    const started = Date.now();
    let succeeded = false;
    try {
      const result = await work();
      const encoded = Buffer.from(JSON.stringify(result)).toString("base64");
      if (encoded.length > 8 * 1024 * 1024)
        throw new HttpError(502, "Analysis result exceeds storage limit");
      const chunks = encoded.match(/.{1,400000}/g) || [];
      const batch = db.batch();
      chunks.forEach((data, i) =>
        batch.set(runRef.collection("parts").doc(String(i)), { data }),
      );
      await batch.commit();
      const generatedAt = Date.now(),
        expiresAt = generatedAt + TTL;
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(keyRef);
        if (snap.data()?.runningId !== id)
          throw new HttpError(409, "Analysis lease expired");
        tx.update(runRef, {
          status: "complete",
          generatedAt,
          expiresAt,
          parts: chunks.length,
        });
        tx.update(keyRef, {
          lastId: id,
          expiresAt,
          leaseUntil: 0,
          runningId: null,
        });
        tx.update(requestRef, { status: "complete" });
      });
      succeeded = true;
      return read(uid, id);
    } catch (error) {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(keyRef);
        tx.set(runRef, { status: "failed" }, { merge: true });
        tx.set(requestRef, { status: "failed" }, { merge: true });
        if (snap.data()?.runningId === id)
          tx.update(keyRef, { leaseUntil: 0, runningId: null });
      });
      throw error;
    } finally {
      await db.runTransaction(async (tx) => {
        const [u, g, guest] = await Promise.all([
          tx.get(userUsage),
          tx.get(globalUsage),
          ...(isGuest ? [tx.get(guestUsage)] : []),
        ]);
        for (const [ref, snap] of [
          [userUsage, u],
          [globalUsage, g],
          ...(isGuest ? [[guestUsage,guest]] : []),
        ]) {
          const data = snap.data();
          if (data) {
            delete data.active[id];
            tx.set(ref, data);
          }
        }
      });
      console.info(
        JSON.stringify({
          event: "analysis",
          kind,
          requestId: id,
          durationMs: Date.now() - started,
          status: succeeded ? "complete" : "failed",
        }),
      );
    }
  }
  return { execute, latest, read };
}
