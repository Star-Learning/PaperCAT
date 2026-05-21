import { Clipboard, History } from "lucide-react";
import { useEffect, useState } from "react";
import type { PaperSummary } from "../types/paper";
import { MarkdownViewer } from "./MarkdownViewer";

export function SummaryWindow() {
  const [summary, setSummary] = useState<PaperSummary | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.paperCat?.getCurrentSummary().then(setSummary);
    return window.paperCat?.onSummaryUpdated(setSummary);
  }, []);

  const copyMarkdown = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary.summary_markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!summary) {
    return (
      <main className="page-shell">
        <p className="empty-state">还没有总结。先把 PDF 喂给桌面小猫吧。</p>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <div>
          <h1>{summary.title ?? "未命名论文"}</h1>
          <p>{summary.short_comment ?? "小猫读完了。"}</p>
        </div>
        <div className="header-actions">
          <button type="button" className="icon-button text-button" onClick={copyMarkdown}>
            <Clipboard size={17} />
            {copied ? "已复制" : "复制 Markdown"}
          </button>
          <button type="button" className="icon-button" onClick={() => window.paperCat?.openHistory()} title="历史">
            <History size={18} />
          </button>
        </div>
      </header>
      <MarkdownViewer markdown={summary.summary_markdown} />
    </main>
  );
}

