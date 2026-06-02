import { Check, FolderOpen, HardDrive, KeyRound, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { paperApi } from "../api/paperApi";

const SETUP_PROMPT_KEY = "paperCat.setupPrompted.v2";

interface ModelProvider {
  id: string;
  name: string;
  baseUrl: string;
  hint: string;
  models: string[];
}

const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    hint: "官方 API",
    models: [
      "gpt-5.5",
      "gpt-5.5-2026-04-23",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.2",
      "gpt-5.2-chat-latest",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-4.1",
      "gpt-4.1-mini",
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    hint: "DeepSeek 官方兼容接口",
    models: ["deepseek-v4-flash", "deepseek-v4-pro", "deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "dashscope",
    name: "通义千问",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    hint: "阿里云 DashScope 兼容接口",
    models: ["qwen-plus", "qwen-max", "qwen-turbo", "qwen-long"],
  },
  {
    id: "moonshot",
    name: "Moonshot / Kimi",
    baseUrl: "https://api.moonshot.cn/v1",
    hint: "月之暗面兼容接口",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k", "kimi-k2-0711-preview"],
  },
  {
    id: "zhipu",
    name: "智谱 GLM",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    hint: "智谱开放平台兼容接口",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4.5"],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.cn/v1",
    hint: "硅基流动兼容接口",
    models: ["Qwen/Qwen3-235B-A22B", "deepseek-ai/DeepSeek-V3", "deepseek-ai/DeepSeek-R1"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    hint: "OpenRouter 聚合接口",
    models: ["openai/gpt-4.1-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"],
  },
];

function isSetupMode() {
  const [, query = ""] = window.location.hash.split("?");
  return new URLSearchParams(query).get("mode") === "setup";
}

function normalizeUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function providerForBaseUrl(baseUrl: string) {
  return MODEL_PROVIDERS.find((provider) => normalizeUrl(provider.baseUrl) === normalizeUrl(baseUrl));
}

export function SettingsPanel() {
  const setupMode = useMemo(isSetupMode, []);
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [providerId, setProviderId] = useState(MODEL_PROVIDERS[0].id);
  const [model, setModel] = useState(MODEL_PROVIDERS[0].models[0]);
  const [currentCustomProvider, setCurrentCustomProvider] = useState<ModelProvider | null>(null);
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [databasePath, setDatabasePath] = useState("");
  const [paperCacheDir, setPaperCacheDir] = useState("");
  const [status, setStatus] = useState("");
  const [savingApi, setSavingApi] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);

  const providers = useMemo(
    () => (currentCustomProvider ? [...MODEL_PROVIDERS, currentCustomProvider] : MODEL_PROVIDERS),
    [currentCustomProvider],
  );
  const selectedProvider = providers.find((provider) => provider.id === providerId) ?? providers[0];
  const modelOptions = selectedProvider.models.includes(model) ? selectedProvider.models : [model, ...selectedProvider.models];

  useEffect(() => {
    void Promise.allSettled([paperApi.getLlmSettings(), paperApi.getStorageSettings()]).then(
      ([llmResult, storageResult]) => {
        if (llmResult.status === "fulfilled") {
          const settings = llmResult.value;
          const matched = providerForBaseUrl(settings.base_url);
          if (matched) {
            setProviderId(matched.id);
            setCurrentCustomProvider(null);
          } else {
            const customProvider: ModelProvider = {
              id: "current-compatible",
              name: "当前兼容服务",
              baseUrl: settings.base_url,
              hint: "从本地旧配置读取",
              models: [settings.model],
            };
            setCurrentCustomProvider(customProvider);
            setProviderId(customProvider.id);
          }
          setMaskedKey(settings.api_key_masked);
          setModel(settings.model);
          setTimeoutSeconds(settings.timeout_seconds);
        }
        if (storageResult.status === "fulfilled") {
          setDatabasePath(storageResult.value.database_path);
          setPaperCacheDir(storageResult.value.paper_cache_dir);
        }
        if (llmResult.status === "rejected" || storageResult.status === "rejected") {
          setStatus("读取配置失败，请确认后端已经启动。");
        }
      },
    );
  }, []);

  const markSetupDone = () => {
    window.localStorage.setItem(SETUP_PROMPT_KEY, "done");
  };

  const closeSetup = () => {
    markSetupDone();
    window.close();
  };

  const chooseProvider = (nextProvider: ModelProvider) => {
    setProviderId(nextProvider.id);
    setModel(nextProvider.models[0]);
  };

  const saveApi = async () => {
    setSavingApi(true);
    setStatus("");
    try {
      const next = await paperApi.updateLlmSettings({
        api_key: apiKey.trim() || undefined,
        base_url: selectedProvider.baseUrl,
        model,
        timeout_seconds: timeoutSeconds,
      });
      setApiKey("");
      setMaskedKey(next.api_key_masked);
      setTimeoutSeconds(next.timeout_seconds);
      markSetupDone();
      setStatus(`已保存 ${selectedProvider.name} / ${model}，新的论文解读会使用这组配置。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存 API 配置失败。");
    } finally {
      setSavingApi(false);
    }
  };

  const browseStorage = async () => {
    const directory = await window.paperCat?.selectDirectory();
    if (directory) setPaperCacheDir(directory);
  };

  const saveStorage = async () => {
    setSavingStorage(true);
    setStatus("");
    try {
      const next = await paperApi.updateStorageSettings({
        paper_cache_dir: paperCacheDir.trim(),
      });
      setDatabasePath(next.database_path);
      setPaperCacheDir(next.paper_cache_dir);
      markSetupDone();
      setStatus("保存路径已更新，之后投喂的论文会缓存到新目录。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存路径失败。");
    } finally {
      setSavingStorage(false);
    }
  };

  return (
    <main className="page-shell settings-page">
      <header className="page-header settings-hero">
        <div>
          <h1>{setupMode ? "初次设置 PaperCAT" : "PaperCAT 设置"}</h1>
          <p>
            {setupMode
              ? "先确认论文保存位置和大模型厂商。也可以跳过，之后随时从小猫菜单里回来修改。"
              : "密钥只保存在本地；缓存目录用于保存 PDF 副本、metadata 和 summary.md。"}
          </p>
        </div>
        {setupMode && (
          <button type="button" className="icon-button text-button" onClick={closeSetup}>
            <X size={17} />
            稍后再说
          </button>
        )}
      </header>

      <section className="settings-form settings-section">
        <h2>
          <HardDrive size={18} />
          保存路径
        </h2>
        <label>
          <span>论文缓存目录</span>
          <div className="path-input-row">
            <input value={paperCacheDir} onChange={(event) => setPaperCacheDir(event.target.value)} />
            <button type="button" className="icon-button" title="选择文件夹" onClick={browseStorage}>
              <FolderOpen size={17} />
            </button>
          </div>
        </label>

        <label>
          <span>历史数据库位置，只读</span>
          <input value={databasePath} readOnly />
        </label>

        <div className="settings-actions">
          <button
            type="button"
            className="icon-button text-button"
            onClick={saveStorage}
            disabled={savingStorage}
          >
            {savingStorage ? <HardDrive size={17} /> : <Save size={17} />}
            {savingStorage ? "保存中" : "保存路径"}
          </button>
        </div>
      </section>

      <section className="settings-form settings-section">
        <h2>
          <KeyRound size={18} />
          大模型 API
        </h2>

        <div className="provider-grid" role="radiogroup" aria-label="大模型厂商">
          {providers.map((provider) => (
            <button
              key={provider.id}
              type="button"
              className={`provider-option ${providerId === provider.id ? "active" : ""}`}
              onClick={() => chooseProvider(provider)}
              role="radio"
              aria-checked={providerId === provider.id}
            >
              <strong>{provider.name}</strong>
              <span>{provider.hint}</span>
            </button>
          ))}
        </div>

        <label>
          <span>模型</span>
          <select className="settings-select" value={model} onChange={(event) => setModel(event.target.value)}>
            {modelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={maskedKey ? `当前：${maskedKey}，留空则不修改` : "粘贴这个厂商的 API key"}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>

        <label>
          <span>请求超时，秒</span>
          <input
            type="number"
            min={10}
            step={5}
            value={timeoutSeconds}
            onChange={(event) => setTimeoutSeconds(Number(event.target.value))}
          />
        </label>

        <div className="settings-actions">
          <button type="button" className="icon-button text-button" onClick={saveApi} disabled={savingApi}>
            {savingApi ? <KeyRound size={17} /> : <Save size={17} />}
            {savingApi ? "保存中" : "保存 API"}
          </button>
          {setupMode && (
            <button type="button" className="icon-button text-button" onClick={closeSetup}>
              <Check size={17} />
              完成
            </button>
          )}
          {status && <p>{status}</p>}
        </div>
      </section>
    </main>
  );
}
