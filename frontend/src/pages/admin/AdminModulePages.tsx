import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  CircleDollarSign,
  Download,
  Landmark,
  PiggyBank,
  RefreshCcw,
  Save,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPut } from "@/lib/api";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type ModulePageProps = {
  title: string;
  description: string;
  highlights: string[];
};

function ModulePage({ title, description, highlights }: ModulePageProps) {
  return (
    <section className="space-y-6">
      <header className="admin-hero p-5 md:p-6">
        <h1 className="admin-title">{title}</h1>
        <p className="admin-subtitle">{description}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {highlights.map((item) => (
          <Card key={item} className="admin-stat-card">
            <CardHeader>
              <CardTitle className="text-base text-white">{item}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-blue-100/70">
                Estrutura visual pronta para evolução do módulo, mantendo consistência com o painel TopCell.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="admin-stat-card">
        <CardHeader>
          <CardTitle className="text-base text-white">Próxima etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/60 p-4 text-sm text-blue-100/70">
            Este módulo esta com layout base preparado para receber regras de negócio e integrações futuras.
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

type FinanceOverviewResponse = {
  metrics: {
    faturamentoBruto: number;
    lucroLiquido: number;
    despesasReais: number;
    orcamentoDespesas: number;
    ticketMedio: number;
    mediaDiaria: number;
    caixaEstabelecimento: number;
    retiradaDono: number;
    totalVendas: number;
    totalLancamentos: number;
  };
  dailyRevenueData: Array<{ dia: string; faturamento: number; lucro: number }>;
  divisionData: Array<{ name: string; value: number }>;
  categoryData: Array<{ categoria: string; receita: number; despesa: number }>;
  recentTransactions: Array<{ id: string; descricao: string; tipo: string; valor: number; status: string; dataLancamento: string | null }>;
  financialHealth: {
    margemLiquidaPercent: number;
    saldoPeriodo: number;
    periodo: { startDate: string; endDate: string; totalDays: number };
  };
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const chartColors = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(42 90% 60%)", "hsl(152 80% 46%)"];

const emptyFinanceData: FinanceOverviewResponse = {
  metrics: {
    faturamentoBruto: 0,
    lucroLiquido: 0,
    despesasReais: 0,
    orcamentoDespesas: 0,
    ticketMedio: 0,
    mediaDiaria: 0,
    caixaEstabelecimento: 0,
    retiradaDono: 0,
    totalVendas: 0,
    totalLancamentos: 0,
  },
  dailyRevenueData: [],
  divisionData: [],
  categoryData: [],
  recentTransactions: [],
  financialHealth: {
    margemLiquidaPercent: 0,
    saldoPeriodo: 0,
    periodo: { startDate: "", endDate: "", totalDays: 0 },
  },
};

export function AdminBudgetsPage() {
  type OrcamentoStatus = "pendente" | "aprovado" | "recusado" | "expirado" | "convertido_os";

  type OrcamentoItem = {
    id: number;
    clienteId: number | null;
    clienteNome: string;
    clienteTelefone: string;
    ordemServicoId: number | null;
    descricao: string | null;
    valorEstimado: number | null;
    status: OrcamentoStatus;
    validadeEm: string | null;
    observacoes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };

  const STATUS_OPTIONS: OrcamentoStatus[] = ["pendente", "aprovado", "recusado", "expirado", "convertido_os"];
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orcamentos, setOrcamentos] = useState<OrcamentoItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, { status: OrcamentoStatus; valorEstimado: string; observacoes: string }>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  function formatDate(value: string | null) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("pt-BR");
  }

  function formatStatusLabel(value: OrcamentoStatus) {
    if (value === "convertido_os") return "Convertido em OS";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  async function loadOrcamentos() {
    setLoading(true);
    setError("");
    try {
      const response = await apiGet<ApiResponse<OrcamentoItem[]>>("/api/orcamentos");
      const list = Array.isArray(response.data) ? response.data : [];
      setOrçamentos(list);
      setDrafts(
        Object.fromEntries(
          list.map((item) => [
            item.id,
            {
              status: item.status,
              valorEstimado: item.valorEstimado == null ? "" : String(item.valorEstimado),
              observacoes: item.observacoes || "",
            },
          ])
        ) as Record<number, { status: OrcamentoStatus; valorEstimado: string; observacoes: string }>
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os orçamentos.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOrcamento(id: number) {
    const draft = drafts[id];
    if (!draft) return;

    setUpdatingId(id);
    setError("");
    try {
      await apiPut<ApiResponse<OrcamentoItem>>(`/api/orcamentos/${id}`, {
        status: draft.status,
        valor_estimado: draft.valorEstimado === "" ? null : Number(draft.valorEstimado),
        observacoes: draft.observacoes,
      });
      await loadOrcamentos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o orçamento.");
    } finally {
      setUpdatingId(null);
    }
  }

  useEffect(() => {
    loadOrcamentos();
  }, []);

  const pendentes = orcamentos.filter((item) => item.status === "pendente").length;
  const aprovados = orcamentos.filter((item) => item.status === "aprovado" || item.status === "convertido_os").length;
  const recusados = orcamentos.filter((item) => item.status === "recusado" || item.status === "expirado").length;

  return (
    <section className="space-y-6" data-cy="admin-orcamentos-page">
      <header className="admin-hero p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="admin-title">Orçamentos</h1>
            <p className="admin-subtitle">Controle das solicitações dos clientes com aprovação e acompanhamento comercial.</p>
          </div>
          <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={loadOrcamentos} disabled={loading}>
            <RefreshCcw size={14} className="mr-2" />
            {loading ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </header>

      {error ? <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="admin-stat-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Fila de solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{pendentes}</p>
            <p className="text-sm text-blue-100/70">Orçamentos aguardando análise.</p>
          </CardContent>
        </Card>
        <Card className="admin-stat-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Aprovados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-300">{aprovados}</p>
            <p className="text-sm text-blue-100/70">Aprovados ou convertidos em OS.</p>
          </CardContent>
        </Card>
        <Card className="admin-stat-card">
          <CardHeader>
            <CardTitle className="text-base text-white">Recusados/expirados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-300">{recusados}</p>
            <p className="text-sm text-blue-100/70">Solicitações encerradas sem conversão.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-stat-card">
        <CardHeader>
          <CardTitle className="text-base text-white">Solicitacoes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-blue-100/70">Carregando orçamentos...</p> : null}

          {!loading && orcamentos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/60 p-4 text-sm text-blue-100/70">
              Nenhum orçamento encontrado no momento.
            </div>
          ) : null}

          {!loading &&
            orcamentos.map((item) => (
              <article key={item.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-white">Orçamento #{item.id}</h2>
                  <span className="text-xs text-blue-100/65">Criado em {formatDate(item.createdAt)}</span>
                </div>

                <div className="mt-3 grid gap-1 text-sm text-blue-100/80 md:grid-cols-2">
                  <p><strong>Cliente:</strong> {item.clienteNome || "-"}</p>
                  <p><strong>Telefone:</strong> {item.clienteTelefone || "-"}</p>
                  <p><strong>OS vinculada:</strong> {item.ordemServicoId ? `#${item.ordemServicoId}` : "-"}</p>
                  <p><strong>Status atual:</strong> {formatStatusLabel(item.status)}</p>
                  <p className="md:col-span-2"><strong>Descrição:</strong> {item.descricao || "-"}</p>
                </div>

                <div className="mt-3 grid gap-2 md:grid-cols-[220px_220px_1fr_auto] md:items-end">
                  <div className="space-y-1">
                    <Label className="text-xs text-blue-100/70">Status</Label>
                    <select
                      value={drafts[item.id]?.status || item.status}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] || {
                              status: item.status,
                              valorEstimado: item.valorEstimado == null ? "" : String(item.valorEstimado),
                              observacoes: item.observacoes || "",
                            }),
                            status: event.target.value as OrcamentoStatus,
                          },
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 text-sm text-blue-100"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-100/70">Valor estimado</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={drafts[item.id]?.valorEstimado ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] || {
                              status: item.status,
                              valorEstimado: item.valorEstimado == null ? "" : String(item.valorEstimado),
                              observacoes: item.observacoes || "",
                            }),
                            valorEstimado: event.target.value,
                          },
                        }))
                      }
                      className="bg-slate-950/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-blue-100/70">Observações internas</Label>
                    <Input
                      value={drafts[item.id]?.observacoes ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [item.id]: {
                            ...(current[item.id] || {
                              status: item.status,
                              valorEstimado: item.valorEstimado == null ? "" : String(item.valorEstimado),
                              observacoes: item.observacoes || "",
                            }),
                            observacoes: event.target.value,
                          },
                        }))
                      }
                      className="bg-slate-950/70"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary/35 bg-primary/10 text-primary"
                    onClick={() => handleUpdateOrcamento(item.id)}
                    disabled={updatingId === item.id}
                  >
                    {updatingId === item.id ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </article>
            ))}
        </CardContent>
      </Card>
    </section>
  );
}

export function AdminFinancePage() {
  const today = new Date();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const todayIso = today.toISOString().slice(0, 10);

  const [periodo, setPeriodo] = useState("mensal");
  const [dataInicial, setDataInicial] = useState(monthStart);
  const [dataFinal, setDataFinal] = useState(todayIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [financeData, setFinanceData] = useState<FinanceOverviewResponse>(emptyFinanceData);
  const [planejamento, setPlanejamento] = useState({
    retiradaDono: 20,
    caixaEstabelecimento: 35,
    despesas: 25,
    lucroLiquido: 20,
  });

  const planejamentoTotal = useMemo(
    () => planejamento.retiradaDono + planejamento.caixaEstabelecimento + planejamento.despesas + planejamento.lucroLiquido,
    [planejamento]
  );

  const divisionData = useMemo(
    () =>
      financeData.divisionData.map((item, index) => ({
        ...item,
        fill: chartColors[index % chartColors.length],
      })),
    [financeData.divisionData]
  );

  async function loadFinanceData() {
    if (!dataInicial || !dataFinal) {
      setError("Informe data inicial e data final.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        data_inicial: dataInicial,
        data_final: dataFinal,
      });
      const response = await apiGet<ApiResponse<FinanceOverviewResponse>>(`/api/financeiro?${params.toString()}`);
      setFinanceData(response.data || emptyFinanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar dados do financeiro.");
      setFinanceData(emptyFinanceData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinanceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPeriodo(value: string) {
    setPeriodo(value);
    const now = new Date();
    const end = now.toISOString().slice(0, 10);

    if (value === "diario") {
      setDataInicial(end);
      setDataFinal(end);
      return;
    }

    if (value === "semanal") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      setDataInicial(start.toISOString().slice(0, 10));
      setDataFinal(end);
      return;
    }

    setDataInicial(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`);
    setDataFinal(end);
  }

  const metricCards = [
    {
      title: "Faturamento bruto",
      value: formatMoney(financeData.metrics.faturamentoBruto),
      helper: `${financeData.metrics.totalVendas} vendas no período`,
      trend: financeData.metrics.faturamentoBruto > 0 ? "receita" : "--",
      positive: financeData.metrics.faturamentoBruto > 0,
      icon: CircleDollarSign,
    },
    {
      title: "Lucro líquido",
      value: formatMoney(financeData.metrics.lucroLiquido),
      helper: `Margem líquida: ${financeData.financialHealth.margemLiquidaPercent}%`,
      trend: financeData.metrics.lucroLiquido >= 0 ? "positivo" : "negativo",
      positive: financeData.metrics.lucroLiquido >= 0,
      icon: TrendingUp,
    },
    {
      title: "Despesas reais",
      value: formatMoney(financeData.metrics.despesasReais),
      helper: "Total de despesas no período",
      trend: financeData.metrics.despesasReais > 0 ? "ativo" : "--",
      positive: financeData.metrics.despesasReais === 0,
      icon: Wallet,
    },
    {
      title: "Orcamento despesas",
      value: formatMoney(financeData.metrics.orcamentoDespesas),
      helper: "Baseado em despesas lancadas",
      trend: financeData.metrics.orcamentoDespesas > 0 ? "em uso" : "--",
      positive: true,
      icon: Target,
    },
    {
      title: "Ticket medio",
      value: formatMoney(financeData.metrics.ticketMedio),
      helper: "Média por venda no período",
      trend: financeData.metrics.ticketMedio > 0 ? "calculado" : "--",
      positive: true,
      icon: Banknote,
    },
    {
      title: "Média diaria",
      value: formatMoney(financeData.metrics.mediaDiaria),
      helper: `${financeData.financialHealth.periodo.totalDays} dias no período`,
      trend: financeData.metrics.mediaDiaria > 0 ? "calculado" : "--",
      positive: true,
      icon: CalendarRange,
    },
    {
      title: "Caixa estabelecimento",
      value: formatMoney(financeData.metrics.caixaEstabelecimento),
      helper: "Saldo após despesas e retiradas",
      trend: financeData.metrics.caixaEstabelecimento >= 0 ? "estavel" : "atencao",
      positive: financeData.metrics.caixaEstabelecimento >= 0,
      icon: Landmark,
    },
    {
      title: "Retirada do dono",
      value: formatMoney(financeData.metrics.retiradaDono),
      helper: "Somatório por categoria retirada_dono",
      trend: financeData.metrics.retiradaDono > 0 ? "ativo" : "--",
      positive: true,
      icon: PiggyBank,
    },
  ];

  return (
    <section className="space-y-6" data-cy="admin-finance-page">
      <header className="topcell-surface-strong border-primary/30 p-5 md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Financeiro</h1>
            <p className="mt-1 text-sm text-blue-100/75">
              Painel estratégico para acompanhar receitas, despesas, composição de caixa e saúde financeira da TopCell.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="periodo">Período</Label>
              <select
                id="periodo"
                value={periodo}
                onChange={(event) => applyPeriodo(event.target.value)}
                className="flex h-10 w-full rounded-md border border-white/15 bg-slate-950/70 px-3 text-sm text-blue-100"
              >
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="dataInicial">Data inicial</Label>
              <Input id="dataInicial" type="date" value={dataInicial} onChange={(event) => setDataInicial(event.target.value)} className="bg-slate-950/70" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dataFinal">Data final</Label>
              <Input id="dataFinal" type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} className="bg-slate-950/70" />
            </div>

            <div className="flex items-end gap-2">
              <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={loadFinanceData} disabled={loading}>
                <RefreshCcw size={14} className="mr-2" />
                {loading ? "Atualizando..." : "Atualizar"}
              </Button>
              <Button type="button" variant="outline" className="border-primary/30 bg-primary/10 text-primary" disabled>
                <Download size={14} className="mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {error ? <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((item) => (
          <Card key={item.title} className="topcell-surface topcell-card-fx border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm text-blue-100/80">
                {item.title}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <item.icon size={16} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${item.positive ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {item.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {item.trend}
                </span>
                <span className="text-blue-100/70">{item.helper}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Faturamento por dia</CardTitle>
          </CardHeader>
          <CardContent>
            {financeData.dailyRevenueData.length === 0 ? (
              <div className="flex h-[290px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/60 text-sm text-blue-100/70">
                Sem dados de faturamento para o período selecionado.
              </div>
            ) : (
              <ChartContainer
                className="h-[290px] w-full"
                config={{
                  faturamento: { label: "Faturamento", color: "hsl(var(--primary))" },
                  lucro: { label: "Lucro", color: "hsl(152 80% 46%)" },
                }}
              >
                <LineChart data={financeData.dailyRevenueData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="faturamento" stroke="var(--color-faturamento)" strokeWidth={3} dot={false} />
                  <Line dataKey="lucro" stroke="var(--color-lucro)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Composição financeira</CardTitle>
          </CardHeader>
          <CardContent>
            {divisionData.length === 0 ? (
              <div className="flex h-[290px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/60 text-sm text-blue-100/70">
                Sem dados de composição financeira para o período selecionado.
              </div>
            ) : (
              <ChartContainer className="h-[290px] w-full" config={{ composicao: { label: "Composição", color: "hsl(var(--primary))" } }}>
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                  <Pie data={divisionData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={2}>
                    {divisionData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent />} />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_0.8fr]">
        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Resumo por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {financeData.categoryData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/60 text-sm text-blue-100/70">
                Sem dados por categoria para o período selecionado.
              </div>
            ) : (
              <ChartContainer
                className="h-[250px] w-full"
                config={{
                  receita: { label: "Receita", color: "hsl(var(--primary))" },
                  despesa: { label: "Despesa", color: "hsl(0 72% 52%)" },
                }}
              >
                <BarChart data={financeData.categoryData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="receita" fill="var(--color-receita)" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="despesa" fill="var(--color-despesa)" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Fluxo financeiro rápido</CardTitle>
          </CardHeader>
          <CardContent>
            {financeData.dailyRevenueData.length === 0 ? (
              <div className="flex h-[250px] items-center justify-center rounded-xl border border-dashed border-white/15 bg-slate-900/60 text-sm text-blue-100/70">
                Sem fluxo financeiro para exibir no período.
              </div>
            ) : (
              <ChartContainer
                className="h-[250px] w-full"
                config={{
                  faturamento: { label: "Faturamento", color: "hsl(var(--primary))" },
                }}
              >
                <AreaChart data={financeData.dailyRevenueData}>
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-faturamento)" stopOpacity={0.55} />
                      <stop offset="95%" stopColor="var(--color-faturamento)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area dataKey="faturamento" stroke="var(--color-faturamento)" fill="url(#colorFaturamento)" strokeWidth={2.5} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Alertas e saude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-100/65">Saúde financeira</p>
              <p className={`mt-1 text-lg font-bold ${financeData.metrics.lucroLiquido >= 0 ? "text-emerald-400" : "text-red-300"}`}>
                {financeData.metrics.lucroLiquido >= 0 ? "Positiva" : "Ajustar custos"}
              </p>
              <p className="text-xs text-blue-100/65">Margem líquida: {financeData.financialHealth.margemLiquidaPercent}%</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-100/65">Fluxo de caixa</p>
              <p className="mt-1 text-lg font-bold text-cyan-300">{formatMoney(financeData.financialHealth.saldoPeriodo)}</p>
              <p className="text-xs text-blue-100/65">Saldo acumulado no período selecionado.</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <p className="text-xs uppercase tracking-wide text-blue-100/65">Lançamentos</p>
              <p className="mt-1 text-lg font-bold text-blue-200">{financeData.metrics.totalLancamentos}</p>
              <p className="text-xs text-blue-100/65">Total de registros financeiros no período.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="topcell-surface topcell-card-fx border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Lançamentos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {financeData.recentTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-4 text-sm text-blue-100/70">
                Nenhum lançamento encontrado no período selecionado.
              </div>
            ) : (
              financeData.recentTransactions.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/70 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-white">{item.descricao}</p>
                    <p className="text-xs text-blue-100/65">
                      {item.id} • {item.tipo}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${item.valor >= 0 ? "text-emerald-300" : "text-red-300"}`}>{formatMoney(item.valor)}</p>
                    <p className="text-xs text-blue-100/65">{item.status}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Target size={17} className="text-primary" />
              Planejamento financeiro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="retiradaDono">Retirada do dono (%)</Label>
                <Input
                  id="retiradaDono"
                  type="number"
                  min={0}
                  max={100}
                  value={planejamento.retiradaDono}
                  onChange={(event) => setPlanejamento((current) => ({ ...current, retiradaDono: Number(event.target.value || 0) }))}
                  className="bg-slate-950/70"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="caixaEstabelecimento">Caixa do estabelecimento (%)</Label>
                <Input
                  id="caixaEstabelecimento"
                  type="number"
                  min={0}
                  max={100}
                  value={planejamento.caixaEstabelecimento}
                  onChange={(event) => setPlanejamento((current) => ({ ...current, caixaEstabelecimento: Number(event.target.value || 0) }))}
                  className="bg-slate-950/70"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="despesas">Orcamento de despesas (%)</Label>
                <Input
                  id="despesas"
                  type="number"
                  min={0}
                  max={100}
                  value={planejamento.despesas}
                  onChange={(event) => setPlanejamento((current) => ({ ...current, despesas: Number(event.target.value || 0) }))}
                  className="bg-slate-950/70"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lucroLiquido">Lucro líquido alvo (%)</Label>
                <Input
                  id="lucroLiquido"
                  type="number"
                  min={0}
                  max={100}
                  value={planejamento.lucroLiquido}
                  onChange={(event) => setPlanejamento((current) => ({ ...current, lucroLiquido: Number(event.target.value || 0) }))}
                  className="bg-slate-950/70"
                />
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-3">
              <div className="mb-2 flex items-center justify-between text-xs text-blue-100/75">
                <span>Total configurado</span>
                <span className={planejamentoTotal === 100 ? "text-emerald-300" : "text-amber-300"}>{planejamentoTotal}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800">
                <div className={`h-2 rounded-full transition-all ${planejamentoTotal === 100 ? "bg-emerald-400" : "bg-amber-400"}`} style={{ width: `${Math.min(planejamentoTotal, 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-blue-100/65">
                {planejamentoTotal === 100
                  ? "Distribuição equilibrada. Pronto para salvar configuração."
                  : "Ajuste os percentuais para fechar em 100% e manter consistência da estratégia."}
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-primary/25 bg-primary/10 p-3 text-sm">
              <div className="flex items-center gap-2 text-blue-100/85">
                <AlertTriangle size={15} className="text-primary" />
                Alerta de orçamento ativo
              </div>
              <Button type="button" className="topcell-brand-gradient text-primary-foreground">
                <Save size={14} className="mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

export function AdminSupportPage() {
  return (
    <ModulePage
      title="Atendimento"
      description="Canal interno para mensagens, suporte e acompanhamento de clientes."
      highlights={["Conversas em aberto", "Triagem de dúvidas", "Histórico de atendimento"]}
    />
  );
}


