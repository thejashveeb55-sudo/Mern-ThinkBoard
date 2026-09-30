import { verifyAccessToken } from "../utils/tokenUtils.js";

export function requireAuth(req, res, next) {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const payload = verifyAccessToken(accessToken);
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin || false;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Access token invalid or expired" });
  }
}