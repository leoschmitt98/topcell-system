import { Router } from "express";
import { createVendaHandler, listVendasHandler } from "./vendas.controller.js";

const vendasRouter = Router();

// POST /api/vendas -> cria uma venda com itens e impactos em estoque/financeiro.
vendasRouter.post("/", createVendaHandler);

// GET /api/vendas -> lista vendas.
vendasRouter.get("/", listVendasHandler);

export default vendasRouter;
