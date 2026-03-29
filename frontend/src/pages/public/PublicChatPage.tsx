import { FormEvent, useEffect, useState } from "react";
import { BotMessageSquare, CircleHelp, FileText, SearchCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";

type Message = {
  id: number;
  conversaId: number;
  autorTipo: "cliente" | "atendente";
  mensagem: string;
  enviadaEm: string | null;
};

type Conversation = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  assunto: string | null;
  accessToken: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

const CHAT_STORAGE_KEY = "topcell_public_chat_conversa_id";
const CHAT_TOKEN_STORAGE_KEY = "topcell_public_chat_conversa_token";

const quickActions = [
  "Quero solicitar um orcamento",
  "Desejo consultar o status da minha OS",
  "Tenho uma duvida sobre atendimento",
];

export default function PublicChatPage() {
  const [clienteNome, setClienteNome] = useState("");
  const [clienteTelefone, setClienteTelefone] = useState("");
  const [assunto, setAssunto] = useState("Atendimento geral");
  const [conversaId, setConversaId] = useState<number | null>(null);
  const [conversaToken, setConversaToken] = useState<string>("");
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [mensagemInput, setMensagemInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadMensagens(targetId: number, tokenOverride?: string) {
    const token = tokenOverride || conversaToken;
    if (!token) return;
    try {
      const params = new URLSearchParams({ token });
      const response = await apiGet<ApiResponse<Message[]>>(`/api/public/atendimento/conversas/${targetId}/mensagens?${params.toString()}`);
      setMensagens(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o chat.");
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    const storedToken = localStorage.getItem(CHAT_TOKEN_STORAGE_KEY) || "";
    const id = Number(stored || 0);
    if (id > 0 && storedToken) {
      setConversaId(id);
      setConversaToken(storedToken);
      loadMensagens(id, storedToken);
    } else {
      localStorage.removeItem(CHAT_STORAGE_KEY);
      localStorage.removeItem(CHAT_TOKEN_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!conversaId || !conversaToken) return;
    const interval = setInterval(() => loadMensagens(conversaId), 7000);
    return () => clearInterval(interval);
  }, [conversaId, conversaToken]);

  async function iniciarConversa(firstMessage: string) {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await apiPost<ApiResponse<Conversation>>("/api/public/atendimento/conversas", {
        cliente_nome: clienteNome.trim(),
        cliente_telefone: clienteTelefone.trim(),
        assunto: assunto.trim(),
        mensagem: firstMessage,
        canal: "site",
      });
      const id = Number(response.data?.id || 0);
      if (!id) throw new Error("Nao foi possivel iniciar o atendimento.");
      if (!response.data?.accessToken) throw new Error("Nao foi possivel iniciar o atendimento.");
      setConversaId(id);
      setConversaToken(response.data.accessToken);
      localStorage.setItem(CHAT_STORAGE_KEY, String(id));
      localStorage.setItem(CHAT_TOKEN_STORAGE_KEY, response.data.accessToken);
      setSuccess(`Atendimento iniciado. Protocolo #${id}`);
      setMensagemInput("");
      await loadMensagens(id, response.data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar o atendimento.");
    } finally {
      setLoading(false);
    }
  }

  async function enviarMensagem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const texto = mensagemInput.trim();
    if (!texto) return;

    if (!conversaId) {
      if (!clienteNome.trim() || !clienteTelefone.trim()) {
        setError("Informe seu nome e telefone para iniciar o chat.");
        return;
      }
      await iniciarConversa(texto);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiPost(`/api/public/atendimento/conversas/${conversaId}/mensagens`, {
        mensagem: texto,
        token: conversaToken,
      });
      setMensagemInput("");
      await loadMensagens(conversaId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel enviar a mensagem.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickAction(text: string) {
    if (!conversaId) {
      setMensagemInput(text);
      return;
    }
    setMensagemInput(text);
  }

  return (
    <section className="space-y-6" data-cy="public-chat-page">
      <header className="topcell-surface-strong border-primary/30 p-6">
        <span className="topcell-tag">Atendimento / Chat</span>
        <h1 className="mt-3 text-3xl font-bold text-white">Fale com a TopCell em um chat rapido e intuitivo</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100/80">
          Converse com nossa equipe para orcamentos, consulta de OS e duvidas gerais.
        </p>
      </header>

      <Card className="topcell-surface topcell-card-fx overflow-hidden border-primary/25">
        <CardHeader className="topcell-brand-gradient text-primary-foreground">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BotMessageSquare size={20} />
            Atendimento TopCell
          </CardTitle>
        </CardHeader>

        <CardContent className="grid gap-5 p-4 md:p-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="grid gap-2 md:grid-cols-3">
              <Input placeholder="Seu nome" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} className="bg-slate-950/70" />
              <Input placeholder="Seu telefone" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} className="bg-slate-950/70" />
              <Input placeholder="Assunto" value={assunto} onChange={(e) => setAssunto(e.target.value)} className="bg-slate-950/70" />
            </div>

            <div className="max-h-[330px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/65 p-4">
              {mensagens.length === 0 ? (
                <div className="max-w-[84%] rounded-2xl rounded-bl-sm bg-slate-900/90 px-4 py-3 text-sm text-blue-100 shadow-sm">
                  Ola! Para iniciar, informe seus dados e envie a primeira mensagem.
                </div>
              ) : (
                mensagens.map((msg) => (
                  <div
                    key={msg.id}
                    className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.autorTipo === "cliente"
                        ? "ml-auto rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-slate-900/90 text-blue-100"
                    }`}
                  >
                    <p>{msg.mensagem}</p>
                    <p className={`mt-1 text-[11px] ${msg.autorTipo === "cliente" ? "text-primary-foreground/80" : "text-blue-100/60"}`}>
                      {msg.enviadaEm ? new Date(msg.enviadaEm).toLocaleString("pt-BR") : ""}
                    </p>
                  </div>
                ))
              )}
            </div>

            <form className="flex gap-2" onSubmit={enviarMensagem}>
              <Input placeholder="Digite sua mensagem..." value={mensagemInput} onChange={(e) => setMensagemInput(e.target.value)} className="h-11 rounded-full bg-slate-950/70" />
              <Button type="submit" className="h-11 rounded-full px-6 topcell-brand-gradient text-primary-foreground" disabled={loading}>
                {loading ? "Enviando..." : "Enviar"}
              </Button>
            </form>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}
          </div>

          <aside className="space-y-3 rounded-2xl border border-primary/25 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-primary">Atalhos rapidos</p>
            {quickActions.map((label, index) => {
              const Icon = index === 0 ? FileText : index === 1 ? SearchCheck : CircleHelp;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleQuickAction(label)}
                  className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-left text-sm font-medium text-blue-100 transition hover:border-primary/40 hover:bg-primary/15"
                >
                  <Icon size={16} className="text-primary" />
                  {label}
                </button>
              );
            })}
          </aside>
        </CardContent>
      </Card>
    </section>
  );
}
