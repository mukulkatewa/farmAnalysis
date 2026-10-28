// Model contract: score from 0 to 100; missing is never a measured zero.
export function riskScore(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !["number", "string"].includes(typeof value)
  )
    return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}
