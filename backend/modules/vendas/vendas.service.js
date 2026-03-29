import { getPool, sql } from "../../config/db.js";

function normalizeId(value, fieldName = "id") {
  const numericId = Number(value);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`${fieldName} invalido`);
  }
  return numericId;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function validateVendaPayload(payload) {
  const itens = Array.isArray(payload?.itens) ? payload.itens : [];
  if (!itens.length) throw new Error("itens e obrigatorio");

  const normalizedItems = itens.map((item, index) => {
    const produtoId = normalizeId(item?.produto_id, `itens[${index}].produto_id`);
    const quantidade = Math.trunc(toNumber(item?.quantidade, 0));
    if (quantidade <= 0) {
      throw new Error(`itens[${index}].quantidade invalida`);
    }

    return {
      produtoId,
      quantidade,
    };
  });

  const clienteIdRaw = payload?.cliente_id;
  const clienteId = clienteIdRaw == null || clienteIdRaw === "" ? null : normalizeId(clienteIdRaw, "cliente_id");

  const descontoValor = Math.max(0, toNumber(payload?.desconto_valor, 0));
  const acrescimoValor = Math.max(0, toNumber(payload?.acrescimo_valor, 0));
  const formaPagamento = normalizeText(payload?.forma_pagamento) || null;
  const observacoes = normalizeText(payload?.observacoes) || null;

  return {
    clienteId,
    itens: normalizedItems,
    descontoValor,
    acrescimoValor,
    formaPagamento,
    observacoes,
  };
}

async function findVendaById(txOrPool, vendaId) {
  const result = await txOrPool
    .request()
    .input("vendaId", sql.Int, vendaId)
    .query(`
      SELECT
        v.id,
        v.cliente_id,
        c.nome AS cliente_nome,
        v.numero_venda,
        v.data_venda,
        v.desconto_valor,
        v.acrescimo_valor,
        v.valor_total,
        v.forma_pagamento,
        v.status,
        v.observacoes,
        v.created_at,
        v.updated_at,
        (
          SELECT COUNT(1)
          FROM dbo.venda_itens vi
          WHERE vi.venda_id = v.id
        ) AS itens_count
      FROM dbo.vendas v
      LEFT JOIN dbo.clientes c ON c.id = v.cliente_id
      WHERE v.id = @vendaId;
    `);

  const row = result.recordset[0] || null;
  if (!row) return null;

  const itemsResult = await txOrPool
    .request()
    .input("vendaId", sql.Int, vendaId)
    .query(`
      SELECT
        vi.id,
        vi.venda_id,
        vi.produto_id,
        p.nome AS produto_nome,
        vi.quantidade,
        vi.preco_unitario,
        vi.desconto_valor,
        vi.total_item
      FROM dbo.venda_itens vi
      INNER JOIN dbo.produtos p ON p.id = vi.produto_id
      WHERE vi.venda_id = @vendaId
      ORDER BY vi.id ASC;
    `);

  return {
    id: Number(row.id),
    clienteId: row.cliente_id == null ? null : Number(row.cliente_id),
    clienteNome: row.cliente_nome == null ? null : String(row.cliente_nome),
    numeroVenda: row.numero_venda == null ? null : String(row.numero_venda),
    dataVenda: row.data_venda ? new Date(row.data_venda).toISOString() : null,
    descontoValor: Number(row.desconto_valor || 0),
    acrescimoValor: Number(row.acrescimo_valor || 0),
    valorTotal: Number(row.valor_total || 0),
    formaPagamento: row.forma_pagamento == null ? null : String(row.forma_pagamento),
    status: String(row.status || ""),
    observacoes: row.observacoes == null ? null : String(row.observacoes),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    itensCount: Number(row.itens_count || 0),
    itens: (itemsResult.recordset || []).map((item) => ({
      id: Number(item.id),
      produtoId: Number(item.produto_id),
      produtoNome: String(item.produto_nome || ""),
      quantidade: Number(item.quantidade || 0),
      precoUnitario: Number(item.preco_unitario || 0),
      descontoValor: Number(item.desconto_valor || 0),
      totalItem: Number(item.total_item || 0),
    })),
  };
}

export async function createVenda(payload) {
  const data = validateVendaPayload(payload);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const itensComProduto = [];
    let subtotal = 0;

    for (const item of data.itens) {
      const productResult = await transaction
        .request()
        .input("produtoId", sql.Int, item.produtoId)
        .query(`
          SELECT id, nome, preco_venda, estoque_atual, ativo
          FROM dbo.produtos WITH (UPDLOCK, ROWLOCK)
          WHERE id = @produtoId;
        `);

      const produto = productResult.recordset[0] || null;
      if (!produto) throw new Error(`Produto ${item.produtoId} nao encontrado`);
      if (!produto.ativo) throw new Error(`Produto ${item.produtoId} inativo`);

      const estoqueAtual = Number(produto.estoque_atual || 0);
      if (estoqueAtual < item.quantidade) {
        throw new Error(`Estoque insuficiente para o produto ${item.produtoId}`);
      }

      const precoUnitario = Number(produto.preco_venda || 0);
      const totalItem = Number((precoUnitario * item.quantidade).toFixed(2));
      subtotal += totalItem;

      itensComProduto.push({
        ...item,
        nome: String(produto.nome || ""),
        precoUnitario,
        totalItem,
        estoqueAtual,
      });
    }

    const total = Number((subtotal - data.descontoValor + data.acrescimoValor).toFixed(2));
    if (total < 0) throw new Error("valor_total da venda nao pode ser negativo");

    const vendaResult = await transaction
      .request()
      .input("clienteId", sql.Int, data.clienteId)
      .input("descontoValor", sql.Decimal(18, 2), data.descontoValor)
      .input("acrescimoValor", sql.Decimal(18, 2), data.acrescimoValor)
      .input("valorTotal", sql.Decimal(18, 2), total)
      .input("formaPagamento", sql.NVarChar(40), data.formaPagamento)
      .input("observacoes", sql.NVarChar(1000), data.observacoes)
      .query(`
        INSERT INTO dbo.vendas (
          cliente_id,
          data_venda,
          desconto_valor,
          acrescimo_valor,
          valor_total,
          forma_pagamento,
          status,
          observacoes,
          created_at,
          updated_at
        )
        OUTPUT inserted.id
        VALUES (
          @clienteId,
          GETDATE(),
          @descontoValor,
          @acrescimoValor,
          @valorTotal,
          @formaPagamento,
          'concluida',
          @observacoes,
          GETDATE(),
          GETDATE()
        );
      `);

    const vendaId = Number(vendaResult.recordset[0]?.id || 0);
    if (!vendaId) throw new Error("Falha ao criar venda");

    for (const item of itensComProduto) {
      const saldoPosterior = item.estoqueAtual - item.quantidade;

      await transaction
        .request()
        .input("vendaId", sql.Int, vendaId)
        .input("produtoId", sql.Int, item.produtoId)
        .input("quantidade", sql.Int, item.quantidade)
        .input("precoUnitario", sql.Decimal(18, 2), item.precoUnitario)
        .input("totalItem", sql.Decimal(18, 2), item.totalItem)
        .query(`
          INSERT INTO dbo.venda_itens (
            venda_id,
            produto_id,
            quantidade,
            preco_unitario,
            desconto_valor,
            total_item,
            created_at,
            updated_at
          )
          VALUES (
            @vendaId,
            @produtoId,
            @quantidade,
            @precoUnitario,
            0,
            @totalItem,
            GETDATE(),
            GETDATE()
          );
        `);

      await transaction
        .request()
        .input("produtoId", sql.Int, item.produtoId)
        .input("quantidade", sql.Int, item.quantidade)
        .query(`
          UPDATE dbo.produtos
          SET
            estoque_atual = estoque_atual - @quantidade,
            updated_at = GETDATE()
          WHERE id = @produtoId;
        `);

      await transaction
        .request()
        .input("produtoId", sql.Int, item.produtoId)
        .input("vendaId", sql.Int, vendaId)
        .input("quantidade", sql.Int, item.quantidade)
        .input("saldoAnterior", sql.Int, item.estoqueAtual)
        .input("saldoPosterior", sql.Int, saldoPosterior)
        .input("observacao", sql.NVarChar(1000), `Saida por venda #${vendaId}`)
        .query(`
          INSERT INTO dbo.estoque_movimentacoes (
            produto_id,
            tipo_movimentacao,
            origem,
            referencia_tabela,
            referencia_id,
            quantidade,
            saldo_anterior,
            saldo_posterior,
            observacao,
            created_at
          )
          VALUES (
            @produtoId,
            'saida',
            'venda',
            'vendas',
            @vendaId,
            @quantidade,
            @saldoAnterior,
            @saldoPosterior,
            @observacao,
            GETDATE()
          );
        `);
    }

    await transaction
      .request()
      .input("vendaId", sql.Int, vendaId)
      .input("clienteId", sql.Int, data.clienteId)
      .input("valor", sql.Decimal(18, 2), total)
      .input("formaPagamento", sql.NVarChar(40), data.formaPagamento)
      .query(`
        INSERT INTO dbo.financeiro_lancamentos (
          cliente_id,
          venda_id,
          ordem_servico_id,
          tipo,
          categoria,
          descricao,
          valor,
          forma_pagamento,
          data_lancamento,
          status,
          created_at,
          updated_at
        )
        VALUES (
          @clienteId,
          @vendaId,
          NULL,
          'receita',
          'venda',
          CONCAT('Receita da venda #', @vendaId),
          @valor,
          @formaPagamento,
          GETDATE(),
          'pago',
          GETDATE(),
          GETDATE()
        );
      `);

    await transaction.commit();

    return findVendaById(pool, vendaId);
  } catch (error) {
    if (transaction._aborted !== true) {
      await transaction.rollback();
    }
    throw error;
  }
}

export async function listVendas() {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT
      v.id,
      v.cliente_id,
      c.nome AS cliente_nome,
      v.numero_venda,
      v.data_venda,
      v.valor_total,
      v.forma_pagamento,
      v.status,
      v.created_at,
      (
        SELECT COUNT(1)
        FROM dbo.venda_itens vi
        WHERE vi.venda_id = v.id
      ) AS itens_count
    FROM dbo.vendas v
    LEFT JOIN dbo.clientes c ON c.id = v.cliente_id
    ORDER BY v.id DESC;
  `);

  return (result.recordset || []).map((row) => ({
    id: Number(row.id),
    clienteId: row.cliente_id == null ? null : Number(row.cliente_id),
    clienteNome: row.cliente_nome == null ? null : String(row.cliente_nome),
    numeroVenda: row.numero_venda == null ? null : String(row.numero_venda),
    dataVenda: row.data_venda ? new Date(row.data_venda).toISOString() : null,
    valorTotal: Number(row.valor_total || 0),
    formaPagamento: row.forma_pagamento == null ? null : String(row.forma_pagamento),
    status: String(row.status || ""),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    itensCount: Number(row.itens_count || 0),
  }));
}
