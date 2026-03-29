import { FormEvent, useMemo, useState } from "react";
import { BadgeAlert, CheckCircle2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";

type OSData = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  aparelho: string;
  problema: string;
  status: string;
  valorTotal: number;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const osSteps = ["recebido", "em_analise", "aguardando_aprovacao", "em_conserto", "pronto", "entregue"];

function normalizeStatus(status: string) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function formatStatusLabel(status: string) {
  const value = normalizeStatus(status);
  if (value === "em_analise") return "Em analise";
  if (value === "aguardando_aprovacao") return "Aguardando aprovacao";
  if (value === "em_conserto") return "Em conserto";
  if (value === "pronto") return "Pronto";
  if (value === "entregue") return "Entregue";
  if (value === "cancelado") return "Cancelado";
  return "Recebido";
}

export default function PublicOSStatusPage() {
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [numeroOs, setNumeroOs] = useState("");
  const [loading, setLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [resultado, setResultado] = useState<OSData | null>(null);

  const statusAtual = normalizeStatus(resultado?.status || "");
  const statusEtapa = statusAtual === "cancelado" ? "entregue" : statusAtual;
  const currentStepIndex = useMemo(() => osSteps.indexOf(statusEtapa), [statusEtapa]);

  async function handleConsultar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setDecisionMessage("");
    setResultado(null);

    if (!clienteNome.trim() || !clienteTelefone.trim() || !numeroOs.trim()) {
      setError("Preencha nome, telefone e numero da OS.");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        numero_os: numeroOs.trim(),
        cliente_nome: clienteNome.trim(),
        cliente_telefone: clienteTelefone.trim(),
      });
      const response = await apiGet<ApiResponse<OSData>>(`/api/public/os/consultar?${params.toString()}`);
      setResultado(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel consultar a OS.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(acao: "aprovar" | "cancelar") {
    if (!resultado) return;
    setDecisionLoading(true);
    setError("");
    setDecisionMessage("");

    try {
      const response = await apiPost<ApiResponse<OSData>>("/api/public/os/decisao", {
        numero_os: resultado.id,
        cliente_nome: clienteNome.trim(),
        cliente_telefone: clienteTelefone.trim(),
        acao,
      });

      setResultado(response.data);
      setDecisionMessage(
        acao === "aprovar"
          ? "Servico aprovado com sucesso. A equipe TopCell iniciara o conserto."
          : "Servico cancelado com sucesso. A loja foi notificada."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar sua decisao.");
    } finally {
      setDecisionLoading(false);
    }
  }

  return (
    <section className="space-y-6" data-cy="public-os-status-page">
      <header className="topcell-surface-strong border-primary/30 p-6">
        <span className="topcell-tag">Consultar OS</span>
        <h1 className="mt-3 text-3xl font-bold text-white">Acompanhe o andamento da sua ordem de servico</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100/80">
          Informe os dados cadastrados para localizar sua OS. O painel de acompanhamento mostra em qual etapa o seu
          aparelho esta dentro do processo tecnico.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
        <Card className="topcell-surface topcell-card-fx border-primary/25">
          <CardHeader>
            <CardTitle className="text-xl text-white">Buscar ordem de servico</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={handleConsultar}>
              <div className="space-y-2">
                <Label htmlFor="cliente">Nome do cliente</Label>
                <Input
                  id="cliente"
                  className="bg-slate-950/65"
                  placeholder="Nome cadastrado"
                  value={clienteNome}
                  onChange={(event) => setClienteNome(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  className="bg-slate-950/65"
                  placeholder="Telefone cadastrado"
                  value={clienteTelefone}
                  onChange={(event) => setClienteTelefone(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numero-os">Numero da OS</Label>
                <Input
                  id="numero-os"
                  className="bg-slate-950/65"
                  placeholder="Ex.: 1024"
                  value={numeroOs}
                  onChange={(event) => setNumeroOs(event.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" className="rounded-full px-8 topcell-brand-gradient text-primary-foreground" disabled={loading}>
                  <Search size={16} className="mr-2" />
                  {loading ? "Consultando..." : "Consultar status"}
                </Button>
              </div>
            </form>

            {error ? (
              <div className="mt-6 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
            ) : null}

            {resultado ? (
              <div className="mt-6 rounded-xl border border-primary/35 bg-primary/10 p-4 text-sm text-blue-100/85">
                <p>
                  <strong>OS #{resultado.id}</strong> - status atual: <strong>{formatStatusLabel(resultado.status)}</strong>
                </p>
                <p className="mt-1">Aparelho: {resultado.aparelho}</p>
                <p className="mt-1">Problema: {resultado.problema}</p>
                <p className="mt-1">
                  Valor total: <strong>R$ {Number(resultado.valorTotal || 0).toFixed(2)}</strong>
                </p>

                {normalizeStatus(resultado.status) === "aguardando_aprovacao" ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-amber-300/35 bg-amber-500/10 p-3 text-amber-200">
                      Sua OS esta aguardando confirmacao. Voce pode aprovar ou cancelar o servico.
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="topcell-brand-gradient text-primary-foreground"
                        onClick={() => handleDecision("aprovar")}
                        disabled={decisionLoading}
                      >
                        {decisionLoading ? "Enviando..." : "Aprovar servico"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-400/45 bg-red-500/10 text-red-200 hover:bg-red-500/20"
                        onClick={() => handleDecision("cancelar")}
                        disabled={decisionLoading}
                      >
                        {decisionLoading ? "Enviando..." : "Cancelar servico"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {decisionMessage ? (
                  <div className="mt-3 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-3 text-emerald-200">
                    {decisionMessage}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-primary/35 bg-primary/10 p-4 text-sm text-blue-100/75">
                Informe os dados e clique em consultar para buscar sua OS.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/25">
          <CardHeader>
            <CardTitle className="text-xl text-white">Fluxo da OS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-blue-100/80">
            {osSteps.map((step, index) => {
              const isDone = currentStepIndex >= 0 && index <= currentStepIndex;
              const label = formatStatusLabel(step);

              return (
                <div key={step} className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/70 p-3">
                  {isDone ? <CheckCircle2 size={16} className="text-emerald-400" /> : <BadgeAlert size={16} className="text-primary" />}
                  <span>{label}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
