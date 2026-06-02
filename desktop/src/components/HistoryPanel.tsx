import { CalendarClock, ExternalLink, FileText, FolderOpen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { paperApi } from "../api/paperApi";
import type { PaperSummary } from "../types/paper";
import { MarkdownViewer } from "./MarkdownViewer";
import { PaperChatPanel } from "./PaperChatWindow";

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function formatSize(size?: number | null) {
  if (!size) return "未知大小";
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function upsertNewest(papers: PaperSummary[], paper: PaperSummary) {
  return [paper, ...papers.filter((item) => item.id !== paper.id)];
}

function paperIdFromHash() {
  const [, query = ""] = window.location.hash.split("?");
  return new URLSearchParams(query).get("paperId") ?? undefined;
}

export function HistoryPanel() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [selected, setSelected] = useState<PaperSummary | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const highlightTimerRef = useRef<number | null>(null);

  const flashPaper = (paperId: string) => {
    setHighlightedId(paperId);
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedId(null);
      highlightTimerRef.current = null;
    }, 3600);
  };

  const load = async (preferredId?: string) => {
    try {
      setError("");
      const result = await paperApi.list();
      setPapers(result.papers);
      setSelected((current) => {
        if (preferredId) return result.papers.find((paper) => paper.id === preferredId) ?? result.papers[0] ?? null;
        if (current && result.papers.some((paper) => paper.id === current.id)) return current;
        return result.papers[0] ?? null;
      });
      if (preferredId) flashPaper(preferredId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "历史读取失败。");
    }
  };

  useEffect(() => {
    void load(paperIdFromHash());
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return window.paperCat?.onSummaryCreated((paper) => {
      setPapers((current) => upsertNewest(current, paper));
      setSelected(paper);
      flashPaper(paper.id);
      void load(paper.id);
    });
  }, []);

  useEffect(() => {
    return window.paperCat?.onHistorySelect((paperId) => {
      void load(paperId);
    });
  }, []);

  const remove = async (paper: PaperSummary) => {
    await paperApi.delete(paper.id);
    setSelected((current) => (current?.id === paper.id ? null : current));
    await load();
  };

  return (
    <main className="history-layout with-chat">
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
              className={`history-item ${selected?.id === paper.id ? "active" : ""} ${
                highlightedId === paper.id ? "new-paper" : ""
              }`}
              type="button"
              onClick={() => setSelected(paper)}
            >
              <strong>{paper.title || paper.file_name || "未命名论文"}</strong>
              <span className="paper-time-tag">
                <CalendarClock size={12} />
                读取于 {formatTime(paper.created_at)}
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

      <section className={`history-detail ${selected && highlightedId === selected.id ? "new-paper" : ""}`}>
        {selected ? (
          <>
            <header className="history-detail-header">
              <div className="history-title-block">
                <h2>{selected.title || selected.file_name || "未命名论文"}</h2>
                <p title={selected.file_path}>{selected.file_path}</p>
              </div>
              <div className="header-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => window.paperCat?.openPaperChat(selected.id)}
                  title="弹出独立论文对话窗口"
                >
                  <ExternalLink size={17} />
                </button>
                <button type="button" className="icon-button danger" onClick={() => remove(selected)} title="删除">
                  <Trash2 size={17} />
                </button>
              </div>
            </header>

            <div className="paper-info-strip">
              <span>
                <CalendarClock size={14} />
                读取于 {formatTime(selected.created_at)}
              </span>
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

      <aside className="history-chat-dock">
        {selected ? (
          <PaperChatPanel key={selected.id} paperId={selected.id} paper={selected} compact />
        ) : (
          <div className="chat-shell compact">
            <p className="empty-state">选择论文后，这里会出现固定对话窗。</p>
          </div>
        )}
      </aside>
    </main>
  );
}
