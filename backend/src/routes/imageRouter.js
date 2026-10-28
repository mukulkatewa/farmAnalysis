import express from "express";
import multer from "multer";
import { hash } from "../utils/geometry.js";
import { validateImage } from "../utils/images.js";
import { route } from "../utils/errors.js";
import { runPaid } from "../services/analysis.js";
import { providerRequest } from "../services/http.js";
export function imageRouter(kind, env, fallback, path) {
  const router = express.Router(),
    upload = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
    });
  router.post(
    "/predict",
    upload.single("file"),
    route(async (req, res) => {
      const mime = validateImage(req.file),
        input = hash(req.file.buffer.toString("base64"));
      const result = await runPaid(
        req,
        { key: hash({ kind, input }) },
        kind,
        { input },
        async () => {
          const body = new FormData();
          body.append(
            "file",
            new Blob([req.file.buffer], { type: mime }),
            mime === "image/png" ? "image.png" : "image.jpg",
          );
          return providerRequest(`${process.env[env] || fallback}${path}`, {
            method: "POST",
            body,
          });
        },
      );
      res.json(result);
    }),
  );
  return router;
}
