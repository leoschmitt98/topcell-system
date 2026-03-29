import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_OPTIONS = ["recebido", "em_analise", "aguardando_aprovacao", "em_conserto", "pronto", "entregue", "cancelado"] as const;

type OSStatus = (typeof STATUS_OPTIONS)[number];

type ServiceOrder = {
  id: number;
  clienteNome: string;
  clienteTelefone: string;
  aparelho: string;
  problema: string;
  status: OSStatus;
  valorServico: number;
  valorPecas: number;
  valorTotal: number;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

type FormState = {
  clienteNome: string;
  clienteTelefone: string;
  aparelho: string;
  problema: string;
  status: OSStatus;
  valorServico: string;
  valorPecas: string;
};

function defaultForm(): FormState {
  return {
    clienteNome: "",
    clienteTelefone: "",
    aparelho: "",
    problema: "",
    status: "recebido",
    valorServico: "0",
    valorPecas: "0",
  };
}

function formatStatusLabel(status: OSStatus) {
  if (status === "em_analise") return "Em análise";
  if (status === "aguardando_aprovacao") return "Aguardando aprovação";
  if (status === "em_conserto") return "Em conserto";
  if (status === "cancelado") return "Cancelado";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizePhoneDigits(value: string) {
  return String(value || "").replace(/\D/g, "");
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

function formatOrderDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function buildClientWhatsAppMessage(order: ServiceOrder) {
  const lines = [
    `Olá, ${order.clienteNome}!`,
    "Aqui é da TopCell.",
    "",
    "Resumo da sua Ordem de Serviço:",
    `- Número da OS: #${order.id}`,
    `- Cliente: ${order.clienteNome}`,
    `- Telefone: ${order.clienteTelefone}`,
    `- Aparelho: ${order.aparelho}`,
    `- Problema relatado: ${order.problema}`,
    `- Status atual: ${formatStatusLabel(order.status)}`,
    `- Data de abertura: ${formatOrderDate(order.createdAt)}`,
    "",
    `Valor total da OS: ${formatMoney(order.valorTotal)}`,
    "",
    "Qualquer dúvida, estamos à disposição.",
    "TopCell - Assistência técnica e loja mobile.",
  ];

  return encodeURIComponent(lines.join("\n"));
}

function buildPrintableOSHtml(order: ServiceOrder) {
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString("pt-BR") : "-";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OS #${order.id} - TopCell</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    .wrap { max-width: 720px; margin: 0 auto; border: 1px solid #ddd; border-radius: 12px; padding: 20px; }
    h1 { margin: 0 0 8px; font-size: 24px; }
    .muted { color: #555; margin-bottom: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-top: 12px; }
    .item { padding: 10px; border: 1px solid #eee; border-radius: 8px; }
    .label { font-size: 12px; color: #666; margin-bottom: 4px; }
    .value { font-size: 15px; font-weight: 600; }
    .total { margin-top: 16px; padding: 12px; border: 2px solid #111; border-radius: 10px; font-size: 18px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Ordem de Serviço #${order.id}</h1>
    <div class="muted">TopCell • Emitido em ${createdAt}</div>
    <div class="grid">
      <div class="item"><div class="label">Cliente</div><div class="value">${order.clienteNome}</div></div>
      <div class="item"><div class="label">Telefone</div><div class="value">${order.clienteTelefone}</div></div>
      <div class="item"><div class="label">Aparelho</div><div class="value">${order.aparelho}</div></div>
      <div class="item"><div class="label">Status</div><div class="value">${formatStatusLabel(order.status)}</div></div>
      <div class="item" style="grid-column: 1 / -1;"><div class="label">Problema relatado</div><div class="value">${order.problema}</div></div>
    </div>
    <div class="total">Valor total: ${formatMoney(order.valorTotal)}</div>
  </div>
</body>
</html>`;
}

export default function TopCellServiceOrders() {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [statusDrafts, setStatusDrafts] = useState<Record<number, OSStatus>>({});
  const [valueDrafts, setValueDrafts] = useState<Record<number, { valorServico: string; valorPecas: string }>>({});
  const [submitting, setSubmitting] = useState(false);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const response = await apiGet<ApiResponse<ServiceOrder[]>>("/api/os");
      const data = Array.isArray(response.data) ? response.data : [];
      setOrders(data);
      setStatusDrafts(
        Object.fromEntries(data.map((order) => [order.id, order.status])) as Record<number, OSStatus>
      );
      setValueDrafts(
        Object.fromEntries(
          data.map((order) => [
            order.id,
            {
              valorServico: String(order.valorServico ?? 0),
              valorPecas: String(order.valorPecas ?? 0),
            },
          ])
        ) as Record<number, { valorServico: string; valorPecas: string }>
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as ordens de serviço.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function handleCreateOrder(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await apiPost<ApiResponse<ServiceOrder>>("/api/os", form);
      setForm(defaultForm());
      setShowForm(false);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a ordem de serviço.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateStatus(id: number) {
    const status = statusDrafts[id];
    if (!status) return;
    const draft = valueDrafts[id] || { valorServico: "0", valorPecas: "0" };
    const valorServico = Number(draft.valorServico || 0);
    const valorPecas = Number(draft.valorPecas || 0);

    try {
      await apiPut<ApiResponse<ServiceOrder>>(`/api/os/${id}`, {
        status,
        valorServico,
        valorPecas,
      });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o status da ordem.");
    }
  }

  function handleSendToClient(order: ServiceOrder) {
    const phone = normalizePhoneDigits(order.clienteTelefone);
    if (!phone) {
      setError("Telefone do cliente inválido para envio.");
      return;
    }

    const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const message = buildClientWhatsAppMessage(order);
    window.open(`https://wa.me/${fullPhone}?text=${message}`, "_blank", "noopener,noreferrer");
  }

  function handleDownloadPrintable(order: ServiceOrder) {
    try {
      const html = buildPrintableOSHtml(order);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `os-${order.id}-topcell.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Não foi possível gerar o comprovante para download.");
    }
  }

  return (
    <section className="space-y-6" data-cy="topcell-os-page">
      <header className="admin-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <h1 className="admin-title">Ordens de Serviço</h1>
          <p className="admin-subtitle">Cadastro, acompanhamento e atualização de aparelhos em manutenção.</p>
        </div>

        <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={() => setShowForm((current) => !current)} data-cy="btn-nova-os-topcell">
          {showForm ? "Fechar formulário" : "Nova ordem"}
        </Button>
      </header>

      {showForm && (
        <Card className="admin-surface border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">Nova ordem de serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleCreateOrder}>
              <div className="grid gap-2">
                <Label htmlFor="clienteNome">Nome do cliente</Label>
                <Input
                  id="clienteNome"
                  className="admin-field"
                  value={form.clienteNome}
                  onChange={(event) => setForm((current) => ({ ...current, clienteNome: event.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="clienteTelefone">Telefone do cliente</Label>
                <Input
                  id="clienteTelefone"
                  className="admin-field"
                  value={form.clienteTelefone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, clienteTelefone: event.target.value }))
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="aparelho">Aparelho</Label>
                <Input
                  id="aparelho"
                  className="admin-field"
                  placeholder="Ex.: iPhone 12, Samsung A54"
                  value={form.aparelho}
                  onChange={(event) => setForm((current) => ({ ...current, aparelho: event.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="problema">Problema relatado</Label>
                <Textarea
                  id="problema"
                  className="admin-field"
                  value={form.problema}
                  onChange={(event) => setForm((current) => ({ ...current, problema: event.target.value }))}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label>Status inicial</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: OSStatus) => setForm((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger className="admin-field">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatStatusLabel(status)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="valorServico">Valor mão de obra</Label>
                  <Input
                    id="valorServico"
                    className="admin-field"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valorServico}
                    onChange={(event) => setForm((current) => ({ ...current, valorServico: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valorPecas">Valor peças</Label>
                  <Input
                    id="valorPecas"
                    className="admin-field"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valorPecas}
                    onChange={(event) => setForm((current) => ({ ...current, valorPecas: event.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 text-sm text-blue-100/80">
                Total para o cliente:{" "}
                <strong className="text-white">
                  R$ {(
                    Number(form.valorServico || 0) +
                    Number(form.valorPecas || 0)
                  ).toFixed(2)}
                </strong>
              </div>

              <div>
                <Button type="submit" className="topcell-brand-gradient text-primary-foreground" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar ordem"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="text-white">Lista de ordens de serviço</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          {loading ? <p className="text-blue-100/75">Carregando ordens...</p> : null}

          {!loading && orders.length === 0 ? (
            <p className="text-sm text-blue-100/70">Nenhuma ordem cadastrada no momento.</p>
          ) : null}

          {!loading && orders.length > 0 ? (
            <div className="grid gap-4">
              {orders.map((order) => (
                <article key={order.id} className="admin-stat-card space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-white">OS #{order.id}</h2>
                    <span className="text-xs text-blue-100/65">
                      Criada em {new Date(order.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="grid gap-1 text-sm text-blue-100/80 md:grid-cols-2">
                    <p>
                      <strong>Cliente:</strong> {order.clienteNome}
                    </p>
                    <p>
                      <strong>Telefone:</strong> {order.clienteTelefone}
                    </p>
                    <p>
                      <strong>Aparelho:</strong> {order.aparelho}
                    </p>
                    <p>
                      <strong>Problema:</strong> {order.problema}
                    </p>
                    <p>
                      <strong>Mão de obra:</strong> R$ {Number(order.valorServico || 0).toFixed(2)}
                    </p>
                    <p>
                      <strong>Peças:</strong> R$ {Number(order.valorPecas || 0).toFixed(2)}
                    </p>
                    <p>
                      <strong>Total cliente:</strong> R$ {Number(order.valorTotal || 0).toFixed(2)}
                    </p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-[220px_220px_220px_auto] md:items-end">
                    <div className="grid gap-1">
                      <Label className="text-xs text-blue-100/70">Mão de obra</Label>
                      <Input
                        className="admin-field"
                        type="number"
                        min="0"
                        step="0.01"
                        value={valueDrafts[order.id]?.valorServico ?? String(order.valorServico ?? 0)}
                        onChange={(event) =>
                          setValueDrafts((current) => ({
                            ...current,
                            [order.id]: {
                              ...(current[order.id] || {
                                valorServico: String(order.valorServico ?? 0),
                                valorPecas: String(order.valorPecas ?? 0),
                              }),
                              valorServico: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-blue-100/70">Peças</Label>
                      <Input
                        className="admin-field"
                        type="number"
                        min="0"
                        step="0.01"
                        value={valueDrafts[order.id]?.valorPecas ?? String(order.valorPecas ?? 0)}
                        onChange={(event) =>
                          setValueDrafts((current) => ({
                            ...current,
                            [order.id]: {
                              ...(current[order.id] || {
                                valorServico: String(order.valorServico ?? 0),
                                valorPecas: String(order.valorPecas ?? 0),
                              }),
                              valorPecas: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <Select
                      value={statusDrafts[order.id] || order.status}
                      onValueChange={(value: OSStatus) =>
                        setStatusDrafts((current) => ({ ...current, [order.id]: value }))
                      }
                    >
                      <SelectTrigger className="admin-field sm:w-64">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status} value={status}>
                            {formatStatusLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button type="button" variant="outline" className="border-primary/35 bg-primary/10 text-primary" onClick={() => handleUpdateStatus(order.id)}>
                      Atualizar status
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={() => handleSendToClient(order)}>
                      Enviar para cliente
                    </Button>
                    <Button type="button" variant="outline" className="border-primary/35 bg-primary/10 text-primary" onClick={() => handleDownloadPrintable(order)}>
                      Baixar para impressão
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
