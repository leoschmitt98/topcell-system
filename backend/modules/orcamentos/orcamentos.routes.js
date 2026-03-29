import { Router } from "express";
import {
  listOrcamentosHandler,
  updateOrcamentoHandler,
} from "./orcamentos.controller.js";

const orcamentosRouter = Router();

// GET /api/orcamentos -> lista orcamentos.
orcamentosRouter.get("/", listOrcamentosHandler);

// PUT /api/orcamentos/:id -> atualiza dados do orcamento.
orcamentosRouter.put("/:id", updateOrcamentoHandler);

export default orcamentosRouter;
