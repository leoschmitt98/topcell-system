import { getPool, sql } from "../../config/db.js";

const ALLOWED_STATUS = ["pendente", "aprovado", "recusado", "expirado", "convertido_os"];

function normalizeId(value, fieldName = "id") {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`${fieldName} invalido`);
  }
  return numericId;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeStatus(value) {
  const status = normalizeText(value).toLowerCase().replace(/\s+/g, "_");
  if (!ALLOWED_STATUS.includes(status)) {
    throw new Error(`status invalido. Use: ${ALLOWED_STATUS.join(", ")}`);
  }
  return status;
}

function normalizeMoneyOptional(value, fieldName) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} invalido`);
  }
  return Number(parsed.toFixed(2));
}

function normalizeDateOptional(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} invalida`);
  }
  return date;
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function mapOrcamento(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    clienteId: row.cliente_id == null ? null : Number(row.cliente_id),
    clienteNome: String(row.cliente_nome || ""),
    clienteTelefone: String(row.cliente_telefone || ""),
    ordemServicoId: row.ordem_servico_id == null ? null : Number(row.ordem_servico_id),
    descricao: row.descricao == null ? null : String(row.descricao),
    valorEstimado: row.valor_estimado == null ? null : Number(row.valor_estimado),
    status: String(row.status || "pendente"),
    validadeEm: toIso(row.validade_em),
    observacoes: row.observacoes == null ? null : String(row.observacoes),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export async function listOrcamentos() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT
      o.id,
      o.cliente_id,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      o.ordem_servico_id,
      o.descricao,
      o.valor_estimado,
      o.status,
      o.validade_em,
      o.observacoes,
      o.created_at,
      o.updated_at
    FROM dbo.orcamentos o
    LEFT JOIN dbo.clientes c ON c.id = o.cliente_id
    ORDER BY
      CASE o.status
        WHEN 'pendente' THEN 1
        WHEN 'aprovado' THEN 2
        WHEN 'convertido_os' THEN 3
        WHEN 'recusado' THEN 4
        WHEN 'expirado' THEN 5
        ELSE 6
      END,
      o.id DESC;
  `);

  return (result.recordset || []).map((row) => mapOrcamento(row));
}

export async function findOrcamentoById(id) {
  const orcamentoId = normalizeId(id);
  const pool = await getPool();
  const result = await pool
    .request()
    .input("id", sql.Int, orcamentoId)
    .query(`
      SELECT
        o.id,
        o.cliente_id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        o.ordem_servico_id,
        o.descricao,
        o.valor_estimado,
        o.status,
        o.validade_em,
        o.observacoes,
        o.created_at,
        o.updated_at
      FROM dbo.orcamentos o
      LEFT JOIN dbo.clientes c ON c.id = o.cliente_id
      WHERE o.id = @id;
    `);

  return mapOrcamento(result.recordset[0] || null);
}

export async function updateOrcamento(id, payload) {
  const orcamentoId = normalizeId(id);
  const status = payload?.status == null ? null : normalizeStatus(payload.status);
  const valorEstimado = normalizeMoneyOptional(payload?.valor_estimado, "valor_estimado");
  const observacoes = payload?.observacoes === undefined ? undefined : normalizeText(payload?.observacoes) || null;
  const validadeEm = payload?.validade_em === undefined ? undefined : normalizeDateOptional(payload?.validade_em, "validade_em");

  if (status == null && valorEstimado == null && observacoes === undefined && validadeEm === undefined) {
    throw new Error("Informe pelo menos um campo para atualizar");
  }

  const pool = await getPool();
  const req = pool.request().input("id", sql.Int, orcamentoId);

  const setParts = [];
  if (status != null) {
    req.input("status", sql.NVarChar(30), status);
    setParts.push("status = @status");
  }
  if (valorEstimado != null) {
    req.input("valorEstimado", sql.Decimal(18, 2), valorEstimado);
    setParts.push("valor_estimado = @valorEstimado");
  }
  if (observacoes !== undefined) {
    req.input("observacoes", sql.NVarChar(sql.MAX), observacoes);
    setParts.push("observacoes = @observacoes");
  }
  if (validadeEm !== undefined) {
    req.input("validadeEm", sql.DateTime, validadeEm);
    setParts.push("validade_em = @validadeEm");
  }

  setParts.push("updated_at = GETDATE()");

  const result = await req.query(`
    UPDATE dbo.orcamentos
    SET ${setParts.join(", ")}
    WHERE id = @id;
  `);

  if (!result.rowsAffected[0]) return null;
  return findOrcamentoById(orcamentoId);
}

export async function createOrcamentoFromOrder({ ordemServicoId, descricao }) {
  const osId = normalizeId(ordemServicoId, "ordem_servico_id");
  const normalizedDescription = normalizeText(descricao) || "Solicitacao de orcamento";

  const pool = await getPool();
  const osResult = await pool
    .request()
    .input("osId", sql.Int, osId)
    .query(`
      SELECT TOP 1 id, cliente_id
      FROM dbo.ordens_servico
      WHERE id = @osId;
    `);

  const osRow = osResult.recordset[0] || null;
  if (!osRow) {
    throw new Error("ordem_servico nao encontrada para vincular orcamento");
  }

  const existent = await pool
    .request()
    .input("osId", sql.Int, osId)
    .query(`
      SELECT TOP 1 id
      FROM dbo.orcamentos
      WHERE ordem_servico_id = @osId
      ORDER BY id DESC;
    `);

  if (existent.recordset[0]?.id) {
    return findOrcamentoById(existent.recordset[0].id);
  }

  const insertResult = await pool
    .request()
    .input("clienteId", sql.Int, Number(osRow.cliente_id))
    .input("ordemServicoId", sql.Int, osId)
    .input("descricao", sql.NVarChar(sql.MAX), normalizedDescription)
    .query(`
      INSERT INTO dbo.orcamentos (
        cliente_id,
        ordem_servico_id,
        descricao,
        valor_estimado,
        status,
        validade_em,
        observacoes,
        created_at,
        updated_at
      )
      OUTPUT inserted.id
      VALUES (
        @clienteId,
        @ordemServicoId,
        @descricao,
        NULL,
        'pendente',
        NULL,
        NULL,
        GETDATE(),
        GETDATE()
      );
    `);

  return findOrcamentoById(insertResult.recordset[0]?.id);
}

export function getAllowedOrcamentoStatus() {
  return [...ALLOWED_STATUS];
}
