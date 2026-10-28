import { db } from "../config/firebase.js";
import { fieldContext, store, runPaid } from "../services/analysis.js";
import { hash } from "../utils/geometry.js";
import { HttpError } from "../utils/errors.js";
import { providerRequest, jsonOptions } from "../services/http.js";
import { notificationContact } from "../utils/contacts.js";
export async function sendNotification(req, res) {
  if (req.body.consent !== true)
    throw new HttpError(400, "Notification consent is required");
  const period = req.body.period;
  if (!["day_1", "day_7", "day_14"].includes(period))
    throw new HttpError(400, "Invalid forecast period");
  const url = process.env.NOTIFICATION_WEBHOOK_URL,
    secret = process.env.NOTIFICATION_WEBHOOK_SECRET;
  if (!url?.startsWith("https://") || !secret)
    throw new HttpError(503, "Notification delivery is not configured");
  const ctx = await fieldContext(req, "forecast"),
    saved = await store.latest(req.user.uid, ctx.key);
  if (!saved || saved.meta.stale)
    throw new HttpError(
      409,
      "Generate a fresh forecast before sending notifications",
    );
  const profile =
    (await db.collection("users").doc(req.user.uid).get()).data() || {};
  const contact = notificationContact(req.user, profile);
  const input = { snapshotId: saved.meta.id, period, contact };
  const result = await runPaid(
    req,
    { ...ctx, key: hash({ kind: "notification", ...input }) },
    "notification",
    input,
    async () => {
      await providerRequest(
        url,
        {
          ...jsonOptions({
            body: {
              name:
                [profile.firstName, profile.lastName]
                  .filter(Boolean)
                  .join(" ") || "Farmer",
              ...contact,
              message: `Field ${ctx.field.fieldName || ctx.field.id}, ${period}: ${JSON.stringify(saved.result.data.forecast[period])}`,
            },
          }),
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${secret}`,
          },
        },
        "text",
      );
      return {
        success: true,
        deliveryStatus: "accepted",
        acceptedAt: new Date().toISOString(),
      };
    },
  );
  res.status(202).json(result);
}
