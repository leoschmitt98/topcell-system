import { getPool, sql } from "../../config/db.js";
import jwt from "jsonwebtoken";

const STATUS_VALUES = ["aberto", "em_andamento", "aguardando_cliente", "finalizado", "cancelado"];
const PRIORIDADE_VALUES = ["baixa", "media", "alta"];
const PUBLIC_CHAT_TOKEN_SECRET = String(process.env.PUBLIC_CHAT_TOKEN_SECRET || process.env.JWT_SECRET || "topcell-dev-secret");
const PUBLIC_CHAT_TOKEN_EXPIRES_IN = String(process.env.PUBLIC_CHAT_TOKEN_EXPIRES_IN || "30d");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function mapConversation(row) {
  return {
    id: Number(row.id),
    clienteId: row.cliente_id == null ? null : Number(row.cliente_id),
    clienteNome: String(row.cliente_nome || ""),
    clienteTelefone: String(row.cliente_telefone || ""),
    canal: String(row.canal || ""),
    assunto: row.assunto == null ? null : String(row.assunto),
    status: String(row.status || ""),
    prioridade: String(row.prioridade || ""),
    responsavel: row.responsavel == null ? null : String(row.responsavel),
    iniciadaEm: toIso(row.iniciada_em),
    encerradaEm: toIso(row.encerrada_em),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    mensagensCount: Number(row.mensagens_count || 0),
    naoLidasCliente: Number(row.nao_lidas_cliente || 0),
    ultimaMensagem: row.ultima_mensagem == null ? null : String(row.ultima_mensagem),
    ultimaMensagemEm: toIso(row.ultima_mensagem_em),
  };
}

function mapMessage(row) {
  return {
    id: Number(row.id),
    conversaId: Number(row.conversa_id),
    autorTipo: String(row.autor_tipo || ""),
    mensagem: String(row.mensagem || ""),
    arquivoUrl: row.arquivo_url == null ? null : String(row.arquivo_url),
    enviadaEm: toIso(row.enviada_em),
    lidaEm: toIso(row.lida_em),
    createdAt: toIso(row.created_at),
  };
}

function ensureStatus(status) {
  if (!STATUS_VALUES.includes(status)) {
    throw new Error(`status invalido. Use: ${STATUS_VALUES.join(", ")}`);
  }
}

function ensurePrioridade(value) {
  if (!PRIORIDADE_VALUES.includes(value)) {
    throw new Error(`prioridade invalida. Use: ${PRIORIDADE_VALUES.join(", ")}`);
  }
}

async function ensureCliente(pool, nome, telefoneDigits) {
  const cpfCnpjFallback = `CLI${(telefoneDigits || String(Date.now())).slice(0, 17)}`;

  const existing = await pool
    .request()
    .input("nome", sql.NVarChar(150), nome)
    .input("telefoneDigits", sql.NVarChar(30), telefoneDigits)
    .query(`
      SELECT TOP 1 id
      FROM dbo.clientes
      WHERE LOWER(LTRIM(RTRIM(nome))) = LOWER(LTRIM(RTRIM(@nome)))
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = @telefoneDigits
      ORDER BY id DESC;
    `);

  const existingId = Number(existing.recordset[0]?.id || 0);
  if (existingId > 0) return existingId;

  const existingByPhone = await pool
    .request()
    .input("telefoneDigits", sql.NVarChar(30), telefoneDigits)
    .query(`
      SELECT TOP 1 id
      FROM dbo.clientes
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = @telefoneDigits
      ORDER BY id DESC;
    `);

  const existingByPhoneId = Number(existingByPhone.recordset[0]?.id || 0);
  if (existingByPhoneId > 0) return existingByPhoneId;

  const inserted = await pool
    .request()
    .input("nome", sql.NVarChar(150), nome)
    .input("telefone", sql.NVarChar(30), telefoneDigits)
    .input("cpfCnpj", sql.NVarChar(20), cpfCnpjFallback)
    .query(`
      INSERT INTO dbo.clientes (nome, telefone, email, cpf_cnpj, observacoes, ativo, created_at, updated_at)
      OUTPUT inserted.id
      VALUES (@nome, @telefone, NULL, @cpfCnpj, NULL, 1, GETDATE(), GETDATE());
    `);

  const clienteId = Number(inserted.recordset[0]?.id || 0);
  if (!clienteId) throw new Error("Falha ao vincular cliente.");
  return clienteId;
}

export async function createPublicConversation(payload) {
  const clienteNome = normalizeText(payload?.clienteNome);
  const clienteTelefoneDigits = normalizePhone(payload?.clienteTelefone);
  const assunto = normalizeText(payload?.assunto);
  const mensagem = normalizeText(payload?.mensagem);
  const canal = normalizeText(payload?.canal) || "site";

  if (!clienteNome) throw new Error("cliente_nome e obrigatorio");
  if (!clienteTelefoneDigits) throw new Error("cliente_telefone e obrigatorio");
  if (!mensagem) throw new Error("mensagem e obrigatoria");

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const clienteId = await ensureCliente(pool, clienteNome, clienteTelefoneDigits);

    const createdConv = await tx
      .request()
      .input("clienteId", sql.Int, clienteId)
      .input("canal", sql.NVarChar(40), canal)
      .input("assunto", sql.NVarChar(255), assunto || "Atendimento geral")
      .query(`
        INSERT INTO dbo.atendimento_conversas (
          cliente_id,
          canal,
          assunto,
          status,
          prioridade,
          responsavel,
          iniciada_em,
          encerrada_em,
          created_at,
          updated_at
        )
        OUTPUT inserted.id
        VALUES (
          @clienteId,
          @canal,
          @assunto,
          'aberto',
          'media',
          NULL,
          GETDATE(),
          NULL,
          GETDATE(),
          GETDATE()
        );
      `);

    const conversaId = Number(createdConv.recordset[0]?.id || 0);
    if (!conversaId) throw new Error("Falha ao criar conversa.");

    await tx
      .request()
      .input("conversaId", sql.Int, conversaId)
      .input("mensagem", sql.NVarChar(sql.MAX), mensagem)
      .query(`
        INSERT INTO dbo.atendimento_mensagens (
          conversa_id,
          autor_tipo,
          mensagem,
          arquivo_url,
          enviada_em,
          lida_em,
          created_at
        )
        VALUES (
          @conversaId,
          'cliente',
          @mensagem,
          NULL,
          GETDATE(),
          NULL,
          GETDATE()
        );
      `);

    await tx.commit();
    return getConversationById(conversaId);
  } catch (error) {
    if (tx._aborted !== true) await tx.rollback();
    throw error;
  }
}

export function createPublicConversationAccessToken({ conversaId, clienteId }) {
  return jwt.sign(
    {
      scope: "public_chat",
      conversaId: Number(conversaId),
      clienteId: Number(clienteId),
    },
    PUBLIC_CHAT_TOKEN_SECRET,
    { expiresIn: PUBLIC_CHAT_TOKEN_EXPIRES_IN }
  );
}

function verifyPublicConversationAccessToken(token) {
  try {
    return jwt.verify(String(token || ""), PUBLIC_CHAT_TOKEN_SECRET);
  } catch {
    throw new Error("Token da conversa invalido");
  }
}

export async function validatePublicConversationAccess({ conversaId, token }) {
  const numericConversationId = Number(conversaId);
  if (!Number.isInteger(numericConversationId) || numericConversationId <= 0) {
    throw new Error("conversa_id invalido");
  }

  const payload = verifyPublicConversationAccessToken(token);
  const tokenConversationId = Number(payload?.conversaId || 0);
  const tokenClientId = Number(payload?.clienteId || 0);

  if (payload?.scope !== "public_chat" || tokenConversationId !== numericConversationId || tokenClientId <= 0) {
    throw new Error("Token da conversa invalido");
  }

  const conversation = await getConversationById(numericConversationId);
  if (!conversation) {
    throw new Error("Conversa nao encontrada.");
  }

  if (Number(conversation.clienteId || 0) !== tokenClientId) {
    throw new Error("Token da conversa invalido");
  }

  return conversation;
}

export async function listConversations() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      c.id,
      c.cliente_id,
      cl.nome AS cliente_nome,
      cl.telefone AS cliente_telefone,
      c.canal,
      c.assunto,
      c.status,
      c.prioridade,
      c.responsavel,
      c.iniciada_em,
      c.encerrada_em,
      c.created_at,
      c.updated_at,
      (
        SELECT COUNT(1)
        FROM dbo.atendimento_mensagens m
        WHERE m.conversa_id = c.id
      ) AS mensagens_count,
      (
        SELECT COUNT(1)
        FROM dbo.atendimento_mensagens m
        WHERE m.conversa_id = c.id
          AND m.autor_tipo = 'cliente'
          AND m.lida_em IS NULL
      ) AS nao_lidas_cliente,
      (
        SELECT TOP 1 m.mensagem
        FROM dbo.atendimento_mensagens m
        WHERE m.conversa_id = c.id
        ORDER BY m.id DESC
      ) AS ultima_mensagem,
      (
        SELECT TOP 1 m.enviada_em
        FROM dbo.atendimento_mensagens m
        WHERE m.conversa_id = c.id
        ORDER BY m.id DESC
      ) AS ultima_mensagem_em
    FROM dbo.atendimento_conversas c
    INNER JOIN dbo.clientes cl ON cl.id = c.cliente_id
    ORDER BY
      CASE c.status
        WHEN 'aberto' THEN 0
        WHEN 'em_andamento' THEN 1
        WHEN 'aguardando_cliente' THEN 2
        ELSE 3
      END ASC,
      ISNULL((
        SELECT TOP 1 m.enviada_em
        FROM dbo.atendimento_mensagens m
        WHERE m.conversa_id = c.id
        ORDER BY m.id DESC
      ), c.created_at) DESC;
  `);

  return (result.recordset || []).map(mapConversation);
}

export async function getConversationById(conversaId) {
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("conversa_id invalido");

  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, id)
    .query(`
      SELECT
        c.id,
        c.cliente_id,
        cl.nome AS cliente_nome,
        cl.telefone AS cliente_telefone,
        c.canal,
        c.assunto,
        c.status,
        c.prioridade,
        c.responsavel,
        c.iniciada_em,
        c.encerrada_em,
        c.created_at,
        c.updated_at,
        (
          SELECT COUNT(1)
          FROM dbo.atendimento_mensagens m
          WHERE m.conversa_id = c.id
        ) AS mensagens_count,
        (
          SELECT COUNT(1)
          FROM dbo.atendimento_mensagens m
          WHERE m.conversa_id = c.id
            AND m.autor_tipo = 'cliente'
            AND m.lida_em IS NULL
        ) AS nao_lidas_cliente,
        (
          SELECT TOP 1 m.mensagem
          FROM dbo.atendimento_mensagens m
          WHERE m.conversa_id = c.id
          ORDER BY m.id DESC
        ) AS ultima_mensagem,
        (
          SELECT TOP 1 m.enviada_em
          FROM dbo.atendimento_mensagens m
          WHERE m.conversa_id = c.id
          ORDER BY m.id DESC
        ) AS ultima_mensagem_em
      FROM dbo.atendimento_conversas c
      INNER JOIN dbo.clientes cl ON cl.id = c.cliente_id
      WHERE c.id = @id;
    `);

  const row = result.recordset[0] || null;
  return row ? mapConversation(row) : null;
}

export async function listMessagesByConversation(conversaId, options = {}) {
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("conversa_id invalido");

  const pool = await getPool();

  if (options.markClientAsRead) {
    await pool
      .request()
      .input("conversaId", sql.Int, id)
      .query(`
        UPDATE dbo.atendimento_mensagens
        SET lida_em = GETDATE()
        WHERE conversa_id = @conversaId
          AND autor_tipo = 'cliente'
          AND lida_em IS NULL;
      `);
  }

  const result = await pool
    .request()
    .input("conversaId", sql.Int, id)
    .query(`
      SELECT id, conversa_id, autor_tipo, mensagem, arquivo_url, enviada_em, lida_em, created_at
      FROM dbo.atendimento_mensagens
      WHERE conversa_id = @conversaId
      ORDER BY id ASC;
    `);

  return (result.recordset || []).map(mapMessage);
}

export async function sendMessage(conversaId, payload) {
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("conversa_id invalido");

  const autorTipo = normalizeText(payload?.autorTipo).toLowerCase();
  const mensagem = normalizeText(payload?.mensagem);
  if (!["cliente", "atendente"].includes(autorTipo)) throw new Error("autor_tipo invalido");
  if (!mensagem) throw new Error("mensagem e obrigatoria");

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const exists = await tx
      .request()
      .input("id", sql.Int, id)
      .query("SELECT id FROM dbo.atendimento_conversas WHERE id = @id;");
    if (!exists.recordset[0]) throw new Error("Conversa nao encontrada.");

    const inserted = await tx
      .request()
      .input("conversaId", sql.Int, id)
      .input("autorTipo", sql.NVarChar(20), autorTipo)
      .input("mensagem", sql.NVarChar(sql.MAX), mensagem)
      .query(`
        INSERT INTO dbo.atendimento_mensagens (
          conversa_id,
          autor_tipo,
          mensagem,
          arquivo_url,
          enviada_em,
          lida_em,
          created_at
        )
        OUTPUT inserted.id
        VALUES (
          @conversaId,
          @autorTipo,
          @mensagem,
          NULL,
          GETDATE(),
          NULL,
          GETDATE()
        );
      `);

    const messageId = Number(inserted.recordset[0]?.id || 0);
    const nextStatus = autorTipo === "atendente" ? "aguardando_cliente" : "em_andamento";

    await tx
      .request()
      .input("id", sql.Int, id)
      .input("status", sql.NVarChar(30), nextStatus)
      .query(`
        UPDATE dbo.atendimento_conversas
        SET
          status = @status,
          encerrada_em = CASE WHEN @status = 'finalizado' THEN GETDATE() ELSE NULL END,
          updated_at = GETDATE()
        WHERE id = @id;
      `);

    await tx.commit();

    const messages = await listMessagesByConversation(id);
    return messages.find((m) => m.id === messageId) || null;
  } catch (error) {
    if (tx._aborted !== true) await tx.rollback();
    throw error;
  }
}

export async function updateConversationStatus(conversaId, payload) {
  const id = Number(conversaId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("conversa_id invalido");

  const status = normalizeText(payload?.status).toLowerCase();
  const prioridade = normalizeText(payload?.prioridade).toLowerCase();
  const responsavel = normalizeText(payload?.responsavel);

  if (status) ensureStatus(status);
  if (prioridade) ensurePrioridade(prioridade);
  if (!status && !prioridade && !responsavel) {
    throw new Error("Informe ao menos um campo: status, prioridade ou responsavel.");
  }

  const pool = await getPool();

  await pool
    .request()
    .input("id", sql.Int, id)
    .input("status", sql.NVarChar(30), status || null)
    .input("prioridade", sql.NVarChar(20), prioridade || null)
    .input("responsavel", sql.NVarChar(100), responsavel || null)
    .query(`
      UPDATE dbo.atendimento_conversas
      SET
        status = COALESCE(@status, status),
        prioridade = COALESCE(@prioridade, prioridade),
        responsavel = COALESCE(@responsavel, responsavel),
        encerrada_em = CASE
          WHEN COALESCE(@status, status) = 'finalizado' THEN ISNULL(encerrada_em, GETDATE())
          WHEN COALESCE(@status, status) <> 'finalizado' THEN NULL
          ELSE encerrada_em
        END,
        updated_at = GETDATE()
      WHERE id = @id;
    `);

  return getConversationById(id);
}
