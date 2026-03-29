import {
  getAllowedOrcamentoStatus,
  listOrcamentos,
  updateOrcamento,
} from "./orcamentos.service.js";

export async function listOrcamentosHandler(_req, res) {
  try {
    const data = await listOrcamentos();
    return res.json({ ok: true, data, meta: { statusPermitidos: getAllowedOrcamentoStatus() } });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function updateOrcamentoHandler(req, res) {
  try {
    const data = await updateOrcamento(req.params.id, req.body || {});
    if (!data) {
      return res.status(404).json({ ok: false, error: "Orcamento nao encontrado" });
    }

    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}
