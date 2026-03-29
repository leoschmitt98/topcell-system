import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost, apiPut } from "@/lib/api";

type Conversation = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  canal: string;
  assunto: string | null;
  status: string;
  prioridade: string;
  responsavel: string | null;
  iniciadaEm: string | null;
  mensagensCount: number;
  naoLidasCliente: number;
  ultimaMensagem: string | null;
  ultimaMensagemEm: string | null;
};

type Message = {
  id: number;
  conversaId: number;
  autorTipo: "cliente" | "atendente";
  mensagem: string;
  enviadaEm: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const STATUS_OPTIONS = ["aberto", "em_andamento", "aguardando_cliente", "finalizado", "cancelado"];
const PRIORIDADE_OPTIONS = ["baixa", "media", "alta"];

function formatStatus(status: string) {
  if (status === "em_andamento") return "Em andamento";
  if (status === "aguardando_cliente") return "Aguardando cliente";
  if (status === "finalizado") return "Finalizado";
  if (status === "cancelado") return "Cancelado";
  return "Aberto";
}

function normalizePhoneDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export default function AdminSupportPage() {
  const [conversas, setConversas] = useState<Conversation[]>([]);
  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<number | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [mensagemNova, setMensagemNova] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [status, setStatus] = useState("aberto");
  const [prioridade, setPrioridade] = useState("media");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const conversaSelecionada = useMemo(
    () => conversas.find((item) => item.id === conversaSelecionadaId) || null,
    [conversas, conversaSelecionadaId]
  );
  const whatsappLink = useMemo(() => {
    if (!conversaSelecionada) return "";
    const phone = normalizePhoneDigits(conversaSelecionada.clienteTelefone);
    if (!phone) return "";

    const withCountryCode = phone.startsWith("55") ? phone : `55${phone}`;
    const text = encodeURIComponent(
      `Olá, ${conversaSelecionada.clienteNome}! Aqui é da TopCell. ` +
        `Temos opções de fones disponíveis e vou te enviar alguns modelos agora pelo WhatsApp.`
    );
    return `https://wa.me/${withCountryCode}?text=${text}`;
  }, [conversaSelecionada]);

  async function loadConversas(selectId?: number) {
    setLoading(true);
    setError("");
    try {
      const response = await apiGet<ApiResponse<Conversation[]>>("/api/atendimento/conversas");
      const data = Array.isArray(response.data) ? response.data : [];
      setConversas(data);

      const firstId = data[0]?.id || null;
      const targetId = selectId || conversaSelecionadaId || firstId;
      if (targetId) {
        setConversaSelecionadaId(targetId);
        const selected = data.find((item) => item.id === targetId);
        if (selected) {
          setStatus(selected.status || "aberto");
          setPrioridade(selected.prioridade || "media");
          setResponsavel(selected.responsavel || "");
        }
        await loadMensagens(targetId);
      } else {
        setMensagens([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar conversas.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMensagens(conversaId: number) {
    try {
      const response = await apiGet<ApiResponse<Message[]>>(`/api/atendimento/conversas/${conversaId}/mensagens`);
      setMensagens(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar mensagens.");
    }
  }

  useEffect(() => {
    loadConversas();
    const interval = setInterval(() => {
      if (conversaSelecionadaId) {
        loadMensagens(conversaSelecionadaId);
      }
    }, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversaSelecionadaId) return;
    if (!mensagemNova.trim()) return;

    setSending(true);
    setError("");
    setSuccess("");
    try {
      await apiPost(`/api/atendimento/conversas/${conversaSelecionadaId}/mensagens`, {
        mensagem: mensagemNova.trim(),
      });
      setMensagemNova("");
      setSuccess("Resposta enviada.");
      await loadConversas(conversaSelecionadaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function handleUpdateMeta() {
    if (!conversaSelecionadaId) return;

    setError("");
    setSuccess("");
    try {
      await apiPut(`/api/atendimento/conversas/${conversaSelecionadaId}/status`, {
        status,
        prioridade,
        responsavel,
      });
      setSuccess("Conversa atualizada.");
      await loadConversas(conversaSelecionadaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar conversa.");
    }
  }

  return (
    <section className="space-y-6" data-cy="admin-support-page">
      <header className="admin-hero p-5 md:p-6">
        <h1 className="admin-title">Atendimento</h1>
        <p className="admin-subtitle">Fila de conversas, resposta em tempo real e acompanhamento por status.</p>
      </header>

      {error ? <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div> : null}

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <Card className="admin-surface border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" variant="outline" className="w-full border-primary/30 bg-primary/10 text-primary" onClick={() => loadConversas(conversaSelecionadaId || undefined)}>
              Atualizar fila
            </Button>

            {loading ? <p className="text-sm text-blue-100/70">Carregando...</p> : null}

            {!loading && conversas.length === 0 ? (
              <p className="text-sm text-blue-100/70">Nenhuma conversa no momento.</p>
            ) : null}

            {!loading && conversas.length > 0 ? (
              <div className="space-y-2">
                {conversas.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={async () => {
                      setConversaSelecionadaId(item.id);
                      setStatus(item.status || "aberto");
                      setPrioridade(item.prioridade || "media");
                      setResponsavel(item.responsavel || "");
                      await loadMensagens(item.id);
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      conversaSelecionadaId === item.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/10 bg-slate-900/70 hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{item.clienteNome}</p>
                      <span className="text-xs text-blue-100/70">#{item.id}</span>
                    </div>
                    <p className="mt-1 text-xs text-blue-100/70">{item.assunto || "Atendimento geral"}</p>
                    <p className="mt-1 text-xs text-blue-100/65">{formatStatus(item.status)}</p>
                    {item.naoLidasCliente > 0 ? (
                      <p className="mt-1 text-xs text-amber-300">{item.naoLidasCliente} mensagem(ns) nao lida(s)</p>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="admin-surface border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">
              {conversaSelecionada ? `Conversa #${conversaSelecionada.id} - ${conversaSelecionada.clienteNome}` : "Selecione uma conversa"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!conversaSelecionada ? (
              <p className="text-sm text-blue-100/70">Selecione uma conversa na coluna ao lado.</p>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <select className="admin-field flex h-10 w-full rounded-md border px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {formatStatus(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Prioridade</Label>
                    <select className="admin-field flex h-10 w-full rounded-md border px-3 text-sm" value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>
                      {PRIORIDADE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                        {option === "media" ? "media" : option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Responsavel</Label>
                    <Input className="admin-field" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} placeholder="Nome do atendente" />
                  </div>
                </div>

                <Button type="button" variant="outline" className="border-primary/30 bg-primary/10 text-primary" onClick={handleUpdateMeta}>
                  Salvar status/prioridade
                </Button>
                <Button
                  type="button"
                  className="topcell-brand-gradient text-primary-foreground"
                  disabled={!whatsappLink}
                  onClick={() => window.open(whatsappLink, "_blank", "noopener,noreferrer")}
                >
                  Chamar no WhatsApp
                </Button>

                <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/65 p-3">
                  {mensagens.length === 0 ? (
                    <p className="text-sm text-blue-100/70">Sem mensagens nesta conversa.</p>
                  ) : (
                    mensagens.map((item) => (
                      <div
                        key={item.id}
                        className={`max-w-[82%] rounded-2xl px-4 py-2 text-sm ${
                          item.autorTipo === "atendente"
                            ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                            : "rounded-bl-sm bg-slate-900 text-blue-100"
                        }`}
                      >
                        <p>{item.mensagem}</p>
                        <p className={`mt-1 text-[11px] ${item.autorTipo === "atendente" ? "text-primary-foreground/80" : "text-blue-100/60"}`}>
                          {item.enviadaEm ? new Date(item.enviadaEm).toLocaleString("pt-BR") : ""}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <form className="space-y-2" onSubmit={handleSendMessage}>
                  <Label>Responder cliente</Label>
                  <Textarea
                    className="admin-field"
                    rows={4}
                    value={mensagemNova}
                    onChange={(event) => setMensagemNova(event.target.value)}
                    placeholder="Digite sua resposta..."
                  />
                  <Button type="submit" className="topcell-brand-gradient text-primary-foreground" disabled={sending}>
                    {sending ? "Enviando..." : "Enviar resposta"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
