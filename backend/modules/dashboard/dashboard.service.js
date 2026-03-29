import { getPool, sql } from "../../config/db.js";

function toNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

export async function getDashboardSummary(filters = {}) {
  const pool = await getPool();
  const startDate = filters.startDate || null;
  const endDate = filters.endDate || null;
  const useRange = Boolean(startDate && endDate);

  const request = pool.request();
  request.input("useRange", sql.Bit, useRange ? 1 : 0);
  request.input("startDate", sql.Date, startDate);
  request.input("endDate", sql.Date, endDate);

  const result = await request.query(`
    SELECT
      total_os_abertas = (
        SELECT COUNT(1)
        FROM dbo.ordens_servico
        WHERE LOWER(LTRIM(RTRIM(status))) IN ('recebido', 'em_analise', 'em_conserto', 'em analise', 'em conserto')
          AND (
            (@useRange = 1 AND CAST(created_at AS DATE) BETWEEN @startDate AND @endDate)
            OR (@useRange = 0 AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE))
          )
      ),
      total_os_prontas = (
        SELECT COUNT(1)
        FROM dbo.ordens_servico
        WHERE LOWER(LTRIM(RTRIM(status))) = 'pronto'
          AND (
            (@useRange = 1 AND CAST(created_at AS DATE) BETWEEN @startDate AND @endDate)
            OR (@useRange = 0 AND CAST(created_at AS DATE) = CAST(GETDATE() AS DATE))
          )
      ),
      total_vendas_dia = (
        SELECT COUNT(1)
        FROM dbo.vendas
        WHERE (
          (@useRange = 1 AND CAST(data_venda AS DATE) BETWEEN @startDate AND @endDate)
          OR (@useRange = 0 AND CAST(data_venda AS DATE) = CAST(GETDATE() AS DATE))
        )
      ),
      valor_vendas_dia = (
        SELECT ISNULL(SUM(valor_total), 0)
        FROM dbo.vendas
        WHERE (
          (@useRange = 1 AND CAST(data_venda AS DATE) BETWEEN @startDate AND @endDate)
          OR (@useRange = 0 AND CAST(data_venda AS DATE) = CAST(GETDATE() AS DATE))
        )
      ),
      valor_servicos_dia = (
        SELECT ISNULL(SUM(valor), 0)
        FROM dbo.financeiro_lancamentos
        WHERE (
          (@useRange = 1 AND CAST(data_lancamento AS DATE) BETWEEN @startDate AND @endDate)
          OR (@useRange = 0 AND CAST(data_lancamento AS DATE) = CAST(GETDATE() AS DATE))
        )
          AND tipo = 'receita'
          AND (
            categoria = 'servico_tecnico'
            OR ordem_servico_id IS NOT NULL
          )
      ),
      total_produtos = (
        SELECT COUNT(1)
        FROM dbo.produtos
        WHERE ativo = 1
      ),
      produtos_estoque_baixo = (
        SELECT COUNT(1)
        FROM dbo.produtos
        WHERE ativo = 1
          AND estoque_atual <= estoque_minimo
      );
  `);

  const row = result.recordset[0] || {};

  return {
    total_os_abertas: toNumber(row.total_os_abertas),
    total_os_prontas: toNumber(row.total_os_prontas),
    total_vendas_dia: toNumber(row.total_vendas_dia),
    valor_vendas_dia: toNumber(row.valor_vendas_dia),
    valor_servicos_dia: toNumber(row.valor_servicos_dia),
    total_produtos: toNumber(row.total_produtos),
    produtos_estoque_baixo: toNumber(row.produtos_estoque_baixo),
  };
}
