import { Router } from "express";
import {
  consultPublicOSHandler,
  createPublicBudgetHandler,
  decidePublicOSHandler,
} from "./public.controller.js";
import {
  createPublicConversationHandler,
  listPublicMessagesHandler,
  sendPublicMessageHandler,
} from "../atendimento/atendimento.controller.js";

const publicRouter = Router();

// GET /api/public/os/consultar?numero_os=1&cliente_nome=...&cliente_telefone=...
publicRouter.get("/os/consultar", consultPublicOSHandler);
publicRouter.post("/os/decisao", decidePublicOSHandler);
publicRouter.post("/orcamentos", createPublicBudgetHandler);
publicRouter.post("/atendimento/conversas", createPublicConversationHandler);
publicRouter.get("/atendimento/conversas/:id/mensagens", listPublicMessagesHandler);
publicRouter.post("/atendimento/conversas/:id/mensagens", sendPublicMessageHandler);

export default publicRouter;
