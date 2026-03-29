import TopCellLogo from "@/components/TopCellLogo";
import { Button } from "@/components/ui/button";
import { Link, NavLink, Outlet } from "react-router-dom";

const publicLinks = [
  { to: "/", label: "Home" },
  { to: "/orcamento", label: "Solicitar orçamento" },
  { to: "/consultar-os", label: "Consultar OS" },
  { to: "/atendimento", label: "Atendimento" },
];

export default function PublicLayout() {
  return (
    <div className="min-h-screen text-foreground">
      <div className="border-b border-primary/30 bg-slate-950/90 px-4 py-2 text-center text-xs font-medium text-blue-100">
        TopCell Premium Tech: assistência especializada, reparo rápido e loja de acessórios
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <Link to="/" className="w-fit">
            <TopCellLogo imageClassName="h-11 w-11 rounded-2xl" labelClassName="hidden sm:block text-white" subtitleClassName="text-blue-200/80" />
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            {publicLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "topcell-brand-gradient text-primary-foreground shadow topcell-glow"
                      : "border border-white/15 bg-slate-900/80 text-blue-100 hover:border-primary/45 hover:text-white"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}

            <Button asChild variant="outline" className="rounded-full border-primary/40 bg-primary/10 text-primary hover:bg-primary/20">
              <NavLink to="/admin/dashboard">Painel Admin</NavLink>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-blue-100/80 sm:flex-row sm:items-center sm:justify-between">
          <p>TopCell © {new Date().getFullYear()} - Loja e assistência técnica especializada.</p>
          <p>Tecnologia, confiança e experiência premium para seu dispositivo.</p>
        </div>
      </footer>
    </div>
  );
}

