import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

type Produto = {
  id: number;
  categoriaId: number | null;
  categoriaNome: string | null;
  nome: string;
  codigoSku: string | null;
  descricao: string | null;
  precoCusto: number;
  precoVenda: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  ativo: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

type ProdutoForm = {
  categoria_id: string;
  nome: string;
  codigo_sku: string;
  descricao: string;
  preco_custo: string;
  preco_venda: string;
  estoque_atual: string;
  estoque_minimo: string;
  ativo: boolean;
};

function defaultForm(): ProdutoForm {
  return {
    categoria_id: "",
    nome: "",
    codigo_sku: "",
    descricao: "",
    preco_custo: "0",
    preco_venda: "0",
    estoque_atual: "0",
    estoque_minimo: "0",
    ativo: true,
  };
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export default function AdminProductsPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProdutoForm>(defaultForm());

  const totalAtivos = useMemo(() => produtos.filter((item) => item.ativo).length, [produtos]);

  async function loadProdutos() {
    setLoading(true);
    setError("");

    try {
      const response = await apiGet<ApiResponse<Produto[]>>("/api/produtos");
      setProdutos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os produtos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProdutos();
  }, []);

  function openCreate() {
    setEditingId(null);
    setForm(defaultForm());
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function openEdit(produto: Produto) {
    setEditingId(produto.id);
    setForm({
      categoria_id: produto.categoriaId == null ? "" : String(produto.categoriaId),
      nome: produto.nome,
      codigo_sku: produto.codigoSku || "",
      descricao: produto.descricao || "",
      preco_custo: String(produto.precoCusto ?? 0),
      preco_venda: String(produto.precoVenda ?? 0),
      estoque_atual: String(produto.estoqueAtual ?? 0),
      estoque_minimo: String(produto.estoqueMinimo ?? 0),
      ativo: produto.ativo,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function saveProduto(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
      nome: form.nome,
      codigo_sku: form.codigo_sku,
      descricao: form.descricao,
      preco_custo: Number(form.preco_custo || 0),
      preco_venda: Number(form.preco_venda || 0),
      estoque_atual: Number(form.estoque_atual || 0),
      estoque_minimo: Number(form.estoque_minimo || 0),
      ativo: form.ativo,
    };

    try {
      if (editingId) {
        await apiPut<ApiResponse<Produto>>(`/api/produtos/${editingId}`, payload);
        setSuccess("Produto atualizado com sucesso.");
      } else {
        await apiPost<ApiResponse<Produto>>("/api/produtos", payload);
        setSuccess("Produto criado com sucesso.");
      }

      setShowForm(false);
      setEditingId(null);
      setForm(defaultForm());
      await loadProdutos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o produto.");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: number) {
    setError("");
    setSuccess("");

    try {
      await apiDelete<ApiResponse<Produto>>(`/api/produtos/${id}`);
      setSuccess("Produto desativado com sucesso.");
      await loadProdutos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desativar o produto.");
    }
  }

  return (
    <section className="space-y-6" data-cy="admin-products-page">
      <header className="admin-hero flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div>
          <h1 className="admin-title">Produtos</h1>
          <p className="admin-subtitle">
            Gestão completa de catálogo e estoque. Total de ativos: <b className="text-white">{totalAtivos}</b>
          </p>
        </div>

        <Button type="button" className="topcell-brand-gradient text-primary-foreground" onClick={openCreate}>
          Novo produto
        </Button>
      </header>

      {error ? <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div> : null}

      {showForm && (
        <Card className="admin-surface border-primary/20">
          <CardHeader>
            <CardTitle className="text-white">{editingId ? "Editar produto" : "Novo produto"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={saveProduto}>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  className="admin-field"
                  value={form.nome}
                  onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria (ID)</Label>
                <Input
                  id="categoria"
                  className="admin-field"
                  type="number"
                  min="1"
                  value={form.categoria_id}
                  onChange={(event) => setForm((prev) => ({ ...prev, categoria_id: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sku">Código SKU</Label>
                <Input
                  id="sku"
                  className="admin-field"
                  value={form.codigo_sku}
                  onChange={(event) => setForm((prev) => ({ ...prev, codigo_sku: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precoCusto">Preço de custo</Label>
                <Input
                  id="precoCusto"
                  className="admin-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco_custo}
                  onChange={(event) => setForm((prev) => ({ ...prev, preco_custo: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precoVenda">Preço de venda</Label>
                <Input
                  id="precoVenda"
                  className="admin-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.preco_venda}
                  onChange={(event) => setForm((prev) => ({ ...prev, preco_venda: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estoqueAtual">Estoque atual</Label>
                <Input
                  id="estoqueAtual"
                  className="admin-field"
                  type="number"
                  min="0"
                  step="1"
                  value={form.estoque_atual}
                  onChange={(event) => setForm((prev) => ({ ...prev, estoque_atual: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estoqueMinimo">Estoque mínimo</Label>
                <Input
                  id="estoqueMinimo"
                  className="admin-field"
                  type="number"
                  min="0"
                  step="1"
                  value={form.estoque_minimo}
                  onChange={(event) => setForm((prev) => ({ ...prev, estoque_minimo: event.target.value }))}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  className="admin-field"
                  rows={4}
                  value={form.descricao}
                  onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" className="topcell-brand-gradient text-primary-foreground" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-primary/35 bg-primary/10 text-primary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setForm(defaultForm());
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="text-white">Lista de produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-blue-100/75">Carregando produtos...</p> : null}

          {!loading && produtos.length === 0 ? (
            <p className="text-sm text-blue-100/70">Nenhum produto cadastrado.</p>
          ) : null}

          {!loading && produtos.length > 0 ? (
            <div className="grid gap-3">
              {produtos.map((produto) => (
                <article key={produto.id} className="admin-stat-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-semibold text-white">{produto.nome}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        produto.ativo ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-500/20 text-zinc-300"
                      }`}
                    >
                      {produto.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="mt-2 grid gap-1 text-sm text-blue-100/80 md:grid-cols-2">
                    <p>
                      <strong>Categoria:</strong> {produto.categoriaNome || produto.categoriaId || "-"}
                    </p>
                    <p>
                      <strong>SKU:</strong> {produto.codigoSku || "-"}
                    </p>
                    <p>
                      <strong>Custo:</strong> {formatMoney(produto.precoCusto)}
                    </p>
                    <p>
                      <strong>Venda:</strong> {formatMoney(produto.precoVenda)}
                    </p>
                    <p>
                      <strong>Estoque:</strong> {produto.estoqueAtual}
                    </p>
                    <p>
                      <strong>Mínimo:</strong> {produto.estoqueMinimo}
                    </p>
                  </div>

                  {produto.descricao ? <p className="mt-2 text-sm text-blue-100/70">{produto.descricao}</p> : null}

                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" className="border-primary/35 bg-primary/10 text-primary" onClick={() => openEdit(produto)}>
                      Editar
                    </Button>
                    {produto.ativo ? (
                      <Button type="button" variant="destructive" onClick={() => deactivate(produto.id)}>
                        Desativar
                      </Button>
                    ) : null}
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
