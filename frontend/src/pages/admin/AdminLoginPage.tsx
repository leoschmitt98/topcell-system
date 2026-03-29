import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import TopCellLogo from "@/components/TopCellLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { isAdminLoggedIn, setAdminToken } from "@/lib/adminAuth";

type LoginResponse = {
  ok: boolean;
  data: {
    token: string;
    expiresIn: string;
  };
  error?: string;
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = (location.state as any)?.from || "/admin/dashboard";

  if (isAdminLoggedIn()) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiPost<LoginResponse>("/api/auth/login", { senha });
      const token = String(response?.data?.token || "");
      if (!token) throw new Error("Falha ao autenticar");

      setAdminToken(token);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar no painel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="min-h-screen admin-shell text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="admin-hero p-8">
            <TopCellLogo
              imageClassName="h-14 w-14 rounded-2xl"
              labelClassName="text-white"
              subtitleClassName="text-blue-100/80"
              labelText="TopCell Admin"
            />
            <h1 className="mt-6 text-4xl font-bold text-white">Acesso seguro ao painel da loja</h1>
            <p className="mt-3 text-blue-100/75">
              Controle vendas, ordens de serviço, produtos e financeiro em um ambiente protegido.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-blue-100/75">
              <li>• Autenticação com senha configurável por loja</li>
              <li>• Token de sessão para rotas administrativas</li>
              <li>• Possibilidade de troca de senha no painel</li>
            </ul>
          </div>

          <Card className="admin-surface border-primary/25">
            <CardHeader>
              <CardTitle className="text-white">Entrar no painel</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha do admin</Label>
                  <Input
                    id="senha"
                    type="password"
                    className="admin-field"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder="Digite sua senha"
                    required
                  />
                </div>

                {error ? <p className="text-sm text-red-300">{error}</p> : null}

                <Button type="submit" className="topcell-brand-gradient w-full text-primary-foreground" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>

                <p className="text-xs text-blue-100/60">
                  Senha inicial padrão: <b>123456</b>. Depois altere em <b>Admin &gt; Segurança</b>.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
