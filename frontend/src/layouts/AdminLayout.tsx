import TopCellLogo from "@/components/TopCellLogo";
import { clearAdminToken } from "@/lib/adminAuth";
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Package,
  Shield,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/ordens-servico", label: "Ordens de Serviço", icon: ClipboardList },
  { to: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/vendas", label: "Vendas", icon: ShoppingCart },
  { to: "/admin/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/admin/atendimento", label: "Atendimento", icon: MessagesSquare },
  { to: "/admin/seguranca", label: "Segurança", icon: Shield },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAdminToken();
    navigate("/admin/login", { replace: true });
  }

  return (
    <div className="admin-shell min-h-screen text-foreground">
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-80 shrink-0 border-r border-white/10 bg-[linear-gradient(178deg,hsl(224,48%,10%),hsl(224,52%,8%))] p-5 text-white lg:block">
          <div className="admin-hero mb-6 p-4">
            <TopCellLogo
              imageClassName="h-11 w-11 rounded-xl"
              className="items-start"
              labelClassName="text-white"
              subtitleClassName="text-blue-100/80"
              labelText="TopCell Admin"
            />
            <p className="mt-3 text-sm text-blue-100/75">
              Gestão completa da assistência técnica, produtos, vendas e controle financeiro.
            </p>
          </div>

          <nav className="space-y-1.5">
            {adminLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "topcell-brand-gradient text-primary-foreground shadow topcell-glow"
                      : "border border-transparent text-blue-100 hover:border-white/10 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                <link.icon size={16} />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
          >
            <LogOut size={15} />
            Sair do painel
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary lg:hidden">
                  <Menu size={16} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">TopCell</p>
                  <p className="text-xs text-blue-100/75">Painel administrativo</p>
                </div>
              </div>

              <div className="hidden flex-wrap gap-2 lg:flex">
                {adminLinks.map((link) => (
                  <NavLink
                    key={`top-${link.to}`}
                    to={link.to}
                    className={({ isActive }) =>
                      `rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        isActive
                          ? "topcell-brand-gradient text-primary-foreground"
                          : "border border-white/15 bg-slate-900/65 text-blue-100 hover:border-primary/35"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-primary/35 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
                >
                  Sair
                </button>
                <NavLink
                  to="/"
                  className="rounded-full border border-white/20 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-primary/35"
                >
                  Área pública
                </NavLink>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
