import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";

type Produto = {
  id: number;
  nome: string;
  precoVenda: number;
  estoqueAtual: number;
  ativo: boolean;
};

type VendaResumo = {
  id: number;
  dataVenda: string | null;
  valorTotal: number;
  formaPagamento: string | null;
  status: string;
  itensCount: number;
};

type ApiResponse<T> = {
  ok: boolean;
  data: T;
  error?: string;
};

type ItemVenda = {
  produtoId: number;
  nome: string;
  precoUnitario: number;
  quantidade: number;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export default function AdminSalesPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<VendaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [produtoSelecionado, setProdutoSelecionado] = useState("");
  const [quantidadeSelecionada, setQuantidadeSelecionada] = useState("1");
  const [formaPagamento, setFormaPagamento] = useState("pix");
  const [aplicarDesconto, setAplicarDesconto] = useState(false);
  const [descontoValor, setDescontoValor] = useState("0");
  const [itens, setItens] = useState<ItemVenda[]>([]);

  const subtotalVenda = useMemo(
    () => itens.reduce((sum, item) => sum + item.precoUnitario * item.quantidade, 0),
    [itens]
  );

  const descontoAplicado = useMemo(() => {
    if (!aplicarDesconto) return 0;
    const parsed = Number(descontoValor || 0);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, subtotalVenda);
  }, [aplicarDesconto, descontoValor, subtotalVenda]);

  const totalVenda = useMemo(
    () => Math.max(0, subtotalVenda - descontoAplicado),
    [subtotalVenda, descontoAplicado]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [produtosResp, vendasResp] = await Promise.all([
        apiGet<ApiResponse<any[]>>("/api/produtos"),
        apiGet<ApiResponse<VendaResumo[]>>("/api/vendas"),
      ]);

      const produtosAtivos = (Array.isArray(produtosResp.data) ? produtosResp.data : [])
        .filter((item) => item.ativo)
        .map((item) => ({
          id: Number(item.id),
          nome: String(item.nome || ""),
          precoVenda: Number(item.precoVenda || 0),
          estoqueAtual: Number(item.estoqueAtual || 0),
          ativo: Boolean(item.ativo),
        }));

      setProdutos(produtosAtivos);
      setVendas(Array.isArray(vendasResp.data) ? vendasResp.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os dados de vendas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addItem() {
    setError("");
    setSuccess("");

    const produtoId = Number(produtoSelecionado);
    const quantidade = Math.trunc(Number(quantidadeSelecionada || 0));

    if (!produtoId) {
      setError("Selecione um produto.");
      return;
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      setError("Informe uma quantidade válida.");
      return;
    }

    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto) {
      setError("Produto selecionado não encontrado.");
      return;
    }

    const existing = itens.find((item) => item.produtoId === produtoId);
    const novaQuantidade = (existing?.quantidade || 0) + quantidade;

    if (novaQuantidade > produto.estoqueAtual) {
      setError(`Estoque insuficiente para ${produto.nome}. Disponível: ${produto.estoqueAtual}.`);
      return;
    }

    setItens((current) => {
      if (existing) {
        return current.map((item) =>
          item.produtoId === produtoId ? { ...item, quantidade: novaQuantidade } : item
        );
      }

      return [
        ...current,
        {
          produtoId,
          nome: produto.nome,
          precoUnitario: produto.precoVenda,
          quantidade,
        },
      ];
    });

    setQuantidadeSelecionada("1");
  }

  function removeItem(produtoId: number) {
    setItens((current) => current.filter((item) => item.produtoId !== produtoId));
  }

  async function finalizarVenda() {
    if (!itens.length) {
      setError("Adicione ao menos um item para finalizar a venda.");
      return;
    }

    setFinalizando(true);
    setError("");
    setSuccess("");

    try {
      await apiPost<ApiResponse<any>>("/api/vendas", {
        forma_pagamento: formaPagamento,
        desconto_valor: descontoAplicado,
        itens: itens.map((item) => ({
          produto_id: item.produtoId,
          quantidade: item.quantidade,
        })),
      });

      setSuccess("Venda finalizada com sucesso.");
      setItens([]);
      setProdutoSelecionado("");
      setQuantidadeSelecionada("1");
      setAplicarDesconto(false);
      setDescontoValor("0");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível finalizar a venda.");
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <section className="space-y-6" data-cy="admin-sales-page">
      <header className="admin-hero p-5 md:p-6">
        <h1 className="admin-title">Vendas</h1>
        <p className="admin-subtitle">Registre vendas com baixa automática de estoque e lançamento financeiro integrado.</p>
      </header>

      {error ? <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-300">{error}</div> : null}
      {success ? <div className="rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div> : null}

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="text-white">Nova venda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Produto</Label>
              <select
                className="admin-field flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={produtoSelecionado}
                onChange={(event) => setProdutoSelecionado(event.target.value)}
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} - {formatMoney(produto.precoVenda)} (Estoque: {produto.estoqueAtual})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                className="admin-field"
                type="number"
                min="1"
                step="1"
                value={quantidadeSelecionada}
                onChange={(event) => setQuantidadeSelecionada(event.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button type="button" variant="outline" className="w-full border-primary/35 bg-primary/10 text-primary" onClick={addItem}>
                Adicionar item
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <select
                className="admin-field flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={formaPagamento}
                onChange={(event) => setFormaPagamento(event.target.value)}
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Desconto</Label>
              <select
                className="admin-field flex h-10 w-full rounded-md border px-3 py-2 text-sm"
                value={aplicarDesconto ? "sim" : "nao"}
                onChange={(event) => {
                  const enabled = event.target.value === "sim";
                  setAplicarDesconto(enabled);
                  if (!enabled) setDescontoValor("0");
                }}
              >
                <option value="nao">Sem desconto</option>
                <option value="sim">Aplicar desconto</option>
              </select>
            </div>
            {aplicarDesconto ? (
              <div className="space-y-2">
                <Label>Valor do desconto</Label>
                <Input
                  className="admin-field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={descontoValor}
                  onChange={(event) => setDescontoValor(event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Valor do desconto</Label>
                <Input className="admin-field" value={formatMoney(0)} readOnly />
              </div>
            )}
            <div className="space-y-2">
              <Label>Total da venda</Label>
              <Input className="admin-field" value={formatMoney(totalVenda)} readOnly />
            </div>
            <div className="flex items-end md:col-span-4">
              <Button type="button" className="topcell-brand-gradient w-full text-primary-foreground" onClick={finalizarVenda} disabled={finalizando}>
                {finalizando ? "Finalizando..." : "Finalizar venda"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-blue-100/75">
            <p>Subtotal dos itens: <b className="text-white">{formatMoney(subtotalVenda)}</b></p>
            <p>Desconto aplicado: <b className="text-white">{formatMoney(descontoAplicado)}</b></p>
            <p>Total final: <b className="text-white">{formatMoney(totalVenda)}</b></p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white">Itens da venda</h3>
            {itens.length === 0 ? (
              <p className="text-sm text-blue-100/70">Nenhum item adicionado.</p>
            ) : (
              <div className="grid gap-2">
                {itens.map((item) => (
                  <div key={item.produtoId} className="admin-stat-card flex items-center justify-between p-3 text-sm">
                    <div>
                      <p className="font-medium text-white">{item.nome}</p>
                      <p className="text-blue-100/70">
                        {item.quantidade} x {formatMoney(item.precoUnitario)} = {formatMoney(item.quantidade * item.precoUnitario)}
                      </p>
                    </div>
                    <Button type="button" variant="destructive" onClick={() => removeItem(item.produtoId)}>
                      Remover
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="admin-surface border-primary/20">
        <CardHeader>
          <CardTitle className="text-white">Histórico de vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <p className="text-blue-100/75">Carregando vendas...</p> : null}

          {!loading && vendas.length === 0 ? (
            <p className="text-sm text-blue-100/70">Nenhuma venda registrada.</p>
          ) : null}

          {!loading && vendas.length > 0 ? (
            <div className="grid gap-2">
              {vendas.map((venda) => (
                <div key={venda.id} className="admin-stat-card p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-white">Venda #{venda.id}</p>
                    <span className="text-blue-100/70">
                      {venda.dataVenda ? new Date(venda.dataVenda).toLocaleString("pt-BR") : "-"}
                    </span>
                  </div>
                  <p className="text-blue-100/70">
                    Itens: {venda.itensCount} | Total: {formatMoney(venda.valorTotal)} | Pagamento: {venda.formaPagamento || "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
