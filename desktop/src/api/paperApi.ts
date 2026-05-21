import type { PaperListResponse, PaperSummary } from "../types/paper";

export interface LlmSettings {
  has_api_key: boolean;
  api_key_masked: string;
  base_url: string;
  model: string;
  timeout_seconds: number;
}

export interface LlmSettingsUpdate {
  api_key?: string;
  base_url: string;
  model: string;
  timeout_seconds: number;
}

export interface StorageSettings {
  database_path: string;
  paper_cache_dir: string;
}

export interface StorageSettingsUpdate {
  paper_cache_dir: string;
}

const API_BASES = [
  import.meta.env.VITE_PAPER_CAT_API_BASE || "http://127.0.0.1:8766",
  "http://127.0.0.1:8766",
];

async function requestFromBase<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new Error("后端还没醒，稍等一下或重新启动 PaperCat。");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "小猫处理失败了。");
  }
  return response.json() as Promise<T>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let lastError: unknown;
  for (const base of [...new Set(API_BASES)]) {
    try {
      return await requestFromBase<T>(base, path, init);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("小猫处理失败了。");
}

export const paperApi = {
  health: () => request<{ status: string }>("/api/health"),
  summarize: (filePath: string) =>
    request<PaperSummary>("/api/papers/summarize", {
      method: "POST",
      body: JSON.stringify({ file_path: filePath }),
    }),
  list: () => request<PaperListResponse>("/api/papers"),
  get: (id: string) => request<PaperSummary>(`/api/papers/${id}`),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/papers/${id}`, {
      method: "DELETE",
    }),
  getLlmSettings: () => request<LlmSettings>("/api/settings/llm"),
  updateLlmSettings: (payload: LlmSettingsUpdate) =>
    request<LlmSettings>("/api/settings/llm", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getStorageSettings: () => request<StorageSettings>("/api/settings/storage"),
  updateStorageSettings: (payload: StorageSettingsUpdate) =>
    request<StorageSettings>("/api/settings/storage", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};
