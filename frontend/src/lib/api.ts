import { getAdminToken } from "./adminAuth";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:4001").replace(/\/$/, "");

function withAuthHeaders(headers?: HeadersInit): HeadersInit {
  const token = getAdminToken();
  if (!token) return headers || {};

  return {
    ...(headers || {}),
    Authorization: `Bearer ${token}`,
  };
}

async function handle(res: Response) {
  if (!res.ok) {
    const raw = await res.text();
    if (!raw) {
      throw new Error(`Erro ${res.status}`);
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Mantem comportamento para respostas que nao sao JSON.
    }

    if (parsed?.error) {
      throw new Error(String(parsed.error));
    }

    throw new Error(raw);
  }
  return res.json();
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: withAuthHeaders(init?.headers),
  });
  return handle(res);
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  return handle(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
  return handle(res);
}
