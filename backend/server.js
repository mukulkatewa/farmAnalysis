import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";
import { requestContext } from "./src/utils/requestContext.js";
import { authenticate } from "./src/middleware/auth.js";
import { route } from "./src/utils/errors.js";
import {
  createAnalysis,
  latestAnalysis,
} from "./src/controllers/analysis.controller.js";
import { sendNotification } from "./src/controllers/notification.controller.js";
import {
  directory,
  publicProfile,
} from "./src/controllers/directory.controller.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js";
import predictRoutes from "./src/routes/predict.js";
import pestRoutes from "./src/routes/pest.js";
import fieldRoutes from "./src/routes/field.js";
import aiRoutes from "./src/routes/ai.js";
import reportRoutes from "./src/routes/report.js";
// Load environment variables
dotenv.config();

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 5000;

// Middleware
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  const started = Date.now();
  res.on("finish", () =>
    console.info(
      JSON.stringify({
        event: "http",
        requestId: req.requestId,
        method: req.method,
        status: res.statusCode,
        durationMs: Date.now() - started,
      }),
    ),
  );
  requestContext.run({ requestId: req.requestId }, next);
});
app.use(
  cors({
    origin: [
      "https://frontend-taupe-rho-64.vercel.app",
      "http://localhost:5173",
      ...(process.env.CORS_ORIGINS || "").split(",").filter(Boolean),
    ],
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "32kb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", authenticate);
app.get("/api/directory", route(directory));
app.get("/api/public-profile/:id", route(publicProfile));
app.use("/api/user", userRoutes);
app.use("/api/disease", predictRoutes);
app.use("/api/pest", pestRoutes);
app.use("/field", authenticate, fieldRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/report", reportRoutes);
app.get("/api/analyses/:kind", route(latestAnalysis));
app.post("/api/analyses/:kind", route(createAnalysis));
app.post(
  "/api/analyze-ndvi",
  (req, res, next) => {
    req.params.kind = "vegetation";
    next();
  },
  route(createAnalysis),
);
app.post("/api/notifications", route(sendNotification));
// Health check
app.get("/", (req, res) => {
  res.json({ message: "AgriVision API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (res.headersSent) return res.end();
  const status =
    err.code === "LIMIT_FILE_SIZE"
      ? 413
      : err.name === "MulterError"
        ? 400
        : err.name === "TimeoutError" || err.name === "AbortError"
          ? 504
          : err.status || 500;
  console.error(
    JSON.stringify({
      event: "error",
      requestId: req.requestId,
      status,
      code: err.code || err.name,
    }),
  );
  if (status === 429) res.setHeader("Retry-After", "60");
  res.status(status).json({
    error:
      status < 500
        ? err.message
        : status === 504
          ? "Provider request timed out. Check saved results before retrying."
          : "Service unavailable. Please try later.",
    requestId: req.requestId,
  });
});

// Start server (only in development, not on Vercel)
if (!["production", "test"].includes(process.env.NODE_ENV)) {
  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  server.requestTimeout = 180000;
  server.headersTimeout = 15000;
}

// Export for Vercel serverless
export default app;
