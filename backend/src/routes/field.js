import express from "express";
import { processRegion } from "../controllers/field.controller.js";
import { route } from "../utils/errors.js";
const router = express.Router();
router.post("/process-region", route(processRegion));
export default router;
