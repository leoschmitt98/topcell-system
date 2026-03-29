import { verifyAdminToken } from "../modules/auth/auth.service.js";

export function requireAdminAuth(req, res, next) {
  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ ok: false, error: "Token ausente" });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return res.status(401).json({ ok: false, error: "Token ausente" });
  }

  try {
    const payload = verifyAdminToken(token);
    req.admin = payload;
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: "Token invalido" });
  }
}
