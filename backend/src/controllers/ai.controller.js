import { fieldContext, runPaid, store } from "../services/analysis.js";
import { hash } from "../utils/geometry.js";
import { HttpError } from "../utils/errors.js";
import { language } from "../services/language.js";
export const generateAIResponse = async (req, res) => {
  const message = req.body.message;
  if (typeof message !== "string" || !message.trim() || message.length > 4000)
    throw new HttpError(400, "Message must be 1–4000 characters");
  res.json(
    await runPaid(
      req,
      { key: hash({ kind: "chat", message }) },
      "chat",
      { message },
      async () => ({ response: await language(message) }),
    ),
  );
};
export const generateAlertDescriptions = async (req, res) => {
  const period = req.body.period;
  if (!["day_1", "day_7", "day_14"].includes(period))
    throw new HttpError(400, "Invalid forecast period");
  const ctx = await fieldContext(req, "forecast"),
    snapshot = await store.latest(req.user.uid, ctx.key);
  if (!snapshot || snapshot.meta.stale)
    throw new HttpError(
      409,
      "Run a fresh forecast before requesting explanations",
    );
  const input = { forecastId: snapshot.meta.id, period };
  const context = { ...ctx, key: hash({ kind: "explanation", ...input }) };
  res.json(
    await runPaid(req, context, "explanation", input, async () => {
      const data = snapshot.result.data,
        metrics = data.forecast[period];
      const descriptions = await language(
        `Return a JSON object with exactly these string keys: ndvi, moisture, diseaseRisk, pestRisk, stressIndex. Explain each in one short sentence. Missing values must say unavailable. Risk values are scores on a 0-100 scale, not calibrated probabilities. Data: ${JSON.stringify({ metrics, stressIndex: data.stress_index })}`,
        true,
      );
      for (const key of [
        "ndvi",
        "moisture",
        "diseaseRisk",
        "pestRisk",
        "stressIndex",
      ])
        if (
          typeof descriptions[key] !== "string" ||
          descriptions[key].length > 1000
        )
          throw new HttpError(502, "Invalid explanation schema");
      return { success: true, descriptions };
    }),
  );
};
export const generateInsight = async (req, res) => {
  const ctx = await fieldContext(req, "analytics"),
    snapshot = await store.latest(req.user.uid, ctx.key);
  if (!snapshot || snapshot.meta.stale)
    throw new HttpError(409, "Generate fresh analytics first");
  const section = req.body.section;
  if (!["water", "stress", "health", "disease"].includes(section))
    throw new HttpError(400, "Invalid insight section");
  const input = { snapshotId: snapshot.meta.id, section };
  res.json(
    await runPaid(
      req,
      { ...ctx, key: hash({ kind: "insight", ...input }) },
      "insight",
      input,
      async () => ({
        insight: await language(
          `Give two short observations about ${section} from the latest 30 CSV rows. Distinguish measured and estimated values. Do not diagnose disease. CSV: ${snapshot.result.csv.split("\n").slice(-30).join("\n").slice(0, 14000)}`,
        ),
      }),
    ),
  );
};
