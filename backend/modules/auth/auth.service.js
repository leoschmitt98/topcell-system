import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getPool, sql } from "../../config/db.js";

const DEFAULT_PASSWORD = String(process.env.ADMIN_DEFAULT_PASSWORD || "123456");
const JWT_SECRET = String(process.env.JWT_SECRET || "topcell-dev-secret");
const JWT_EXPIRES_IN = String(process.env.JWT_EXPIRES_IN || "12h");

function normalizeText(value) {
  return String(value || "").trim();
}

function validateNewPassword(password) {
  const value = normalizeText(password);
  if (!value) throw new Error("novaSenha e obrigatoria");
  if (value.length < 6) throw new Error("A senha deve ter no minimo 6 caracteres");
  return value;
}

async function ensureTable(pool) {
  await pool.request().query(`
    IF OBJECT_ID('dbo.admin_auth_config', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.admin_auth_config (
        id INT NOT NULL PRIMARY KEY,
        password_hash NVARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    END;
  `);
}

async function ensureRow(pool) {
  const existing = await pool.request().query("SELECT TOP 1 id FROM dbo.admin_auth_config WHERE id = 1;");
  if (existing.recordset[0]) return;

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await pool
    .request()
    .input("id", sql.Int, 1)
    .input("passwordHash", sql.NVarChar(255), passwordHash)
    .query(`
      INSERT INTO dbo.admin_auth_config (
        id,
        password_hash,
        created_at,
        updated_at
      )
      VALUES (
        @id,
        @passwordHash,
        GETDATE(),
        GETDATE()
      );
    `);
}

export async function ensureAdminAuthConfig() {
  const pool = await getPool();
  await ensureTable(pool);
  await ensureRow(pool);
}

async function getPasswordHash() {
  await ensureAdminAuthConfig();
  const pool = await getPool();
  const result = await pool.request().query("SELECT password_hash FROM dbo.admin_auth_config WHERE id = 1;");
  const hash = String(result.recordset[0]?.password_hash || "");
  if (!hash) throw new Error("Configuracao de senha admin nao encontrada");
  return hash;
}

export async function loginAdmin(password) {
  const senha = normalizeText(password);
  if (!senha) throw new Error("senha e obrigatoria");

  const passwordHash = await getPasswordHash();
  const valid = await bcrypt.compare(senha, passwordHash);
  if (!valid) throw new Error("Credenciais invalidas");

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    expiresIn: JWT_EXPIRES_IN,
  };
}

export function verifyAdminToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw new Error("Token invalido");
  }
}

export async function changeAdminPassword(currentPassword, newPassword) {
  const senhaAtual = normalizeText(currentPassword);
  if (!senhaAtual) throw new Error("senhaAtual e obrigatoria");

  const novaSenha = validateNewPassword(newPassword);

  const passwordHash = await getPasswordHash();
  const valid = await bcrypt.compare(senhaAtual, passwordHash);
  if (!valid) throw new Error("Senha atual incorreta");

  const newHash = await bcrypt.hash(novaSenha, 10);
  const pool = await getPool();

  await pool
    .request()
    .input("newHash", sql.NVarChar(255), newHash)
    .query(`
      UPDATE dbo.admin_auth_config
      SET
        password_hash = @newHash,
        updated_at = GETDATE()
      WHERE id = 1;
    `);

  return { ok: true };
}
