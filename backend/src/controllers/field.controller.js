import { db } from "../config/firebase.js";
import { ownedField } from "../services/analysis.js";
import { geometry } from "../utils/geometry.js";
export const processRegion = async (req, res) => {
  const field = await ownedField(req.user.uid, req.body.fieldId);
  const geo = geometry({ coordinates: req.body.polygon_coords });
  await db
    .collection("users")
    .doc(req.user.uid)
    .collection("fields")
    .doc(field.id)
    .update({
      coordinates: req.body.polygon_coords,
      lat: geo.lat,
      lng: geo.lng,
      geometryHash: geo.geometryHash,
      updatedAt: new Date().toISOString(),
    });
  res.json({
    centroid: { lat: geo.lat, lng: geo.lng },
    geometryHash: geo.geometryHash,
  });
};
