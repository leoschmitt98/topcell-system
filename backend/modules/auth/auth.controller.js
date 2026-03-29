import { changeAdminPassword, loginAdmin } from "./auth.service.js";

const attemptsByIp = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 10 * 60 * 1000;

function getIp(req) {
  return String(req.ip || req.headers["x-forwarded-for"] || "unknown");
}

function canAttempt(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry) return true;

  if (entry.blockedUntil && Date.now() < entry.blockedUntil) {
    return false;
  }

  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    attemptsByIp.delete(ip);
  }

  return true;
}

function registerFailure(ip) {
  const current = attemptsByIp.get(ip) || { attempts: 0, blockedUntil: 0 };
  const attempts = current.attempts + 1;

  if (attempts >= MAX_ATTEMPTS) {
    attemptsByIp.set(ip, { attempts, blockedUntil: Date.now() + BLOCK_MS });
    return;
  }

  attemptsByIp.set(ip, { attempts, blockedUntil: 0 });
}

function resetAttempts(ip) {
  attemptsByIp.delete(ip);
}

export async function loginAdminHandler(req, res) {
  const ip = getIp(req);

  if (!canAttempt(ip)) {
    return res.status(429).json({ ok: false, error: "Muitas tentativas. Aguarde alguns minutos." });
  }

  try {
    const result = await loginAdmin(req.body?.senha);
    resetAttempts(ip);
    return res.json({ ok: true, data: result });
  } catch (error) {
    registerFailure(ip);
    return res.status(401).json({ ok: false, error: error.message });
  }
}

export async function getAdminSessionHandler(req, res) {
  return res.json({ ok: true, data: { role: "admin" } });
}

export async function changeAdminPasswordHandler(req, res) {
  try {
    await changeAdminPassword(req.body?.senhaAtual, req.body?.novaSenha);
    return res.json({ ok: true, data: { updated: true } });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}
