import { Router } from "express";
import { getDashboardSummaryHandler } from "./dashboard.controller.js";

const dashboardRouter = Router();

// GET /api/dashboard -> resumo de indicadores do painel admin.
dashboardRouter.get("/", getDashboardSummaryHandler);

export default dashboardRouter;
