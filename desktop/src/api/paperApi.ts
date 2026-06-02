import type { PaperChatMessage, PaperChatResponse, PaperListResponse, PaperSummary } from "../types/paper";

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

async function streamFromBase(
  base: string,
  path: string,
  init: RequestInit,
  onDelta: (text: string) => void,
): Promise<void> {
  const response = await fetch(`${base}${path}`, {
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.detail ?? "小猫处理失败了。");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatchEvent = (rawEvent: string) => {
    const lines = rawEvent.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
    const data = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (event === "delta") {
      const payload = JSON.parse(data) as { text?: string };
      if (payload.text) onDelta(payload.text);
      return;
    }
    if (event === "error") {
      const payload = JSON.parse(data) as { message?: string };
      throw new Error(payload.message ?? "这次对话失败了。");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replace(/\r\n/g, "\n");
    let separatorIndex = buffer.indexOf("\n\n");
    while (separatorIndex >= 0) {
      const rawEvent = buffer.slice(0, separatorIndex).trim();
      buffer = buffer.slice(separatorIndex + 2);
      if (rawEvent) dispatchEvent(rawEvent);
      separatorIndex = buffer.indexOf("\n\n");
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) dispatchEvent(buffer.trim());
}

async function streamRequest(
  path: string,
  init: RequestInit,
  onDelta: (text: string) => void,
): Promise<void> {
  let lastError: unknown;
  for (const base of [...new Set(API_BASES)]) {
    try {
      await streamFromBase(base, path, init, onDelta);
      return;
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
  lookupByFilePath: (filePath: string) =>
    request<PaperSummary | null>(`/api/papers/lookup?file_path=${encodeURIComponent(filePath)}`),
  get: (id: string) => request<PaperSummary>(`/api/papers/${id}`),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/papers/${id}`, {
      method: "DELETE",
    }),
  chat: (id: string, question: string, history: PaperChatMessage[]) =>
    request<PaperChatResponse>(`/api/papers/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ question, history }),
    }),
  chatStream: (id: string, question: string, history: PaperChatMessage[], onDelta: (text: string) => void) =>
    streamRequest(
      `/api/papers/${id}/chat/stream`,
      {
        method: "POST",
        body: JSON.stringify({ question, history }),
      },
      onDelta,
    ),
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
