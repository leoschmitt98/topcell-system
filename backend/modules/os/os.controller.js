import {
  createOS,
  findOSById,
  getAllowedOSStatus,
  listAllOS,
  updateOSStatus,
} from "./os.service.js";

export async function createOSHandler(req, res) {
  try {
    const ordem = await createOS(req.body);
    return res.status(201).json({ ok: true, data: ordem });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function listOSHandler(_req, res) {
  try {
    return res.json({ ok: true, data: await listAllOS() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function getOSByIdHandler(req, res) {
  try {
    const ordem = await findOSById(req.params.id);
    if (!ordem) {
      return res.status(404).json({ ok: false, error: "OS nao encontrada" });
    }

    return res.json({ ok: true, data: ordem });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function updateOSStatusHandler(req, res) {
  try {
    const ordem = await updateOSStatus(req.params.id, req.body?.status, req.body);
    if (!ordem) {
      return res.status(404).json({ ok: false, error: "OS nao encontrada" });
    }

    return res.json({ ok: true, data: ordem });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export function listOSStatusHandler(_req, res) {
  return res.json({ ok: true, data: getAllowedOSStatus() });
}
