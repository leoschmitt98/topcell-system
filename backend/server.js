import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { requireAdminAuth } from "./middlewares/requireAdminAuth.js";
import atendimentoRouter from "./modules/atendimento/atendimento.routes.js";
import authRouter from "./modules/auth/auth.routes.js";
import { ensureAdminAuthConfig } from "./modules/auth/auth.service.js";
import dashboardRouter from "./modules/dashboard/dashboard.routes.js";
import financeiroRouter from "./modules/financeiro/financeiro.routes.js";
import { syncFinanceiroFromBusinessData } from "./modules/financeiro/financeiro.sync.js";
import osRouter from "./modules/os/os.routes.js";
import { ensureOSSchema } from "./modules/os/os.service.js";
import orcamentosRouter from "./modules/orcamentos/orcamentos.routes.js";
import produtosRouter from "./modules/produtos/produtos.routes.js";
import publicRouter from "./modules/public/public.routes.js";
import vendasRouter from "./modules/vendas/vendas.routes.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");

const APP_NAME = "topcell-backend";
const APP_STARTED_AT = new Date().toISOString();
const PORT = Number(process.env.PORT || 4001);
const CORS_ALLOWED_ORIGINS = String(process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8080",
];

const ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS.length > 0 ? CORS_ALLOWED_ORIGINS : DEFAULT_ORIGINS;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS bloqueado para origem: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    app: APP_NAME,
    status: "online",
    startedAt: APP_STARTED_AT,
    environment: process.env.NODE_ENV || "development",
  });
});

// Auth admin.
app.use("/api/auth", authRouter);
app.use("/api/public", publicRouter);

// Modulos protegidos do TopCell.
app.use("/api/dashboard", requireAdminAuth, dashboardRouter);
app.use("/api/financeiro", requireAdminAuth, financeiroRouter);
app.use("/api/atendimento", requireAdminAuth, atendimentoRouter);
app.use("/api/os", requireAdminAuth, osRouter);
app.use("/api/orcamentos", requireAdminAuth, orcamentosRouter);
app.use("/api/produtos", requireAdminAuth, produtosRouter);
app.use("/api/vendas", requireAdminAuth, vendasRouter);

app.use((err, _req, res, _next) => {
  console.error("Erro interno:", err);
  res.status(500).json({ ok: false, error: "Erro interno do servidor" });
});

async function bootstrap() {
  await ensureAdminAuthConfig();
  await ensureOSSchema();
  const syncInfo = await syncFinanceiroFromBusinessData();
  console.log(
    `Financeiro sincronizado: vendas=${syncInfo.insertedSales}, os=${syncInfo.insertedOs}, coluna_os_valor=${
      syncInfo.osValueColumnUsed || "nenhuma"
    }`
  );

  app.listen(PORT, () => {
    console.log(`TopCell backend rodando na porta ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error("Falha ao iniciar backend:", error);
  process.exit(1);
});
