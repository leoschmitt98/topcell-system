import { Router } from "express";
import {
  createProdutoHandler,
  deleteProdutoHandler,
  getProdutoByIdHandler,
  listProdutosHandler,
  updateProdutoHandler,
} from "./produtos.controller.js";

const produtosRouter = Router();

// POST /api/produtos -> cria um novo produto.
produtosRouter.post("/", createProdutoHandler);

// GET /api/produtos -> lista produtos.
produtosRouter.get("/", listProdutosHandler);

// GET /api/produtos/:id -> busca produto por id.
produtosRouter.get("/:id", getProdutoByIdHandler);

// PUT /api/produtos/:id -> atualiza produto.
produtosRouter.put("/:id", updateProdutoHandler);

// DELETE /api/produtos/:id -> desativa produto (ativo = 0).
produtosRouter.delete("/:id", deleteProdutoHandler);

export default produtosRouter;
