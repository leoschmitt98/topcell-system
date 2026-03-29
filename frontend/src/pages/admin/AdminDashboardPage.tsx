import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Boxes, ClipboardList, DollarSign, PackageCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet } from "@/lib/api";

type DashboardSummary = {
  total_os_abertas: number;
  total_os_prontas: number;
  total_vendas_dia: number;
  valor_vendas_dia: number;
  valor_servicos_dia: number;
  total_produtos: number;
  produtos_estoque_baixo: number;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

const emptySummary: DashboardSummary = {
  total_os_abertas: 0,
  total_os_prontas: 0,
  total_vendas_dia: 0,
  valor_vendas_dia: 0,
  valor_servicos_dia: 0,
  total_produtos: 0,
  produtos_estoque_baixo: 0,
};

export default function AdminDashboardPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dataInicial, setDataInicial] = useState(today);
  const [dataFinal, setDataFinal] = useState(today);
  const [filtroAplicado, setFiltroAplicado] = useState({ dataInicial: today, dataFinal: today });

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          data_inicial: filtroAplicado.dataInicial,
          data_final: filtroAplicado.dataFinal,
        });

        const response = await apiGet<ApiResponse<DashboardSummary>>(`/api/dashboard?${params.toString()}`);
        if (!active) return;

        setSummary({
          total_os_abertas: Number(response.data?.total_os_abertas || 0),
          total_os_prontas: Number(response.data?.total_os_prontas || 0),
          total_vendas_dia: Number(response.data?.total_vendas_dia || 0),
          valor_vendas_dia: Number(response.data?.valor_vendas_dia || 0),
          valor_servicos_dia: Number(response.data?.valor_servicos_dia || 0),
          total_produtos: Number(response.data?.total_produtos || 0),
          produtos_estoque_baixo: Number(response.data?.produtos_estoque_baixo || 0),
        });
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar o dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [filtroAplicado]);

  const valorPeriodo = useMemo(
    () => Number(summary.valor_vendas_dia || 0) + Number(summary.valor_servicos_dia || 0),
    [summary.valor_vendas_dia, summary.valor_servicos_dia]
  );

  const cards = [
    {
      label: "OS em aberto",
      value: String(summary.total_os_abertas),
      helper: "Recebido, em analise e em conserto no periodo",
      icon: ClipboardList,
    },
    {
      label: "OS prontas",
      value: String(summary.total_os_prontas),
      helper: "Aguardando entrega ao cliente no periodo",
      icon: PackageCheck,
    },
    {
      label: "Vendas no periodo",
      value: String(summary.total_vendas_dia),
      helper: `${formatMoney(summary.valor_vendas_dia)} em vendas`,
      icon: DollarSign,
    },
    {
      label: "Valor no periodo",
      value: formatMoney(valorPeriodo),
      helper: `${formatMoney(summary.valor_servicos_dia)} em servicos`,
      icon: Sparkles,
    },
    {
      label: "Produtos cadastrados",
      value: String(summary.total_produtos),
      helper: "Somente produtos ativos",
      icon: Boxes,
    },
    {
      label: "Estoque baixo",
      value: String(summary.produtos_estoque_baixo),
      helper: "Produtos abaixo do estoque minimo",
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="space-y-6" data-cy="admin-dashboard-page">
      <header className="admin-hero p-5 md:p-6">
        <h1 className="admin-title">Dashboard</h1>
        <p className="admin-subtitle">Visao executiva da operacao da assistencia tecnica e da loja.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto]">
          <div className="space-y-1">
            <label htmlFor="dashboard-data-inicial" className="text-xs font-medium text-blue-100/75">
              Data inicial
            </label>
            <Input
              id="dashboard-data-inicial"
              type="date"
              value={dataInicial}
              onChange={(event) => setDataInicial(event.target.value)}
              className="bg-slate-950/70"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="dashboard-data-final" className="text-xs font-medium text-blue-100/75">
              Data final
            </label>
            <Input
              id="dashboard-data-final"
              type="date"
              value={dataFinal}
              onChange={(event) => setDataFinal(event.target.value)}
              className="bg-slate-950/70"
            />
          </div>
          <Button
            type="button"
            className="self-end"
            onClick={() => setFiltroAplicado({ dataInicial, dataFinal })}
            disabled={loading || !dataInicial || !dataFinal}
          >
            Aplicar filtro
          </Button>
          <Button
            type="button"
            variant="outline"
            className="self-end border-primary/30 bg-primary/10 text-primary"
            onClick={() => {
              setDataInicial(today);
              setDataFinal(today);
              setFiltroAplicado({ dataInicial: today, dataFinal: today });
            }}
            disabled={loading}
          >
            Hoje
          </Button>
        </div>
      </header>

      {error ? (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      ) : null}

      {loading ? <p className="text-sm text-blue-100/75">Carregando indicadores...</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((item) => (
          <Card key={item.label} className="admin-stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-blue-100/75">
                {item.label}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <item.icon size={16} />
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold tracking-tight text-white">{item.value}</p>
              <p className="text-xs text-blue-100/65">{item.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

