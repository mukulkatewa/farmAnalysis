import { HttpError } from "../utils/errors.js";
import { GoogleAuth } from "google-auth-library";
import { requestContext } from "../utils/requestContext.js";
const cloudAuth = new GoogleAuth();
async function performRequest(url, options = {}, type = "json") {
  if (
    process.env.CLOUD_RUN_AUTH === "true" &&
    new URL(url).hostname.endsWith(".run.app")
  ) {
    const client = await cloudAuth.getIdTokenClient(new URL(url).origin);
    const authHeaders = await client.getRequestHeaders();
    options = {
      ...options,
      headers: {
        ...Object.fromEntries(new Headers(options.headers)),
        ...Object.fromEntries(authHeaders),
      },
    };
  }
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: options.signal || AbortSignal.timeout(60000),
  });
  if (!response.ok)
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "Provider usage limit reached. Try later."
        : "Analysis provider unavailable.",
    );
  const max = type === "buffer" ? 8 * 1024 * 1024 : 4 * 1024 * 1024;
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > max) {
      await response.body.cancel().catch(() => {});
      throw new HttpError(502, "Provider response too large");
    }
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  if (type === "buffer") return buffer;
  if (type === "text") return buffer.toString("utf8");
  try {
    return JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new HttpError(502, "Invalid provider response");
  }
}
export const jsonOptions = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export async function providerRequest(url, options = {}, type = "json") {
  const started = Date.now();
  let status = 200;
  try {
    return await performRequest(url, options, type);
  } catch (error) {
    status = error.status || (error.name === "TimeoutError" ? 504 : 502);
    throw error;
  } finally {
    console.info(
      JSON.stringify({
        event: "provider",
        requestId: requestContext.getStore()?.requestId,
        host: new URL(url).hostname,
        status,
        durationMs: Date.now() - started,
      }),
    );
  }
}
