import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

let pool = null;
let poolConnectPromise = null;

function getDbConfig() {
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 1433,
    database: process.env.DB_DATABASE,
    options: {
      encrypt: String(process.env.DB_ENCRYPT || "true").toLowerCase() !== "false",
      trustServerCertificate: String(process.env.DB_TRUST_CERT || "true").toLowerCase() !== "false",
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };
}

export async function getPool() {
  if (pool && pool.connected) return pool;

  if (!pool) {
    pool = new sql.ConnectionPool(getDbConfig());
    pool.on("error", (error) => {
      console.error("SQL pool error:", error);
    });
  }

  if (!poolConnectPromise) {
    poolConnectPromise = pool.connect().catch((error) => {
      poolConnectPromise = null;
      throw error;
    });
  }

  await poolConnectPromise;
  return pool;
}

export { sql };
