import { Router } from "express";
import {
  getConversationByIdHandler,
  listConversationsHandler,
  listMessagesHandler,
  sendAdminMessageHandler,
  updateConversationStatusHandler,
} from "./atendimento.controller.js";

const atendimentoRouter = Router();

atendimentoRouter.get("/conversas", listConversationsHandler);
atendimentoRouter.get("/conversas/:id", getConversationByIdHandler);
atendimentoRouter.get("/conversas/:id/mensagens", listMessagesHandler);
atendimentoRouter.post("/conversas/:id/mensagens", sendAdminMessageHandler);
atendimentoRouter.put("/conversas/:id/status", updateConversationStatusHandler);

export default atendimentoRouter;

