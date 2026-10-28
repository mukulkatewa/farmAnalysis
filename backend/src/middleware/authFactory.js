export const createAuthenticate = (verify) => async (req, res, next) => {
  const match = /^Bearer ([^\s]+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "Authentication required" });
  try {
    req.user = await verify(match[1]);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
