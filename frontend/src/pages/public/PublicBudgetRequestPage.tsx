import { FormEvent, useState } from "react";
import { BadgeCheck, ClipboardCheck, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiPost } from "@/lib/api";

const benefits = [
  "Triagem técnica inicial com retorno ágil",
  "Previsão de atendimento com transparência",
  "Canal direto para acompanhamento do pedido",
];

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

type BudgetResponse = {
  osId: number;
  status: string;
  mensagem: string;
};

export default function PublicBudgetRequestPage() {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [aparelho, setAparelho] = useState("");
  const [problema, setProblema] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!nome.trim() || !telefone.trim() || !aparelho.trim() || !problema.trim()) {
      setError("Preencha todos os campos para enviar a solicitação.");
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost<ApiResponse<BudgetResponse>>("/api/public/orcamentos", {
        nome: nome.trim(),
        telefone: telefone.trim(),
        aparelho: aparelho.trim(),
        problema: problema.trim(),
      });

      setSuccess(`Solicitação enviada. Número da OS: #${response.data.osId}.`);
      setNome("");
      setTelefone("");
      setAparelho("");
      setProblema("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6" data-cy="public-budget-page">
      <header className="topcell-surface-strong border-primary/30 p-6">
        <span className="topcell-tag">Solicitar orçamento</span>
        <h1 className="mt-3 text-3xl font-bold text-white">Conte o problema e receba avaliação técnica da TopCell</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100/80">
          Preencha os campos abaixo para abrir sua solicitação. Nossa equipe usa essas informações para iniciar o
          diagnóstico e direcionar o melhor atendimento.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="topcell-surface topcell-card-fx border-primary/25">
          <CardHeader>
            <CardTitle className="text-xl text-white">Formulário inicial</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" className="bg-slate-950/65" placeholder="Seu nome completo" value={nome} onChange={(event) => setNome(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" className="bg-slate-950/65" placeholder="(00) 00000-0000" value={telefone} onChange={(event) => setTelefone(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="aparelho">Aparelho</Label>
                <Input id="aparelho" className="bg-slate-950/65" placeholder="Ex.: iPhone 13, Galaxy S22, Redmi Note" value={aparelho} onChange={(event) => setAparelho(event.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="problema">Problema relatado</Label>
                <Textarea id="problema" className="bg-slate-950/65" placeholder="Descreva sintomas, quedas, contato com água ou erro exibido" rows={6} value={problema} onChange={(event) => setProblema(event.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" className="rounded-full px-8 topcell-brand-gradient text-primary-foreground" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar solicitação"}
                </Button>
              </div>
            </form>

            {error ? <div className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
            {success ? <div className="mt-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div> : null}
          </CardContent>
        </Card>

        <Card className="topcell-surface topcell-card-fx border-primary/25">
          <CardHeader>
            <CardTitle className="text-xl text-white">Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-blue-100/80">
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 text-primary" size={18} />
              <p>Recebemos sua solicitação e iniciamos a triagem técnica.</p>
            </div>
            <div className="flex gap-3">
              <ClipboardCheck className="mt-0.5 text-primary" size={18} />
              <p>Retornamos com valor estimado, prazo e orientações iniciais.</p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 text-primary" size={18} />
              <p>Você aprova e acompanha todo o fluxo pela plataforma.</p>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Benefícios TopCell</p>
              <ul className="mt-2 space-y-2">
                {benefits.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
