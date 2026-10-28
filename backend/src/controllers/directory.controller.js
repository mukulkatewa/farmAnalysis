import { db } from "../config/firebase.js";
import { documentId } from "../utils/geometry.js";
export async function publicProfile(req, res) {
  const id = documentId(req.params.id, "user ID");
  const snap = await db.collection("users").doc(id).get(),
    data = snap.data() || {};
  res.json({
    displayName:
      [data.firstName, data.lastName].filter(Boolean).join(" ") || "User",
    userType: data.userType === "vendor" ? "vendor" : "farmer",
  });
}
export async function directory(req, res) {
  const snapshot = await db
    .collection("users")
    .where("directoryOptIn", "==", true)
    .limit(100)
    .get();
  res.json(
    snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        firstName: d.firstName || "Farmer",
        lastName: d.lastName || "",
        // Generalized location only; no account email, phone, address or sensor data.
        location:
          d.location &&
          Number.isFinite(d.location.latitude) &&
          Number.isFinite(d.location.longitude)
            ? {
                latitude: Math.round(d.location.latitude * 100) / 100,
                longitude: Math.round(d.location.longitude * 100) / 100,
              }
            : null,
      };
    }),
  );
}
