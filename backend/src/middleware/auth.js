import { auth } from "../config/firebase.js";
import { createAuthenticate } from "./authFactory.js";
export const authenticate = createAuthenticate((token) =>
  auth.verifyIdToken(token, true),
);
export const authorize =
  (...roles) =>
  (req, res, next) =>
    !req.user
      ? res.status(401).json({ error: "Authentication required" })
      : roles.length && !roles.includes(req.user.role)
        ? res.status(403).json({ error: "Not authorized" })
        : next();
