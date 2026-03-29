import {
  createProduto,
  deactivateProduto,
  findProdutoById,
  listProdutos,
  updateProduto,
} from "./produtos.service.js";

export async function createProdutoHandler(req, res) {
  try {
    const produto = await createProduto(req.body);
    return res.status(201).json({ ok: true, data: produto });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function listProdutosHandler(_req, res) {
  try {
    const produtos = await listProdutos();
    return res.json({ ok: true, data: produtos });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function getProdutoByIdHandler(req, res) {
  try {
    const produto = await findProdutoById(req.params.id);
    if (!produto) {
      return res.status(404).json({ ok: false, error: "Produto nao encontrado" });
    }

    return res.json({ ok: true, data: produto });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function updateProdutoHandler(req, res) {
  try {
    const produto = await updateProduto(req.params.id, req.body);
    if (!produto) {
      return res.status(404).json({ ok: false, error: "Produto nao encontrado" });
    }

    return res.json({ ok: true, data: produto });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function deleteProdutoHandler(req, res) {
  try {
    const produto = await deactivateProduto(req.params.id);
    if (!produto) {
      return res.status(404).json({ ok: false, error: "Produto nao encontrado" });
    }

    return res.json({ ok: true, data: produto });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}
