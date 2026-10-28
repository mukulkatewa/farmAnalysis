import express from "express";
import { getProfile, updateProfile } from "../controllers/user.js";
import { route } from "../utils/errors.js";
const router = express.Router();
router.get("/profile", route(getProfile));
router.put("/update", route(updateProfile));
export default router;
