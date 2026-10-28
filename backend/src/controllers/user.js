import { db } from "../config/firebase.js";
import { HttpError } from "../utils/errors.js";
const profile = (data) =>
  Object.fromEntries(
    [
      "firstName",
      "lastName",
      "email",
      "phone",
      "farmAddress",
      "acres",
      "directoryOptIn",
    ].map((k) => [k, data[k] ?? (k === "directoryOptIn" ? false : "")]),
  );
export const getProfile = async (req, res) => {
  const snap = await db.collection("users").doc(req.user.uid).get();
  res.json({ user: profile({ ...snap.data(), email: req.user.email || "" }) });
};
export const updateProfile = async (req, res) => {
  const data = { updatedAt: new Date().toISOString() };
  for (const key of ["firstName", "lastName", "farmAddress", "phone", "acres"])
    if (req.body[key] !== undefined) {
      if (
        !["string", "number"].includes(typeof req.body[key]) ||
        String(req.body[key]).length > 300
      )
        throw new HttpError(400, `Invalid ${key}`);
      data[key] = String(req.body[key]);
    }
  if (req.body.directoryOptIn !== undefined) {
    if (typeof req.body.directoryOptIn !== "boolean")
      throw new HttpError(400, "Invalid directory consent");
    data.directoryOptIn = req.body.directoryOptIn;
  }
  await db.collection("users").doc(req.user.uid).set(data, { merge: true });
  return getProfile(req, res);
};
