import { getPool, sql } from "../../config/db.js";

function normalizeText(value) {
  return String(value || "").trim();
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeId(value, fieldName = "id") {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`${fieldName} invalido`);
  }
  return numericId;
}

function mapProduto(row) {
  if (!row) return null;

  return {
    id: Number(row.id),
    categoriaId: row.categoria_id == null ? null : Number(row.categoria_id),
    categoriaNome: row.categoria_nome == null ? null : String(row.categoria_nome),
    nome: String(row.nome || ""),
    codigoSku: row.codigo_sku == null ? null : String(row.codigo_sku),
    descricao: row.descricao == null ? null : String(row.descricao),
    precoCusto: Number(row.preco_custo || 0),
    precoVenda: Number(row.preco_venda || 0),
    estoqueAtual: Number(row.estoque_atual || 0),
    estoqueMinimo: Number(row.estoque_minimo || 0),
    ativo: Boolean(row.ativo),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

function validateProdutoPayload(payload) {
  const nome = normalizeText(payload?.nome);
  if (!nome) throw new Error("nome e obrigatorio");

  const categoriaIdRaw = payload?.categoria_id;
  const categoriaId = categoriaIdRaw === null || categoriaIdRaw === undefined || categoriaIdRaw === ""
    ? null
    : normalizeId(categoriaIdRaw, "categoria_id");

  const codigoSku = normalizeText(payload?.codigo_sku) || null;
  const descricao = normalizeText(payload?.descricao) || null;

  const precoCusto = toNumber(payload?.preco_custo, 0);
  const precoVenda = toNumber(payload?.preco_venda, 0);
  const estoqueAtual = Math.trunc(toNumber(payload?.estoque_atual, 0));
  const estoqueMinimo = Math.trunc(toNumber(payload?.estoque_minimo, 0));
  const ativo = payload?.ativo === undefined ? 1 : payload?.ativo ? 1 : 0;

  if (precoCusto < 0) throw new Error("preco_custo nao pode ser negativo");
  if (precoVenda < 0) throw new Error("preco_venda nao pode ser negativo");
  if (estoqueAtual < 0) throw new Error("estoque_atual nao pode ser negativo");
  if (estoqueMinimo < 0) throw new Error("estoque_minimo nao pode ser negativo");

  return {
    categoriaId,
    nome,
    codigoSku,
    descricao,
    precoCusto,
    precoVenda,
    estoqueAtual,
    estoqueMinimo,
    ativo,
  };
}

async function ensureCategoriaExists(pool, categoriaId) {
  if (categoriaId == null) return;

  const result = await pool
    .request()
    .input("id", sql.Int, categoriaId)
    .query("SELECT id FROM dbo.categorias_produto WHERE id = @id;");

  if (!result.recordset[0]) {
    throw new Error("categoria_id nao encontrada");
  }
}

export async function createProduto(payload) {
  const data = validateProdutoPayload(payload);
  const pool = await getPool();

  await ensureCategoriaExists(pool, data.categoriaId);

  const result = await pool
    .request()
    .input("categoriaId", sql.Int, data.categoriaId)
    .input("nome", sql.NVarChar(150), data.nome)
    .input("codigoSku", sql.NVarChar(50), data.codigoSku)
    .input("descricao", sql.NVarChar(1000), data.descricao)
    .input("precoCusto", sql.Decimal(18, 2), data.precoCusto)
    .input("precoVenda", sql.Decimal(18, 2), data.precoVenda)
    .input("estoqueAtual", sql.Int, data.estoqueAtual)
    .input("estoqueMinimo", sql.Int, data.estoqueMinimo)
    .input("ativo", sql.Bit, data.ativo)
    .query(`
      INSERT INTO dbo.produtos (
        categoria_id,
        nome,
        codigo_sku,
        descricao,
        preco_custo,
        preco_venda,
        estoque_atual,
        estoque_minimo,
        ativo,
        created_at,
        updated_at
      )
      OUTPUT inserted.*
      VALUES (
        @categoriaId,
        @nome,
        @codigoSku,
        @descricao,
        @precoCusto,
        @precoVenda,
        @estoqueAtual,
        @estoqueMinimo,
        @ativo,
        GETDATE(),
        GETDATE()
      );
    `);

  return findProdutoById(result.recordset[0]?.id);
}

export async function listProdutos() {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      p.id,
      p.categoria_id,
      c.nome AS categoria_nome,
      p.nome,
      p.codigo_sku,
      p.descricao,
      p.preco_custo,
      p.preco_venda,
      p.estoque_atual,
      p.estoque_minimo,
      p.ativo,
      p.created_at,
      p.updated_at
    FROM dbo.produtos p
    LEFT JOIN dbo.categorias_produto c ON c.id = p.categoria_id
    ORDER BY p.id DESC;
  `);

  return (result.recordset || []).map((row) => mapProduto(row));
}

export async function findProdutoById(id) {
  const produtoId = normalizeId(id);
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, produtoId)
    .query(`
      SELECT
        p.id,
        p.categoria_id,
        c.nome AS categoria_nome,
        p.nome,
        p.codigo_sku,
        p.descricao,
        p.preco_custo,
        p.preco_venda,
        p.estoque_atual,
        p.estoque_minimo,
        p.ativo,
        p.created_at,
        p.updated_at
      FROM dbo.produtos p
      LEFT JOIN dbo.categorias_produto c ON c.id = p.categoria_id
      WHERE p.id = @id;
    `);

  return mapProduto(result.recordset[0] || null);
}

export async function updateProduto(id, payload) {
  const produtoId = normalizeId(id);
  const data = validateProdutoPayload(payload);
  const pool = await getPool();

  await ensureCategoriaExists(pool, data.categoriaId);

  const result = await pool
    .request()
    .input("id", sql.Int, produtoId)
    .input("categoriaId", sql.Int, data.categoriaId)
    .input("nome", sql.NVarChar(150), data.nome)
    .input("codigoSku", sql.NVarChar(50), data.codigoSku)
    .input("descricao", sql.NVarChar(1000), data.descricao)
    .input("precoCusto", sql.Decimal(18, 2), data.precoCusto)
    .input("precoVenda", sql.Decimal(18, 2), data.precoVenda)
    .input("estoqueAtual", sql.Int, data.estoqueAtual)
    .input("estoqueMinimo", sql.Int, data.estoqueMinimo)
    .input("ativo", sql.Bit, data.ativo)
    .query(`
      UPDATE dbo.produtos
      SET
        categoria_id = @categoriaId,
        nome = @nome,
        codigo_sku = @codigoSku,
        descricao = @descricao,
        preco_custo = @precoCusto,
        preco_venda = @precoVenda,
        estoque_atual = @estoqueAtual,
        estoque_minimo = @estoqueMinimo,
        ativo = @ativo,
        updated_at = GETDATE()
      WHERE id = @id;
    `);

  if (!result.rowsAffected[0]) return null;

  return findProdutoById(produtoId);
}

export async function deactivateProduto(id) {
  const produtoId = normalizeId(id);
  const pool = await getPool();

  const result = await pool
    .request()
    .input("id", sql.Int, produtoId)
    .query(`
      UPDATE dbo.produtos
      SET
        ativo = 0,
        updated_at = GETDATE()
      WHERE id = @id;
    `);

  if (!result.rowsAffected[0]) return null;

  return findProdutoById(produtoId);
}
