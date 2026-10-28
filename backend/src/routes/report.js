import express from "express";
import { generateReport } from "../controllers/report.controller.js";
import { route } from "../utils/errors.js";
const router = express.Router();
router.post("/generate", route(generateReport));
export default router;
