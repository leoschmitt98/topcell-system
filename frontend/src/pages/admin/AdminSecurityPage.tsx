import { FormEvent, useMemo, useState } from "react";
import { Copy, KeyRound, Printer, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPut } from "@/lib/api";

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

export default function AdminSecurityPage() {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [qrFeedback, setQrFeedback] = useState("");

  const consultaOsUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/consultar-os`;
  }, []);

  const qrImageUrl = useMemo(() => {
    if (!consultaOsUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(consultaOsUrl)}`;
  }, [consultaOsUrl]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (novaSenha !== confirmacao) {
      setError("A confirmação da nova senha não confere.");
      return;
    }

    setSaving(true);

    try {
      await apiPut<ApiResponse<{ updated: boolean }>>("/api/auth/password", {
        senhaAtual,
        novaSenha,
      });

      setSuccess("Senha atualizada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a senha.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyPublicLink() {
    if (!consultaOsUrl) return;
    try {
      await navigator.clipboard.writeText(consultaOsUrl);
      setQrFeedback("Link copiado com sucesso.");
    } catch {
      setQrFeedback("Não foi possível copiar automaticamente. Copie manualmente o link.");
    }
  }

  function handlePrintPamphlet() {
    if (!consultaOsUrl || !qrImageUrl) return;

    const printWindow = window.open("", "_blank", "width=800,height=900");
    if (!printWindow) {
      setQrFeedback("Não foi possível abrir a janela de impressão.");
      return;
    }

    const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Panfleto QR - Consulta OS TopCell</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #0f172a; }
    .wrap { max-width: 720px; margin: 0 auto; border: 2px solid #0ea5e9; border-radius: 16px; padding: 24px; }
    h1 { margin: 0 0 6px; font-size: 28px; color: #0f172a; }
    p { margin: 0 0 10px; font-size: 15px; line-height: 1.45; }
    .qr { margin: 18px 0; text-align: center; }
    .qr img { width: 280px; height: 280px; border: 8px solid #fff; box-shadow: 0 8px 25px rgba(15,23,42,.15); }
    .box { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; margin-top: 12px; }
    .url { font-size: 13px; color: #334155; word-break: break-all; }
    .steps { margin-top: 12px; padding-left: 18px; }
    .steps li { margin: 6px 0; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>TopCell - Consulta de Ordem de Serviço</h1>
    <p>Escaneie o QR Code para consultar sua OS, acompanhar status e aprovar/cancelar serviço quando solicitado.</p>
    <div class="qr"><img src="${qrImageUrl}" alt="QR Code consulta de OS TopCell" /></div>
    <div class="box">
      <p><strong>Como consultar:</strong></p>
      <ol class="steps">
        <li>Escaneie o QR Code com a câmera do celular.</li>
        <li>Informe nome, telefone e número da OS.</li>
        <li>Acompanhe o status e confirme o serviço quando estiver em aguardando aprovação.</li>
      </ol>
      <p class="url">${consultaOsUrl}</p>
    </div>
  </div>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <section className="space-y-6" data-cy="admin-security-page">
      <header className="admin-hero p-5 md:p-6">
        <h1 className="admin-title">Segurança</h1>
        <p className="admin-subtitle">Configure a senha de acesso do painel administrativo da sua loja.</p>
      </header>

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <KeyRound size={17} className="text-primary" />
            Alterar senha do admin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:max-w-xl" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <Input
                id="senhaAtual"
                type="password"
                className="admin-field"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input
                id="novaSenha"
                type="password"
                className="admin-field"
                value={novaSenha}
                onChange={(event) => setNovaSenha(event.target.value)}
                required
              />
              <p className="text-xs text-blue-100/65">Use ao menos 6 caracteres.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmacao">Confirmar nova senha</Label>
              <Input
                id="confirmacao"
                type="password"
                className="admin-field"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                required
              />
            </div>

            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

            <div className="flex items-center gap-2">
              <Button type="submit" className="topcell-brand-gradient text-primary-foreground" disabled={saving}>
                {saving ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldCheck size={17} className="text-primary" />
            Boas práticas de segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-blue-100/75">
          <p>• Troque a senha padrão logo após o primeiro acesso.</p>
          <p>• Evite compartilhar a senha entre pessoas da equipe.</p>
          <p>• Utilize senhas exclusivas para cada unidade/loja.</p>
        </CardContent>
      </Card>

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <QrCode size={17} className="text-primary" />
            QR da consulta de OS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-blue-100/75">
            Use este QR em panfletos e balcão para o cliente consultar a ordem de serviço de qualquer aparelho.
          </p>

          <div className="grid gap-4 md:grid-cols-[300px_1fr]">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              {qrImageUrl ? (
                <img
                  src={qrImageUrl}
                  alt="QR Code para consulta de OS TopCell"
                  className="mx-auto h-[260px] w-[260px] rounded-lg border border-white/10 bg-white p-2"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-white/20 text-sm text-blue-100/70">
                  QR indisponivel no momento.
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="consultaOsLink">Link público da consulta</Label>
                <Input id="consultaOsLink" value={consultaOsUrl} readOnly className="admin-field" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={handleCopyPublicLink}>
                  <Copy size={14} className="mr-2" />
                  Copiar link
                </Button>
                <Button type="button" variant="outline" className="border-primary/35 bg-primary/10 text-primary" onClick={handlePrintPamphlet}>
                  <Printer size={14} className="mr-2" />
                  Imprimir panfleto
                </Button>
              </div>

              {qrFeedback ? <p className="text-xs text-emerald-300">{qrFeedback}</p> : null}

              <div className="rounded-xl border border-dashed border-white/20 bg-slate-900/60 p-3 text-xs text-blue-100/70">
                Dica: entregue ao cliente o número da OS junto do comprovante para facilitar a consulta.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

