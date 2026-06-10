import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  FolderOpen,
  Search,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { paperApi } from "../api/paperApi";
import type { PaperSummary } from "../types/paper";
import { MarkdownViewer } from "./MarkdownViewer";
import { PaperChatPanel } from "./PaperChatWindow";

type ReadingStatus = PaperSummary["reading_status"];
type StatusFilter = "all" | ReadingStatus;

const statusOptions: Array<{ value: ReadingStatus; label: string; icon: typeof BookOpen }> = [
  { value: "unread", label: "待读", icon: BookOpen },
  { value: "reading", label: "在读", icon: FileText },
  { value: "read", label: "已读", icon: CheckCircle2 },
  { value: "favorite", label: "收藏", icon: Star },
];

function statusLabel(value: ReadingStatus) {
  return statusOptions.find((item) => item.value === value)?.label ?? "待读";
}

function statusIcon(value: ReadingStatus) {
  return statusOptions.find((item) => item.value === value)?.icon ?? BookOpen;
}

function parseTags(value?: string | null) {
  return (value ?? "")
    .split(/[,，#\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeTags(value: string) {
  return Array.from(new Set(parseTags(value))).join(", ");
}

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

function findMarkdownSectionBounds(markdown: string, heading: string) {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (startIndex < 0) return null;
  let endIndex = lines.length;
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index].trim())) {
      endIndex = index;
      break;
    }
  }
  return { startIndex, endIndex, lines };
}

function extractMarkdownSection(markdown: string, heading: string) {
  const bounds = findMarkdownSectionBounds(markdown, heading);
  if (!bounds) return "";
  return bounds.lines.slice(bounds.startIndex + 1, bounds.endIndex).join("\n").trim();
}

function removeMarkdownSection(markdown: string, heading: string) {
  const bounds = findMarkdownSectionBounds(markdown, heading);
  if (!bounds) return markdown;
  return [
    ...bounds.lines.slice(0, bounds.startIndex),
    ...bounds.lines.slice(bounds.endIndex),
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function HistoryPanel() {
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [selected, setSelected] = useState<PaperSummary | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [error, setError] = useState("");
  const highlightTimerRef = useRef<number | null>(null);
  const itemRefs = useRef(new Map<string, HTMLButtonElement>());

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
      if (preferredId) {
        setQuery("");
        setStatusFilter("all");
        setTagFilter("");
      }
      setError("");
      const result = await paperApi.list();
      const preferredPaper = preferredId ? result.papers.find((paper) => paper.id === preferredId) : undefined;
      setPapers(result.papers);
      setSelected((current) => {
        if (preferredId) return preferredPaper ?? result.papers[0] ?? null;
        if (current) return result.papers.find((paper) => paper.id === current.id) ?? result.papers[0] ?? null;
        return result.papers[0] ?? null;
      });
      if (preferredPaper) flashPaper(preferredPaper.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "历史读取失败。");
    }
  };

  useEffect(() => {
    void (async () => {
      const pendingId = (await window.paperCat?.getPendingHistorySelection?.()) ?? undefined;
      void load(paperIdFromHash() ?? pendingId);
    })();
    const handleHashChange = () => {
      void load(paperIdFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
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

  useEffect(() => {
    setTagDraft(selected?.tags ?? "");
  }, [selected?.id, selected?.tags]);

  const allTags = useMemo(
    () => Array.from(new Set(papers.flatMap((paper) => parseTags(paper.tags)))).sort((a, b) => a.localeCompare(b)),
    [papers],
  );

  const filteredPapers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return papers.filter((paper) => {
      if (statusFilter !== "all" && paper.reading_status !== statusFilter) return false;
      if (tagFilter && !parseTags(paper.tags).includes(tagFilter)) return false;
      if (!needle) return true;
      const haystack = [
        paper.title,
        paper.authors,
        paper.year,
        paper.file_name,
        paper.file_path,
        paper.short_comment,
        paper.tags,
        paper.summary_markdown,
      ]
        .filter(Boolean)
        .join("\n")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [papers, query, statusFilter, tagFilter]);

  useEffect(() => {
    if (!highlightedId) return;
    itemRefs.current.get(highlightedId)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightedId, filteredPapers]);

  const boardMarkdown = useMemo(
    () => (selected ? extractMarkdownSection(selected.summary_markdown, "论文看板") : ""),
    [selected],
  );
  const summaryWithoutBoard = useMemo(
    () => (selected ? removeMarkdownSection(selected.summary_markdown, "论文看板") : ""),
    [selected],
  );

  const updatePaperInState = (paper: PaperSummary) => {
    setPapers((current) => current.map((item) => (item.id === paper.id ? paper : item)));
    setSelected((current) => (current?.id === paper.id ? paper : current));
  };

  const saveMeta = async (nextStatus = selected?.reading_status ?? "unread", nextTags = tagDraft) => {
    if (!selected) return;
    setSavingMeta(true);
    setError("");
    try {
      const updated = await paperApi.update(selected.id, {
        reading_status: nextStatus,
        tags: normalizeTags(nextTags) || null,
      });
      updatePaperInState(updated);
      setTagDraft(updated.tags ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存标签或状态失败。");
    } finally {
      setSavingMeta(false);
    }
  };

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
          <span>
            {filteredPapers.length}/{papers.length} 篇
          </span>
        </header>

        <div className="history-tools">
          <label className="history-search">
            <Search size={15} />
            <input value={query} placeholder="搜索标题、作者、摘要、标签..." onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="status-filter">
            <button type="button" className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
              全部
            </button>
            {statusOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={statusFilter === value ? "active" : ""}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="tag-filter-row">
              <button type="button" className={!tagFilter ? "active" : ""} onClick={() => setTagFilter("")}>
                全部标签
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={tagFilter === tag ? "active" : ""}
                  onClick={() => setTagFilter(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="error-line">{error}</p>}
        {papers.length === 0 && <p className="muted">还没有解读过论文。</p>}
        {papers.length > 0 && filteredPapers.length === 0 && <p className="muted">没有匹配的历史记录。</p>}

        <div className="history-list">
          {filteredPapers.map((paper) => {
            const StatusIcon = statusIcon(paper.reading_status);
            const tags = parseTags(paper.tags);
            return (
              <button
                key={paper.id}
                ref={(node) => {
                  if (node) {
                    itemRefs.current.set(paper.id, node);
                  } else {
                    itemRefs.current.delete(paper.id);
                  }
                }}
                className={`history-item ${selected?.id === paper.id ? "active" : ""} ${
                  highlightedId === paper.id ? "new-paper" : ""
                }`}
                type="button"
                onClick={() => setSelected(paper)}
              >
                <strong>{paper.title || paper.file_name || "未命名论文"}</strong>
                <span className={`paper-status status-${paper.reading_status}`}>
                  <StatusIcon size={12} />
                  {statusLabel(paper.reading_status)}
                </span>
                <span className="paper-time-tag">
                  <CalendarClock size={12} />
                  读取于 {formatTime(paper.created_at)}
                </span>
                <span className="history-item-meta">
                  <FileText size={13} />
                  {paper.page_count ? `${paper.page_count} 页` : "页数未知"} · {formatSize(paper.file_size)}
                </span>
                {tags.length > 0 && (
                  <span className="history-tag-list">
                    {tags.slice(0, 4).map((tag) => (
                      <em key={tag}>#{tag}</em>
                    ))}
                  </span>
                )}
                {paper.short_comment && <small>{paper.short_comment}</small>}
              </button>
            );
          })}
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

            <section className="paper-meta-editor">
              <div className="status-editor">
                {statusOptions.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    className={selected.reading_status === value ? "active" : ""}
                    disabled={savingMeta}
                    onClick={() => void saveMeta(value)}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
              <label className="tag-editor">
                <Tags size={15} />
                <input
                  value={tagDraft}
                  placeholder="添加标签，用逗号或空格分隔"
                  onChange={(event) => setTagDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void saveMeta();
                    }
                  }}
                />
                <button type="button" disabled={savingMeta} onClick={() => void saveMeta()}>
                  保存
                </button>
              </label>
            </section>

            <section className="paper-board-panel">
              <header>
                <h3>论文看板</h3>
              </header>
              {boardMarkdown ? (
                <MarkdownViewer markdown={boardMarkdown} />
              ) : (
                <p className="empty-state">这篇论文还没有单独生成论文看板。</p>
              )}
            </section>

            <div className="paper-reader-grid">
              <section className="paper-pdf-panel">
                <header>
                  <h3>PDF 原文</h3>
                </header>
                <iframe title={`${selected.title || selected.file_name || "paper"} PDF`} src={paperApi.pdfUrl(selected.id)} />
              </section>

              <section className="paper-summary-panel">
                <header>
                  <h3>PaperCAT 总结</h3>
                </header>
                <MarkdownViewer markdown={summaryWithoutBoard} />
              </section>
            </div>
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
