import {
  createPublicConversationAccessToken,
  createPublicConversation,
  getConversationById,
  listConversations,
  listMessagesByConversation,
  sendMessage,
  updateConversationStatus,
  validatePublicConversationAccess,
} from "./atendimento.service.js";

export async function listConversationsHandler(_req, res) {
  try {
    const data = await listConversations();
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}

export async function getConversationByIdHandler(req, res) {
  try {
    const data = await getConversationById(req.params.id);
    if (!data) return res.status(404).json({ ok: false, error: "Conversa nao encontrada." });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function listMessagesHandler(req, res) {
  try {
    const data = await listMessagesByConversation(req.params.id, { markClientAsRead: true });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function sendAdminMessageHandler(req, res) {
  try {
    const data = await sendMessage(req.params.id, {
      autorTipo: "atendente",
      mensagem: req.body?.mensagem,
    });
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function updateConversationStatusHandler(req, res) {
  try {
    const data = await updateConversationStatus(req.params.id, req.body || {});
    if (!data) return res.status(404).json({ ok: false, error: "Conversa nao encontrada." });
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function createPublicConversationHandler(req, res) {
  try {
    const data = await createPublicConversation({
      clienteNome: req.body?.cliente_nome,
      clienteTelefone: req.body?.cliente_telefone,
      assunto: req.body?.assunto,
      mensagem: req.body?.mensagem,
      canal: req.body?.canal,
    });
    const accessToken = createPublicConversationAccessToken({
      conversaId: data.id,
      clienteId: data.clienteId,
    });
    return res.status(201).json({ ok: true, data: { ...data, accessToken } });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }
}

export async function listPublicMessagesHandler(req, res) {
  try {
    const token = req.headers["x-conversa-token"] || req.query?.token;
    await validatePublicConversationAccess({ conversaId: req.params.id, token });
    const data = await listMessagesByConversation(req.params.id);
    return res.json({ ok: true, data });
  } catch (error) {
    return res.status(401).json({ ok: false, error: error.message });
  }
}

export async function sendPublicMessageHandler(req, res) {
  try {
    const token = req.headers["x-conversa-token"] || req.body?.token;
    await validatePublicConversationAccess({ conversaId: req.params.id, token });
    const data = await sendMessage(req.params.id, {
      autorTipo: "cliente",
      mensagem: req.body?.mensagem,
    });
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    return res.status(401).json({ ok: false, error: error.message });
  }
}
