import { FolderOpen, HardDrive, KeyRound, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { paperApi } from "../api/paperApi";

export function SettingsPanel() {
  const [apiKey, setApiKey] = useState("");
  const [maskedKey, setMaskedKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com");
  const [model, setModel] = useState("deepseek-v4-flash");
  const [timeoutSeconds, setTimeoutSeconds] = useState(120);
  const [databasePath, setDatabasePath] = useState("");
  const [paperCacheDir, setPaperCacheDir] = useState("");
  const [status, setStatus] = useState("");
  const [savingApi, setSavingApi] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);

  useEffect(() => {
    void Promise.allSettled([paperApi.getLlmSettings(), paperApi.getStorageSettings()]).then(
      ([llmResult, storageResult]) => {
        if (llmResult.status === "fulfilled") {
          const settings = llmResult.value;
          setMaskedKey(settings.api_key_masked);
          setBaseUrl(settings.base_url);
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

  const saveApi = async () => {
    setSavingApi(true);
    setStatus("");
    try {
      const next = await paperApi.updateLlmSettings({
        api_key: apiKey.trim() || undefined,
        base_url: baseUrl.trim(),
        model: model.trim(),
        timeout_seconds: timeoutSeconds,
      });
      setApiKey("");
      setMaskedKey(next.api_key_masked);
      setBaseUrl(next.base_url);
      setModel(next.model);
      setTimeoutSeconds(next.timeout_seconds);
      setStatus("API 配置已保存，新的论文解读会使用这组配置。");
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
      setStatus("保存路径已更新，之后投喂的论文会缓存到新目录。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "保存路径失败。");
    } finally {
      setSavingStorage(false);
    }
  };

  return (
    <main className="page-shell settings-page">
      <header className="page-header">
        <div>
          <h1>PaperCat 配置</h1>
          <p>密钥只保存在本地；缓存目录用于保存 PDF 副本、metadata 和 summary.md。</p>
        </div>
      </header>

      <section className="settings-form settings-section">
        <h2>
          <KeyRound size={18} />
          大模型 API
        </h2>
        <label>
          <span>API Key</span>
          <input
            type="password"
            value={apiKey}
            placeholder={maskedKey ? `当前：${maskedKey}，留空则不修改` : "粘贴你的 API key"}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>

        <label>
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
        </label>

        <label>
          <span>模型名称</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} />
        </label>

        <label>
          <span>请求超时（秒）</span>
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
        </div>
      </section>

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
          <span>历史数据库位置（只读）</span>
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
          {status && <p>{status}</p>}
        </div>
      </section>
    </main>
  );
}
