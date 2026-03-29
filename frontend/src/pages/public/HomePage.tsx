import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TopCellLogo from "@/components/TopCellLogo";
import {
  BatteryCharging,
  Bluetooth,
  Headphones,
  MessageSquareMore,
  ShieldCheck,
  Smartphone,
  TabletSmartphone,
  Wrench,
} from "lucide-react";

const shopHighlights = [
  { title: "Celulares", description: "Modelos novos e seminovos com garantia local e curadoria TopCell.", icon: Smartphone },
  { title: "Caixinhas de som", description: "Áudio de alta potência para casa, trabalho e lazer.", icon: Bluetooth },
  { title: "Fones", description: "Fones bluetooth e headsets para performance e conforto.", icon: Headphones },
  { title: "Acessórios", description: "Capas, películas, carregadores e cabos premium.", icon: BatteryCharging },
  { title: "Assistência técnica", description: "Diagnóstico especializado com acompanhamento de OS.", icon: Wrench },
];

const quickLinks = [
  {
    title: "Solicitar orçamento",
    description: "Envie os dados do aparelho e receba retorno rápido.",
    to: "/orcamento",
    icon: TabletSmartphone,
    action: "Abrir formulário",
  },
  {
    title: "Consultar minha OS",
    description: "Acompanhe status e etapa do reparo em tempo real.",
    to: "/consultar-os",
    icon: ShieldCheck,
    action: "Ver andamento",
  },
  {
    title: "Atendimento / Chat",
    description: "Canal direto com a equipe para dúvidas e suporte.",
    to: "/atendimento",
    icon: MessageSquareMore,
    action: "Iniciar conversa",
  },
];

export default function HomePage() {
  return (
    <section className="space-y-8" data-cy="public-home-page">
      <div className="topcell-surface-strong relative overflow-hidden border-primary/30 p-6 lg:p-10">
        <div className="pointer-events-none absolute -right-32 -top-28 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.35fr_0.85fr] lg:items-center">
          <div className="space-y-5 topcell-fade-up">
            <TopCellLogo
              className="w-fit"
              imageClassName="h-14 w-14 rounded-2xl"
              labelClassName="text-white"
              subtitleClassName="text-blue-200/85"
            />

            <span className="topcell-tag">
              <Wrench size={14} className="mr-2" />
              Loja de tecnologia e assistência premium
            </span>

            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-white md:text-5xl">
              Experiência TopCell para compras, reparos e suporte em um único lugar.
            </h1>

            <p className="max-w-2xl text-base text-blue-100/85 md:text-lg">
              Uma vitrine moderna para celulares e acessórios, com atendimento técnico especializado e acompanhamento
              completo de ordens de serviço.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-7 topcell-brand-gradient text-primary-foreground topcell-glow">
                <Link to="/orcamento">Quero um orçamento</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full border-primary/45 bg-slate-950/70 px-7 text-primary hover:bg-primary/15">
                <Link to="/consultar-os">Consultar minha OS</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 topcell-fade-up">
            <div className="topcell-surface topcell-card-fx border-primary/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Destaque TopCell</p>
              <p className="mt-1 text-lg font-bold text-white">Reparo express para smartphones</p>
              <p className="mt-1 text-sm text-blue-100/75">Diagnóstico preciso, comunicação transparente e entrega rápida.</p>
            </div>
            <div className="topcell-surface topcell-card-fx border-cyan-400/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">Loja especializada</p>
              <p className="mt-1 text-lg font-bold text-white">Acessórios homologados e linha gamer</p>
              <p className="mt-1 text-sm text-blue-100/75">Performance e durabilidade para o seu ecossistema mobile.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <p className="topcell-tag">Vitrine TopCell</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Produtos e serviços em destaque</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {shopHighlights.map((item) => (
            <Card key={item.title} className="topcell-surface topcell-card-fx border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base text-white">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <item.icon size={18} />
                  </span>
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-100/75">{item.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="topcell-tag">Atalhos inteligentes</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Resolva tudo em poucos cliques</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((item) => (
            <Card key={item.title} className="topcell-surface topcell-card-fx border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-white">
                  <item.icon className="text-primary" size={20} />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-blue-100/75">
                <p>{item.description}</p>
                <Button asChild className="w-full rounded-full topcell-brand-gradient text-primary-foreground">
                  <Link to={item.to}>{item.action}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}

