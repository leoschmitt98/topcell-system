import { Router } from "express";
import {
  createOSHandler,
  getOSByIdHandler,
  listOSHandler,
  listOSStatusHandler,
  updateOSStatusHandler,
} from "./os.controller.js";

const osRouter = Router();

// POST /api/os -> cria uma nova Ordem de Servico.
osRouter.post("/", createOSHandler);

// GET /api/os -> lista todas as ordens.
osRouter.get("/", listOSHandler);

// GET /api/os/status-options -> lista os status aceitos para a UI.
osRouter.get("/status-options", listOSStatusHandler);

// GET /api/os/:id -> busca uma ordem pelo id.
osRouter.get("/:id", getOSByIdHandler);

// PUT /api/os/:id -> atualiza apenas o status da ordem.
osRouter.put("/:id", updateOSStatusHandler);

export default osRouter;
