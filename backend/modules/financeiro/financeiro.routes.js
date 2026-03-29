import { Router } from "express";
import { getFinanceiroOverviewHandler } from "./financeiro.controller.js";

const financeiroRouter = Router();

// GET /api/financeiro?data_inicial=YYYY-MM-DD&data_final=YYYY-MM-DD
financeiroRouter.get("/", getFinanceiroOverviewHandler);

export default financeiroRouter;

