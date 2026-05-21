import { useCallback, useEffect } from "react";
import { paperApi } from "../api/paperApi";
import type { CatState, PaperSummary } from "../types/paper";

interface UsePaperDropOptions {
  setCatState: (state: CatState, message?: string) => void;
  onSummary: (summary: PaperSummary) => void;
}

function resolveFilePath(file: File): string {
  if (window.paperCat?.getPathForFile) {
    return window.paperCat.getPathForFile(file);
  }
  return (file as File & { path?: string }).path ?? "";
}

export function usePaperDrop({ setCatState, onSummary }: UsePaperDropOptions) {
  const processFile = useCallback(
    async (file: File | undefined) => {
      if (!file) {
        setCatState("error", "没有接到文件。");
        return;
      }
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setCatState("error", "我现在只吃 PDF。");
        return;
      }

      const filePath = resolveFilePath(file);
      if (!filePath) {
        setCatState("error", "没有拿到本地路径，请在桌面猫窗口里拖拽 PDF。");
        return;
      }

      try {
        setCatState("eating", "收到，先咬一口。");
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        setCatState("chewing", "正在保存论文和缓存...");
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        setCatState("thinking", "正在认真读，稍等一下。");
        const summary = await paperApi.summarize(filePath);
        onSummary(summary);
        await window.paperCat?.setCurrentSummary(summary);
        setCatState(
          "success",
          summary.short_comment ? `读完啦：${summary.short_comment}` : "读完啦，点这里查看结果。",
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "处理失败了。";
        setCatState("error", message);
      }
    },
    [onSummary, setCatState],
  );

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const handleNativeDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setCatState("drag-over", "松手吧，我接住了。");
    };

    const handleNativeDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      void processFile(event.dataTransfer?.files?.[0]);
    };

    window.addEventListener("dragover", handleNativeDragOver, true);
    window.addEventListener("drop", handleNativeDrop, true);
    return () => {
      window.removeEventListener("dragover", handleNativeDragOver, true);
      window.removeEventListener("drop", handleNativeDrop, true);
    };
  }, [processFile, setCatState]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setCatState("drag-over", "松手吧，我接住了。");
    },
    [setCatState],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setCatState("drag-over", "松手吧，我接住了。");
    },
    [setCatState],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setCatState("idle");
    },
    [setCatState],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      await processFile(event.dataTransfer.files?.[0]);
    },
    [processFile],
  );

  return { handleDragEnter, handleDragOver, handleDragLeave, handleDrop };
}
