import { db } from "../config/firebase.js";
import { createAnalysisStore, VERSION } from "./analysisStore.js";
import { geometry, documentId, hash } from "../utils/geometry.js";
import { HttpError } from "../utils/errors.js";
import { isGuestIdentity } from '../utils/identity.js';
export const store = createAnalysisStore(db);
export async function ownedField(uid, id) {
  documentId(id);
  const snap = await db
    .collection("users")
    .doc(uid)
    .collection("fields")
    .doc(id)
    .get();
  if (!snap.exists) throw new HttpError(404, "Field not found");
  return { ...snap.data(), id };
}
export const analysisKey = (kind, field, geo, params = {}) =>
  hash({
    kind,
    fieldId: field?.id || null,
    geometryHash: geo?.geometryHash || null,
    version: VERSION,
    params,
  });
export async function fieldContext(req, kind, params = {}) {
  const field = await ownedField(
    req.user.uid,
    req.body?.fieldId || req.query.fieldId,
  );
  const geo = geometry(field);
  return { field, geo, key: analysisKey(kind, field, geo, params) };
}
export async function runPaid(req, context, kind, input, work) {
  const saved = await store.execute(
    {
      uid: req.user.uid,
      isGuest: isGuestIdentity(req.user),
      key: context.key,
      kind,
      fieldId: context.field?.id || null,
      geometryHash: context.geo?.geometryHash || null,
      input,
      idempotencyKey: req.get("Idempotency-Key"),
      refresh: req.body?.refresh === true,
    },
    work,
  );
  return { ...saved.result, analysis: saved.meta };
}
