import { fieldContext, runPaid, store } from "../services/analysis.js";
import { providerRequest, jsonOptions } from "../services/http.js";
import { analyzeVegetation } from "../services/vegetation.js";
import { HttpError } from "../utils/errors.js";
export function analysisKind(kind) {
  if (!["forecast", "analytics", "vegetation"].includes(kind))
    throw new HttpError(400, "Invalid analysis type");
  return kind;
}
export async function latestAnalysis(req, res) {
  const kind = analysisKind(req.params.kind),
    ctx = await fieldContext(req, kind);
  const saved = await store.latest(req.user.uid, ctx.key);
  res.json(saved ? { ...saved.result, analysis: saved.meta } : null);
}
export async function createAnalysis(req, res) {
  const kind = analysisKind(
    req.params.kind || (req.path === "/analyze-ndvi" ? "vegetation" : ""),
  );
  const ctx = await fieldContext(req, kind);
  const result = await runPaid(req, ctx, kind, {}, async () => {
    if (kind === "vegetation") return analyzeVegetation(ctx.geo);
    const url =
      kind === "forecast"
        ? `${process.env.LSTM_API_URL || "https://lstm-alerts-405376924767.us-central1.run.app"}/predict`
        : `${process.env.COLLECTOR_API_URL || "https://collector-api-405376924767.us-central1.run.app"}/generate_data`;
    const payload = {
      lat: ctx.geo.lat,
      lon: ctx.geo.lng,
      field_name: ctx.field.fieldName || ctx.field.name || ctx.field.id,
    };
    const data = await providerRequest(
      url,
      jsonOptions(payload),
      kind === "analytics" ? "text" : "json",
    );
    if (kind === "analytics") {
      const rows = data.trim().split(/\r?\n/);
      if (
        rows.length < 2 ||
        rows.length > 6000 ||
        !rows[0]
          .split(",")
          .map((h) => h.trim())
          .includes("date")
      )
        throw new HttpError(502, "Invalid analytics CSV contract");
      return { csv: data };
    }
    if (!data.success || !data.data?.forecast)
      throw new HttpError(502, "Invalid forecast provider response");
    // Contract: risk scores are percentages on a 0–100 scale, never inferred from NDVI.
    for (const day of ["day_1", "day_7", "day_14"]) {
      const p = data.data.forecast[day];
      if (!p || typeof p !== "object" || Array.isArray(p))
        throw new HttpError(502, "Missing forecast period");
      for (const key of ["disease_risk", "pest_risk"]) {
        p[key] ??=
          p[key === "disease_risk" ? "diseaseRisk" : "pestRisk"] ?? null;
        if (p[key] === null || p[key] === undefined) continue;
        const v = Number(p[key]);
        if (
          p[key] === "" ||
          !["number", "string"].includes(typeof p[key]) ||
          !Number.isFinite(v) ||
          v < 0 ||
          v > 100
        )
          throw new HttpError(502, "Invalid forecast risk scale");
        p[key] = v;
      }
    }
    return { success: true, data: data.data, riskScale: "percent-0-100" };
  });
  res.json(result);
}
