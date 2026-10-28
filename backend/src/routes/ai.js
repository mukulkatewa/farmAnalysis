import express from "express";
import {
  generateAIResponse,
  generateAlertDescriptions,
  generateInsight,
} from "../controllers/ai.controller.js";
import { route } from "../utils/errors.js";
const router = express.Router();
router.post("/generate", route(generateAIResponse));
router.post("/alert-descriptions", route(generateAlertDescriptions));
router.post("/insight", route(generateInsight));
export default router;
