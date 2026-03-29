import { getPool, sql } from "../../config/db.js";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Number(toNumber(value).toFixed(2));
}

export async function getFinanceiroOverview({ startDate, endDate }) {
  const pool = await getPool();
  const request = pool.request();
  request.input("startDate", sql.Date, startDate);
  request.input("endDate", sql.Date, endDate);

  const summaryResult = await request.query(`
    WITH lanc AS (
      SELECT
        id,
        venda_id,
        ordem_servico_id,
        tipo,
        categoria,
        descricao,
        valor,
        forma_pagamento,
        data_lancamento,
        status
      FROM dbo.financeiro_lancamentos
      WHERE CAST(data_lancamento AS DATE) BETWEEN @startDate AND @endDate
    )
    SELECT
      receitas = ISNULL(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0),
      despesas = ISNULL(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0),
      retirada_dono = ISNULL(SUM(CASE WHEN categoria = 'retirada_dono' THEN valor ELSE 0 END), 0),
      total_lancamentos = COUNT(1)
    FROM lanc;
  `);

  const salesResult = await pool
    .request()
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate)
    .query(`
      SELECT
        total_vendas = COUNT(1),
        valor_vendas = ISNULL(SUM(valor_total), 0)
      FROM dbo.vendas
      WHERE CAST(data_venda AS DATE) BETWEEN @startDate AND @endDate;
    `);

  const dailyResult = await pool
    .request()
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate)
    .query(`
      SELECT
        dia = CONVERT(varchar(10), CAST(data_lancamento AS DATE), 23),
        receitas = ISNULL(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0),
        despesas = ISNULL(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
      FROM dbo.financeiro_lancamentos
      WHERE CAST(data_lancamento AS DATE) BETWEEN @startDate AND @endDate
      GROUP BY CAST(data_lancamento AS DATE)
      ORDER BY CAST(data_lancamento AS DATE) ASC;
    `);

  const categoryResult = await pool
    .request()
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate)
    .query(`
      SELECT
        categoria = ISNULL(NULLIF(LTRIM(RTRIM(categoria)), ''), 'sem_categoria'),
        receita = ISNULL(SUM(CASE WHEN tipo = 'receita' THEN valor ELSE 0 END), 0),
        despesa = ISNULL(SUM(CASE WHEN tipo = 'despesa' THEN valor ELSE 0 END), 0)
      FROM dbo.financeiro_lancamentos
      WHERE CAST(data_lancamento AS DATE) BETWEEN @startDate AND @endDate
      GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(categoria)), ''), 'sem_categoria')
      ORDER BY categoria ASC;
    `);

  const recentResult = await pool
    .request()
    .input("startDate", sql.Date, startDate)
    .input("endDate", sql.Date, endDate)
    .query(`
      SELECT TOP 12
        id,
        descricao,
        tipo,
        valor,
        status,
        data_lancamento
      FROM dbo.financeiro_lancamentos
      WHERE CAST(data_lancamento AS DATE) BETWEEN @startDate AND @endDate
      ORDER BY data_lancamento DESC, id DESC;
    `);

  const summaryRow = summaryResult.recordset[0] || {};
  const salesRow = salesResult.recordset[0] || {};

  const receitas = roundMoney(summaryRow.receitas);
  const despesas = roundMoney(summaryRow.despesas);
  const lucroLiquido = roundMoney(receitas - despesas);
  const totalVendas = toNumber(salesRow.total_vendas);
  const ticketMedio = totalVendas > 0 ? roundMoney(toNumber(salesRow.valor_vendas) / totalVendas) : 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const totalDays = Math.max(diffDays, 1);
  const mediaDiaria = roundMoney(receitas / totalDays);

  const retiradaDono = roundMoney(summaryRow.retirada_dono);
  const caixaEstabelecimento = roundMoney(Math.max(lucroLiquido - retiradaDono, 0));
  const despesasOrcamento = roundMoney(despesas);

  const dailyRevenueData = (dailyResult.recordset || []).map((row) => {
    const faturamento = roundMoney(row.receitas);
    const despesaDia = roundMoney(row.despesas);
    return {
      dia: String(row.dia || "").slice(-2),
      faturamento,
      lucro: roundMoney(faturamento - despesaDia),
    };
  });

  const categoryData = (categoryResult.recordset || []).map((row) => ({
    categoria: String(row.categoria || "sem_categoria"),
    receita: roundMoney(row.receita),
    despesa: roundMoney(row.despesa),
  }));

  const divisionData = [
    { name: "Retirada do dono", value: retiradaDono },
    { name: "Caixa do estabelecimento", value: caixaEstabelecimento },
    { name: "Orcamento/despesas", value: despesasOrcamento },
    { name: "Lucro liquido", value: Math.max(lucroLiquido, 0) },
  ].filter((item) => item.value > 0);

  const recentTransactions = (recentResult.recordset || []).map((row) => ({
    id: `FIN-${row.id}`,
    descricao: String(row.descricao || "Lancamento financeiro"),
    tipo: String(row.tipo || ""),
    valor: roundMoney(row.valor),
    status: String(row.status || ""),
    dataLancamento: row.data_lancamento ? new Date(row.data_lancamento).toISOString() : null,
  }));

  return {
    metrics: {
      faturamentoBruto: receitas,
      lucroLiquido,
      despesasReais: despesas,
      orcamentoDespesas: despesasOrcamento,
      ticketMedio,
      mediaDiaria,
      caixaEstabelecimento,
      retiradaDono,
      totalVendas,
      totalLancamentos: toNumber(summaryRow.total_lancamentos),
    },
    dailyRevenueData,
    divisionData,
    categoryData,
    recentTransactions,
    financialHealth: {
      margemLiquidaPercent: receitas > 0 ? roundMoney((lucroLiquido / receitas) * 100) : 0,
      saldoPeriodo: roundMoney(lucroLiquido),
      periodo: { startDate, endDate, totalDays },
    },
  };
}

