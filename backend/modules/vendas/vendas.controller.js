import { createVenda, listVendas } from "./vendas.service.js";

export async function createVendaHandler(req, res) {
  try {
    const venda = await createVenda(req.body);
    return res.status(201).json({ ok: true, data: venda });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function listVendasHandler(_req, res) {
  try {
    const vendas = await listVendas();
    return res.json({ ok: true, data: vendas });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
