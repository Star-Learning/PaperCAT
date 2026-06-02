import { useCallback, useMemo, useState } from "react";
import type { CatState } from "../types/paper";

function softenMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "我在这里。";
  if (normalized.length <= 52) return normalized;
  return `${normalized.slice(0, 50)}...`;
}

export function useCatState() {
  const [state, setState] = useState<CatState>("idle");
  const [message, setMessage] = useState("把 PDF 放到我身上就好。");

  const messagePools = useMemo(
    () => ({
      idle: ["把 PDF 放到我身上就好。", "今天读哪篇？"],
      "drag-over": ["松手吧，我接住了。"],
      eating: ["收到，先咬一口。"],
      chewing: ["正在保存论文和缓存...", "我在整理论文信息..."],
      thinking: ["正在认真读，稍等一下。", "我去问问模型，马上回来。"],
      success: ["读完啦，可以点提示查看。"],
      error: ["这次没吃下去，看看提示再试试。"],
      hover: ["右侧小菜单里有历史记录。"],
      sleeping: ["有论文再叫我。"],
    }),
    [],
  );

  const setCatState = useCallback(
    (nextState: CatState, customMessage?: string) => {
      setState(nextState);
      if (customMessage) {
        setMessage(softenMessage(customMessage));
        return;
      }
      const pool = messagePools[nextState] ?? messagePools.idle;
      setMessage(pool[Math.floor(Math.random() * pool.length)]);
    },
    [messagePools],
  );

  return { state, message, setCatState };
}
