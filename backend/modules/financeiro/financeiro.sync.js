import { getPool } from "../../config/db.js";

const CLOSED_OS_STATUS = ["entregue", "finalizado"];

async function getColumnNames(pool, tableName) {
  const result = await pool.request().query(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'dbo'
      AND TABLE_NAME = '${tableName}'
    ORDER BY ORDINAL_POSITION;
  `);

  return new Set((result.recordset || []).map((row) => String(row.COLUMN_NAME || "").toLowerCase()));
}

function hasColumn(columns, name) {
  return columns.has(String(name || "").toLowerCase());
}

export async function syncFinanceiroFromBusinessData() {
  const pool = await getPool();

  const osColumns = await getColumnNames(pool, "ordens_servico");
  const financialColumns = await getColumnNames(pool, "financeiro_lancamentos");

  const osValueColumn = hasColumn(osColumns, "valor_final")
    ? "valor_final"
    : hasColumn(osColumns, "valor_total")
      ? "valor_total"
      : null;

  const syncSalesResult = await pool.request().query(`
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
    SELECT
      v.cliente_id,
      v.id,
      NULL,
      'receita',
      'venda',
      CONCAT('Receita da venda #', v.id),
      v.valor_total,
      v.forma_pagamento,
      ISNULL(v.data_venda, GETDATE()),
      'pago',
      GETDATE(),
      GETDATE()
    FROM dbo.vendas v
    LEFT JOIN dbo.financeiro_lancamentos f
      ON f.venda_id = v.id
     AND f.tipo = 'receita'
    WHERE f.id IS NULL
      AND ISNULL(v.valor_total, 0) > 0;

    SELECT @@ROWCOUNT AS inserted_sales;
  `);

  let insertedOs = 0;

  if (osValueColumn) {
    const includeCliente = hasColumn(financialColumns, "cliente_id") && hasColumn(osColumns, "cliente_id");
    const includeFormaPagamento =
      hasColumn(financialColumns, "forma_pagamento") && hasColumn(osColumns, "forma_pagamento");

    const osResult = await pool.request().query(`
      INSERT INTO dbo.financeiro_lancamentos (
        ${includeCliente ? "cliente_id," : ""}
        venda_id,
        ordem_servico_id,
        tipo,
        categoria,
        descricao,
        valor,
        ${includeFormaPagamento ? "forma_pagamento," : ""}
        data_lancamento,
        status,
        created_at,
        updated_at
      )
      SELECT
        ${includeCliente ? "os.cliente_id," : ""}
        NULL,
        os.id,
        'receita',
        'servico_tecnico',
        CONCAT('Receita da OS #', os.id),
        os.${osValueColumn},
        ${includeFormaPagamento ? "os.forma_pagamento," : ""}
        GETDATE(),
        'pago',
        GETDATE(),
        GETDATE()
      FROM dbo.ordens_servico os
      LEFT JOIN dbo.financeiro_lancamentos f
        ON f.ordem_servico_id = os.id
       AND f.tipo = 'receita'
      WHERE f.id IS NULL
        AND LOWER(LTRIM(RTRIM(os.status))) IN (${CLOSED_OS_STATUS.map((status) => `'${status}'`).join(", ")})
        AND ISNULL(os.${osValueColumn}, 0) > 0;

      SELECT @@ROWCOUNT AS inserted_os;
    `);

    insertedOs = Number(osResult.recordset?.[0]?.inserted_os || 0);
  }

  return {
    insertedSales: Number(syncSalesResult.recordset?.[0]?.inserted_sales || 0),
    insertedOs,
    osValueColumnUsed: osValueColumn,
  };
}

