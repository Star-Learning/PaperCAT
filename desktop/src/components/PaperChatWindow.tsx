import { Cat, FileText, Send, Trash2, UserRound } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { paperApi } from "../api/paperApi";
import type { PaperChatMessage, PaperSummary } from "../types/paper";
import { MarkdownViewer } from "./MarkdownViewer";

function paperIdFromHash() {
  const [, query = ""] = window.location.hash.split("?");
  return new URLSearchParams(query).get("paperId") ?? "";
}

const starterQuestions = [
  "这篇论文的核心贡献是什么？",
  "关键方法和实验设计是什么？",
  "这篇论文有哪些局限或值得追问的问题？",
];

interface PaperChatPanelProps {
  paperId: string;
  paper?: PaperSummary | null;
  compact?: boolean;
}

export function PaperChatPanel({ paperId, paper: providedPaper, compact = false }: PaperChatPanelProps) {
  const [paper, setPaper] = useState<PaperSummary | null>(providedPaper ?? null);
  const [messages, setMessages] = useState<PaperChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = async () => {
    if (!paperId) return;
    setLoadingHistory(true);
    try {
      const result = await paperApi.getChatMessages(paperId);
      setMessages(result.messages.map(({ role, content }) => ({ role, content })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "读取对话历史失败。");
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    setDraft("");
    setError("");
    setPaper(providedPaper ?? null);
    void loadMessages();
  }, [paperId, providedPaper]);

  useEffect(() => {
    if (!paperId || providedPaper) return;
    void paperApi
      .get(paperId)
      .then(setPaper)
      .catch((err) => setError(err instanceof Error ? err.message : "读取论文失败。"));
  }, [paperId, providedPaper]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, loadingHistory]);

  const setPetMood = (state: "thinking" | "success" | "error", message: string) => {
    void window.paperCat?.setPetMood(state, message);
  };

  const ask = async (question = draft) => {
    const text = question.trim();
    if (!text || loading || !paperId) return;

    const history = messages;
    const nextMessages: PaperChatMessage[] = [...history, { role: "user", content: text }];
    let streamedAnswer = "";

    setMessages([...nextMessages, { role: "assistant", content: "" }]);
    setDraft("");
    setLoading(true);
    setError("");
    setPetMood("thinking", "我正边读边回答...");

    try {
      await paperApi.chatStream(paperId, text, history, (chunk) => {
        streamedAnswer += chunk;
        setMessages([...nextMessages, { role: "assistant", content: streamedAnswer }]);
      });

      if (!streamedAnswer.trim()) {
        throw new Error("模型没有返回内容。");
      }
      setPetMood("success", "论文对话回答好了。");
      void loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "这次对话失败了。");
      setMessages(streamedAnswer ? [...nextMessages, { role: "assistant", content: streamedAnswer }] : nextMessages);
      setPetMood("error", "这次论文对话没有成功。");
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = async () => {
    if (!paperId || loading) return;
    await paperApi.clearChatMessages(paperId);
    setMessages([]);
    setError("");
    setPetMood("success", "这篇论文的对话记录清空了。");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask();
  };

  return (
    <section className={`chat-shell ${compact ? "compact" : ""}`}>
      <header className="chat-header">
        <div>
          <span className="chat-kicker">
            <FileText size={14} />
            论文对话
          </span>
          <h1>{paper?.title || paper?.file_name || "正在读取论文..."}</h1>
          <p>{paper?.short_comment || "提问时会把这篇论文的 PDF 可提取正文和总结一起送入模型上下文。"}</p>
        </div>
        <button
          type="button"
          className="icon-button chat-clear-button"
          onClick={() => void clearMessages()}
          disabled={loading || messages.length === 0}
          title="清空这篇论文的对话历史"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <section className="chat-messages" ref={scrollRef}>
        {loadingHistory && <p className="muted">正在读取保存过的对话...</p>}

        {!loadingHistory && messages.length === 0 && (
          <div className="chat-empty">
            <Cat size={24} />
            <strong>从一个问题开始</strong>
            <div className="chat-starters">
              {starterQuestions.map((question) => (
                <button key={question} type="button" onClick={() => void ask(question)}>
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`chat-message ${message.role}`}>
            <div className="chat-avatar">{message.role === "assistant" ? <Cat size={16} /> : <UserRound size={16} />}</div>
            {message.content ? <MarkdownViewer markdown={message.content} /> : <div className="chat-thinking">连接模型中...</div>}
          </article>
        ))}
      </section>

      <form className="chat-composer" onSubmit={submit}>
        {error && <p className="error-line">{error}</p>}
        <div className="chat-input-row">
          <textarea
            value={draft}
            placeholder="针对这篇论文提问..."
            rows={2}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (event.ctrlKey || event.metaKey || event.shiftKey) return;
              event.preventDefault();
              void ask();
            }}
          />
          <button type="submit" className="icon-button" disabled={loading || !draft.trim()} title="发送">
            <Send size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}

export function PaperChatWindow() {
  const paperId = useMemo(paperIdFromHash, []);

  if (!paperId) {
    return (
      <main className="chat-shell">
        <p className="empty-state">没有拿到论文 ID。</p>
      </main>
    );
  }

  return <PaperChatPanel paperId={paperId} />;
}
