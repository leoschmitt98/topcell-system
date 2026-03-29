import { OS_ALLOWED_STATUS, buildOS } from "./os.model.js";
import { getPool, sql } from "../../config/db.js";

const CLOSING_STATUS = new Set(["entregue"]);
const tableColumnsCache = new Map();

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizePhoneDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeStatusForDb(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (!raw) return "";
  if (raw === "finalizado") return "entregue";
  if (raw === "aguardando aprovacao") return "aguardando_aprovacao";
  if (raw === "em analise") return "em_analise";
  if (raw === "em conserto") return "em_conserto";
  return raw.replace(/\s+/g, "_");
}

function toIsoString(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseMoney(value, fieldName, fallback = 0) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} invalido`);
  }
  return Number(parsed.toFixed(2));
}

function parseMoneyOptional(value, fieldName) {
  if (value === undefined) return null;
  return parseMoney(value, fieldName, 0);
}

function mapDbOrderToModel(row) {
  if (!row) return null;

  return buildOS({
    id: Number(row.id),
    clienteNome: String(row.cliente_nome || ""),
    clienteTelefone: String(row.cliente_telefone || ""),
    aparelho: String(row.aparelho || ""),
    problema: String(row.problema || ""),
    status: String(row.status || ""),
    valorServico: Number(row.valor_servico || 0),
    valorPecas: Number(row.valor_pecas || 0),
    valorTotal: Number(row.valor_total || 0),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  });
}

function ensureValidStatus(status) {
  if (!OS_ALLOWED_STATUS.includes(status)) {
    throw new Error(`Status invalido. Use um destes: ${OS_ALLOWED_STATUS.join(", ")}`);
  }
}

async function getTableColumns(txOrPool, tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }

  const result = await txOrPool
    .request()
    .input("tableName", sql.NVarChar(128), tableName)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @tableName;
    `);

  const columns = new Set((result.recordset || []).map((row) => String(row.COLUMN_NAME || "").toLowerCase()));
  tableColumnsCache.set(tableName, columns);
  return columns;
}

function hasColumn(columns, columnName) {
  return columns.has(String(columnName || "").toLowerCase());
}

async function ensureCliente(pool, clienteNome, clienteTelefone) {
  const telefoneDigits = normalizePhoneDigits(clienteTelefone);
  const cpfCnpjFallback = `CLI${(telefoneDigits || String(Date.now())).slice(0, 17)}`;

  const existing = await pool
    .request()
    .input("nome", sql.NVarChar(150), clienteNome)
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
    .input("nome", sql.NVarChar(150), clienteNome)
    .input("telefone", sql.NVarChar(30), telefoneDigits || clienteTelefone)
    .input("cpfCnpj", sql.NVarChar(20), cpfCnpjFallback)
    .query(`
      INSERT INTO dbo.clientes (
        nome,
        telefone,
        email,
        cpf_cnpj,
        observacoes,
        ativo,
        created_at,
        updated_at
      )
      OUTPUT inserted.id
      VALUES (
        @nome,
        @telefone,
        NULL,
        @cpfCnpj,
        NULL,
        1,
        GETDATE(),
        GETDATE()
      );
    `);

  const clienteId = Number(inserted.recordset[0]?.id || 0);
  if (!clienteId) throw new Error("Falha ao vincular cliente da OS");
  return clienteId;
}

async function createFinancialLaunchForClosedOS(transaction, osId) {
  const financialColumns = await getTableColumns(transaction, "financeiro_lancamentos");

  const valueResult = await transaction
    .request()
    .input("osId", sql.Int, osId)
    .query(`
      SELECT
        ISNULL(valor_servico, 0) AS valor_servico,
        ISNULL(valor_pecas, 0) AS valor_pecas,
        ISNULL(valor_total, 0) AS valor_total
      FROM dbo.ordens_servico
      WHERE id = @osId;
    `);

  const valueRow = valueResult.recordset[0] || null;
  const valorServico = Number(valueRow?.valor_servico || 0);
  const valorPecas = Number(valueRow?.valor_pecas || 0);
  const valorTotal = Number(valueRow?.valor_total || 0);

  if (valorTotal <= 0 && valorServico <= 0 && valorPecas <= 0) {
    throw new Error("A OS precisa de valor_final para encerrar e gerar lancamento financeiro.");
  }

  async function insertLaunchIfNeeded({ tipo, categoria, descricao, valor }) {
    if (valor <= 0) return;

    let duplicateQuery = `
      SELECT TOP 1 id
      FROM dbo.financeiro_lancamentos
      WHERE ordem_servico_id = @osId
        AND tipo = @tipo
    `;

    if (hasColumn(financialColumns, "categoria")) {
      duplicateQuery += " AND categoria = @categoria";
    }

    const duplicateResult = await transaction
      .request()
      .input("osId", sql.Int, osId)
      .input("tipo", sql.NVarChar(30), tipo)
      .input("categoria", sql.NVarChar(60), categoria)
      .query(duplicateQuery);

    if (duplicateResult.recordset[0]) return;

    const insertColumns = [];
    const insertValues = [];

    function addFieldIfExists(columnName, valueExpression) {
      if (!hasColumn(financialColumns, columnName)) return;
      insertColumns.push(columnName);
      insertValues.push(valueExpression);
    }

    addFieldIfExists("ordem_servico_id", "@osId");
    addFieldIfExists("tipo", "@tipo");
    addFieldIfExists("origem", "'ordem_servico'");
    addFieldIfExists("categoria", "@categoria");
    addFieldIfExists("descricao", "@descricao");
    addFieldIfExists("valor", "@valor");
    addFieldIfExists("data_lancamento", "GETDATE()");
    addFieldIfExists("status", "'pago'");
    addFieldIfExists("created_at", "GETDATE()");
    addFieldIfExists("updated_at", "GETDATE()");

    if (!insertColumns.includes("tipo") || !insertColumns.includes("descricao") || !insertColumns.includes("valor")) {
      throw new Error("Nao foi possivel gerar financeiro: colunas minimas ausentes em financeiro_lancamentos.");
    }

    await transaction
      .request()
      .input("osId", sql.Int, osId)
      .input("tipo", sql.NVarChar(30), tipo)
      .input("categoria", sql.NVarChar(60), categoria)
      .input("descricao", sql.NVarChar(255), descricao)
      .input("valor", sql.Decimal(18, 2), Number(valor.toFixed(2)))
      .query(`
        INSERT INTO dbo.financeiro_lancamentos (${insertColumns.join(", ")})
        VALUES (${insertValues.join(", ")});
      `);
  }

  await insertLaunchIfNeeded({
    tipo: "receita",
    categoria: "servico_tecnico",
    descricao: `Receita de mao de obra da OS #${osId}`,
    valor: valorServico,
  });

  await insertLaunchIfNeeded({
    tipo: "despesa",
    categoria: "pecas_os",
    descricao: `Despesa de pecas da OS #${osId}`,
    valor: valorPecas,
  });
}

export async function createOS(payload) {
  const clienteNome = normalizeText(payload?.clienteNome);
  const clienteTelefone = normalizeText(payload?.clienteTelefone);
  const aparelho = normalizeText(payload?.aparelho);
  const problema = normalizeText(payload?.problema);
  const status = normalizeStatusForDb(payload?.status || "recebido");
  const valorServico = parseMoney(payload?.valorServico, "valorServico", 0);
  const valorPecas = parseMoney(payload?.valorPecas, "valorPecas", 0);
  const valorTotalInput = parseMoneyOptional(payload?.valorTotal, "valorTotal");
  const valorTotal = valorTotalInput == null ? Number((valorServico + valorPecas).toFixed(2)) : valorTotalInput;
  const numeroOsTemp = `TMP-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  if (!clienteNome) throw new Error("clienteNome e obrigatorio");
  if (!clienteTelefone) throw new Error("clienteTelefone e obrigatorio");
  if (!aparelho) throw new Error("aparelho e obrigatorio");
  if (!problema) throw new Error("problema e obrigatorio");

  ensureValidStatus(status);

  const pool = await getPool();
  const clienteId = await ensureCliente(pool, clienteNome, clienteTelefone);

  const result = await pool
    .request()
    .input("clienteId", sql.Int, clienteId)
    .input("aparelhoModelo", sql.NVarChar(200), aparelho)
    .input("problemaRelatado", sql.NVarChar(sql.MAX), problema)
    .input("status", sql.NVarChar(50), status)
    .input("valorServico", sql.Decimal(18, 2), valorServico)
    .input("valorPecas", sql.Decimal(18, 2), valorPecas)
    .input("valorTotal", sql.Decimal(18, 2), valorTotal)
    .input("numeroOsTemp", sql.NVarChar(30), numeroOsTemp)
    .query(`
      INSERT INTO dbo.ordens_servico (
        cliente_id,
        numero_os,
        aparelho_modelo,
        problema_relatado,
        status,
        data_entrada,
        valor_servico,
        valor_pecas,
        valor_total,
        created_at,
        updated_at
      )
      OUTPUT inserted.id
      VALUES (
        @clienteId,
        @numeroOsTemp,
        @aparelhoModelo,
        @problemaRelatado,
        @status,
        GETDATE(),
        @valorServico,
        @valorPecas,
        @valorTotal,
        GETDATE(),
        GETDATE()
      );
    `);

  const osId = Number(result.recordset[0]?.id || 0);
  if (!osId) throw new Error("Falha ao criar OS");

  await pool
    .request()
    .input("osId", sql.Int, osId)
    .query(`
      UPDATE dbo.ordens_servico
      SET
        numero_os = CONCAT('OS-', @osId),
        updated_at = GETDATE()
      WHERE id = @osId;
    `);

  return findOSById(osId);
}

export async function listAllOS() {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      os.id,
      c.nome AS cliente_nome,
      c.telefone AS cliente_telefone,
      os.aparelho_modelo AS aparelho,
      os.problema_relatado AS problema,
      os.status,
      os.valor_servico,
      os.valor_pecas,
      os.valor_total,
      os.created_at,
      os.updated_at
    FROM dbo.ordens_servico os
    INNER JOIN dbo.clientes c ON c.id = os.cliente_id
    ORDER BY os.id DESC;
  `);

  return (result.recordset || []).map((row) => mapDbOrderToModel(row));
}

export async function findOSById(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("id invalido");
  }

  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, numericId)
    .query(`
      SELECT
        os.id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        os.aparelho_modelo AS aparelho,
        os.problema_relatado AS problema,
        os.status,
        os.valor_servico,
        os.valor_pecas,
        os.valor_total,
        os.created_at,
        os.updated_at
      FROM dbo.ordens_servico os
      INNER JOIN dbo.clientes c ON c.id = os.cliente_id
      WHERE os.id = @id;
    `);

  return mapDbOrderToModel(result.recordset[0] || null);
}

export async function findPublicOSByIdentity({ osId, clienteNome, clienteTelefone }) {
  const numericId = Number(osId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("numero_os invalido");
  }

  const nome = normalizeText(clienteNome);
  const telefoneDigits = normalizePhoneDigits(clienteTelefone);

  if (!nome) throw new Error("cliente_nome e obrigatorio");
  if (!telefoneDigits) throw new Error("cliente_telefone e obrigatorio");

  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, numericId)
    .input("clienteNome", sql.NVarChar(200), nome)
    .input("clienteTelefoneDigits", sql.NVarChar(30), telefoneDigits)
    .query(`
      SELECT
        os.id,
        c.nome AS cliente_nome,
        c.telefone AS cliente_telefone,
        os.aparelho_modelo AS aparelho,
        os.problema_relatado AS problema,
        os.status,
        os.valor_servico,
        os.valor_pecas,
        os.valor_total,
        os.created_at,
        os.updated_at
      FROM dbo.ordens_servico os
      INNER JOIN dbo.clientes c ON c.id = os.cliente_id
      WHERE os.id = @id
        AND LOWER(LTRIM(RTRIM(c.nome))) = LOWER(LTRIM(RTRIM(@clienteNome)))
        AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = @clienteTelefoneDigits;
    `);

  return mapDbOrderToModel(result.recordset[0] || null);
}

export async function updateOSStatus(id, status, payload = {}) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("id invalido");
  }

  const normalizedStatus = normalizeStatusForDb(status);
  if (!normalizedStatus) throw new Error("status e obrigatorio");
  ensureValidStatus(normalizedStatus);
  const valorServicoInput = parseMoneyOptional(payload?.valorServico, "valorServico");
  const valorPecasInput = parseMoneyOptional(payload?.valorPecas, "valorPecas");
  const valorTotalInput = parseMoneyOptional(payload?.valorTotal, "valorTotal");

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const currentResult = await transaction
      .request()
      .input("id", sql.Int, numericId)
      .query(`
        SELECT id, valor_servico, valor_pecas, valor_total
        FROM dbo.ordens_servico
        WHERE id = @id;
      `);

    const currentRow = currentResult.recordset[0] || null;
    if (!currentRow) {
      await transaction.rollback();
      return null;
    }

    const nextValorServico = valorServicoInput == null ? Number(currentRow.valor_servico || 0) : valorServicoInput;
    const nextValorPecas = valorPecasInput == null ? Number(currentRow.valor_pecas || 0) : valorPecasInput;
    const nextValorTotal = valorTotalInput == null
      ? Number((nextValorServico + nextValorPecas).toFixed(2))
      : valorTotalInput;

    const result = await transaction
      .request()
      .input("id", sql.Int, numericId)
      .input("status", sql.NVarChar(50), normalizedStatus)
      .input("valorServico", sql.Decimal(18, 2), nextValorServico)
      .input("valorPecas", sql.Decimal(18, 2), nextValorPecas)
      .input("valorTotal", sql.Decimal(18, 2), nextValorTotal)
      .query(`
        UPDATE dbo.ordens_servico
        SET
          status = @status,
          valor_servico = @valorServico,
          valor_pecas = @valorPecas,
          valor_total = @valorTotal,
          updated_at = GETDATE()
        WHERE id = @id;

        SELECT @@ROWCOUNT AS rows_affected;
      `);

    const rowsAffected = Number(result.recordset?.[0]?.rows_affected || 0);
    if (!rowsAffected) {
      await transaction.rollback();
      return null;
    }

    if (CLOSING_STATUS.has(normalizedStatus)) {
      await createFinancialLaunchForClosedOS(transaction, numericId);
    }

    await transaction.commit();
    return findOSById(numericId);
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

export async function decidePublicOSByIdentity(payload) {
  const numericId = Number(payload?.osId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error("numero_os invalido");
  }

  const nome = normalizeText(payload?.clienteNome);
  const telefoneDigits = normalizePhoneDigits(payload?.clienteTelefone);
  const acao = String(payload?.acao || "")
    .trim()
    .toLowerCase();
  const observacaoLivre = normalizeText(payload?.observacao);

  if (!nome) throw new Error("cliente_nome e obrigatorio");
  if (!telefoneDigits) throw new Error("cliente_telefone e obrigatorio");
  if (!["aprovar", "cancelar"].includes(acao)) {
    throw new Error("acao invalida. Use aprovar ou cancelar.");
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    const currentResult = await transaction
      .request()
      .input("id", sql.Int, numericId)
      .input("clienteNome", sql.NVarChar(200), nome)
      .input("clienteTelefoneDigits", sql.NVarChar(30), telefoneDigits)
      .query(`
        SELECT
          os.id,
          os.status
        FROM dbo.ordens_servico os
        INNER JOIN dbo.clientes c ON c.id = os.cliente_id
        WHERE os.id = @id
          AND LOWER(LTRIM(RTRIM(c.nome))) = LOWER(LTRIM(RTRIM(@clienteNome)))
          AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(c.telefone, '(', ''), ')', ''), '-', ''), ' ', ''), '+', '') = @clienteTelefoneDigits;
      `);

    const currentRow = currentResult.recordset[0] || null;
    if (!currentRow) {
      await transaction.rollback();
      return null;
    }

    const currentStatus = String(currentRow.status || "");
    if (currentStatus !== "aguardando_aprovacao") {
      throw new Error("Esta OS nao esta aguardando aprovacao no momento.");
    }

    const nextStatus = acao === "aprovar" ? "em_conserto" : "cancelado";
    const observacaoSistema =
      acao === "aprovar"
        ? "Cliente aprovou o servico via portal publico."
        : "Cliente cancelou o servico via portal publico.";
    const observacaoFinal = observacaoLivre ? `${observacaoSistema} ${observacaoLivre}` : observacaoSistema;

    await transaction
      .request()
      .input("id", sql.Int, numericId)
      .input("nextStatus", sql.NVarChar(50), nextStatus)
      .query(`
        UPDATE dbo.ordens_servico
        SET
          status = @nextStatus,
          updated_at = GETDATE()
        WHERE id = @id;
      `);

    const historicoColumns = await getTableColumns(transaction, "ordens_servico_historico");
    const insertColumns = [];
    const insertValues = [];

    function addFieldIfExists(columnName, valueExpression) {
      if (!hasColumn(historicoColumns, columnName)) return;
      insertColumns.push(columnName);
      insertValues.push(valueExpression);
    }

    addFieldIfExists("ordem_servico_id", "@ordemServicoId");
    addFieldIfExists("status_anterior", "@statusAnterior");
    addFieldIfExists("status_novo", "@statusNovo");
    addFieldIfExists("observacao", "@observacao");
    addFieldIfExists("alterado_por", "'cliente_portal'");
    addFieldIfExists("created_at", "GETDATE()");

    if (insertColumns.length > 0) {
      await transaction
        .request()
        .input("ordemServicoId", sql.Int, numericId)
        .input("statusAnterior", sql.NVarChar(50), currentStatus)
        .input("statusNovo", sql.NVarChar(50), nextStatus)
        .input("observacao", sql.NVarChar(sql.MAX), observacaoFinal)
        .query(`
          INSERT INTO dbo.ordens_servico_historico (${insertColumns.join(", ")})
          VALUES (${insertValues.join(", ")});
        `);
    }

    await transaction.commit();
    return findOSById(numericId);
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

export async function ensureOSSchema() {
  const pool = await getPool();
  const constraintResult = await pool.request().query(`
    SELECT TOP 1 cc.definition
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.name = 'ordens_servico'
      AND cc.name = 'CK_ordens_servico_status';
  `);

  const definition = String(constraintResult.recordset[0]?.definition || "").toLowerCase();
  if (definition.includes("aguardando_aprovacao")) {
    return;
  }

  await pool.request().query(`
    ALTER TABLE dbo.ordens_servico DROP CONSTRAINT CK_ordens_servico_status;
    ALTER TABLE dbo.ordens_servico
    ADD CONSTRAINT CK_ordens_servico_status
    CHECK (
      status IN (
        'recebido',
        'em_analise',
        'aguardando_aprovacao',
        'em_conserto',
        'pronto',
        'entregue',
        'cancelado'
      )
    );
  `);
}

export function getAllowedOSStatus() {
  return [...OS_ALLOWED_STATUS];
}
