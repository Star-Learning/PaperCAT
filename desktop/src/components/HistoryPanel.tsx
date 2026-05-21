import { CalendarClock, FileText, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { paperApi } from "../api/paperApi";
import type { PaperSummary } from "../types/paper";
import { MarkdownViewer } from "./MarkdownViewer";

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatSize(size?: number | null) {
  if (!size) return "未知大小";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function HistoryPanel() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [selected, setSelected] = useState<PaperSummary | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const result = await paperApi.list();
      setPapers(result.papers);
      setSelected((current) => {
        if (current && result.papers.some((paper) => paper.id === current.id)) return current;
        return result.papers[0] ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "历史读取失败。");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (paper: PaperSummary) => {
    await paperApi.delete(paper.id);
    setSelected((current) => (current?.id === paper.id ? null : current));
    await load();
  };

  return (
    <main className="history-layout">
      <aside className="history-sidebar">
        <header className="history-sidebar-header">
          <h1>阅读历史</h1>
          <span>{papers.length} 篇</span>
        </header>
        {error && <p className="error-line">{error}</p>}
        {papers.length === 0 && <p className="muted">还没有解读过论文。</p>}
        <div className="history-list">
          {papers.map((paper) => (
            <button
              key={paper.id}
              className={`history-item ${selected?.id === paper.id ? "active" : ""}`}
              type="button"
              onClick={() => setSelected(paper)}
            >
              <strong>{paper.title || paper.file_name || "未命名论文"}</strong>
              <span className="history-item-meta">
                <CalendarClock size={13} />
                {formatTime(paper.created_at)}
              </span>
              <span className="history-item-meta">
                <FileText size={13} />
                {paper.page_count ? `${paper.page_count} 页` : "页数未知"} · {formatSize(paper.file_size)}
              </span>
              {paper.short_comment && <small>{paper.short_comment}</small>}
            </button>
          ))}
        </div>
      </aside>

      <section className="history-detail">
        {selected ? (
          <>
            <header className="history-detail-header">
              <div className="history-title-block">
                <h2>{selected.title || selected.file_name || "未命名论文"}</h2>
                <p title={selected.file_path}>{selected.file_path}</p>
              </div>
              <button type="button" className="icon-button danger" onClick={() => remove(selected)} title="删除">
                <Trash2 size={17} />
              </button>
            </header>

            <div className="paper-info-strip">
              <span>
                <FileText size={14} />
                {selected.page_count ? `${selected.page_count} 页` : "页数未知"}
              </span>
              <span>{formatSize(selected.file_size)}</span>
              {selected.cache_dir && (
                <span title={selected.cache_dir}>
                  <FolderOpen size={14} />
                  已缓存
                </span>
              )}
            </div>

            <MarkdownViewer markdown={selected.summary_markdown} />
          </>
        ) : (
          <p className="empty-state">选择一条历史查看解读。</p>
        )}
      </section>
    </main>
  );
}

