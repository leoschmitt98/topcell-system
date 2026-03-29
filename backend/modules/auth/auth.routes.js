import { Router } from "express";
import {
  changeAdminPasswordHandler,
  getAdminSessionHandler,
  loginAdminHandler,
} from "./auth.controller.js";
import { requireAdminAuth } from "../../middlewares/requireAdminAuth.js";

const authRouter = Router();

// POST /api/auth/login -> login admin.
authRouter.post("/login", loginAdminHandler);

// GET /api/auth/session -> valida sessao atual.
authRouter.get("/session", requireAdminAuth, getAdminSessionHandler);

// PUT /api/auth/password -> troca senha do admin.
authRouter.put("/password", requireAdminAuth, changeAdminPasswordHandler);

export default authRouter;
