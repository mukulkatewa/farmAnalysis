import { auth } from "../firebase/firebase";
import { API_BASE } from "./endpoints";
export async function authenticatedFetch(url, options = {}) {
  if (!auth?.currentUser) throw new Error("Please sign in again.");
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await auth.currentUser.getIdToken()}`);
  if (options.method && options.method !== "GET")
    headers.set(
      "Idempotency-Key",
      options.idempotencyKey || crypto.randomUUID(),
    );
  const response = await fetch(url, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(150000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Request failed (${response.status})`);
  }
  return response;
}
export async function fieldAnalysis(
  kind,
  fieldId,
  { read = false, refresh = false } = {},
) {
  const url = `${API_BASE}/api/analyses/${kind}${read ? `?fieldId=${encodeURIComponent(fieldId)}` : ""}`;
  const response = await authenticatedFetch(
    url,
    read
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldId, refresh }),
        },
  );
  return response.json();
}
