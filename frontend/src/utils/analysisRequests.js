// Session-only results: no network requests occur when reading this cache.
const results = new Map();
const pending = new Map();
const MAX_RESULTS = 50;

export const getAnalysis = (key) => results.get(key) || null;
export function saveAnalysis(key, data) {
  const result = {
    data,
    completedAt: data?.analysis?.generatedAt
      ? new Date(data.analysis.generatedAt).toISOString()
      : new Date().toISOString(),
  };
  results.delete(key);
  results.set(key, result);
  if (results.size > MAX_RESULTS) results.delete(results.keys().next().value);
  return result;
}

export function requestAnalysis(key, run) {
  if (pending.has(key)) return pending.get(key);
  const promise = Promise.resolve()
    .then(run)
    .then((data) => {
      return saveAnalysis(key, data);
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}
