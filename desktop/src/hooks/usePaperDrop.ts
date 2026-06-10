import { useCallback, useEffect, useRef } from "react";
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
  const dragLeaveTimerRef = useRef<number | null>(null);

  const clearDragLeaveTimer = useCallback(() => {
    if (dragLeaveTimerRef.current === null) return;
    window.clearTimeout(dragLeaveTimerRef.current);
    dragLeaveTimerRef.current = null;
  }, []);

  const scheduleDragLeaveReset = useCallback(() => {
    clearDragLeaveTimer();
    dragLeaveTimerRef.current = window.setTimeout(() => {
      dragLeaveTimerRef.current = null;
      setCatState("idle");
    }, 120);
  }, [clearDragLeaveTimer, setCatState]);

  const processFile = useCallback(
    async (file: File | undefined) => {
      clearDragLeaveTimer();
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
        setCatState("thinking", "我先查一下这篇论文有没有读过...");
        const existing = await paperApi.lookupByFilePath(filePath);
        if (existing) {
          onSummary(existing);
          await window.paperCat?.setCurrentSummary(existing);
          await window.paperCat?.openHistory(existing.id);
          setCatState("success", "这篇论文已经读过啦，已跳到历史记录。");
          return;
        }

        setCatState("eating", "收到，先咬一口。");
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        setCatState("chewing", "正在保存论文和缓存...");
        await new Promise((resolve) => window.setTimeout(resolve, 300));
        setCatState("thinking", "正在认真读，稍等一下。");
        const summary = await paperApi.summarize(filePath);
        onSummary(summary);
        await window.paperCat?.publishSummary(summary);
        setCatState(
          "success",
          summary.short_comment ? `读完啦：${summary.short_comment}` : "读完啦，点这里查看结果。",
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "处理失败了。";
        setCatState("error", message);
      }
    },
    [clearDragLeaveTimer, onSummary, setCatState],
  );

  useEffect(() => {
    const hasFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");

    const handleNativeDragOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      clearDragLeaveTimer();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setCatState("drag-over", "松手吧，我接住了。");
    };

    const handleNativeDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      scheduleDragLeaveReset();
    };

    const handleNativeDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.stopPropagation();
      clearDragLeaveTimer();
      void processFile(event.dataTransfer?.files?.[0]);
    };

    window.addEventListener("dragover", handleNativeDragOver, true);
    window.addEventListener("dragleave", handleNativeDragLeave, true);
    window.addEventListener("drop", handleNativeDrop, true);
    return () => {
      clearDragLeaveTimer();
      window.removeEventListener("dragover", handleNativeDragOver, true);
      window.removeEventListener("dragleave", handleNativeDragLeave, true);
      window.removeEventListener("drop", handleNativeDrop, true);
    };
  }, [clearDragLeaveTimer, processFile, scheduleDragLeaveReset, setCatState]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      clearDragLeaveTimer();
      setCatState("drag-over", "松手吧，我接住了。");
    },
    [clearDragLeaveTimer, setCatState],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      clearDragLeaveTimer();
      setCatState("drag-over", "松手吧，我接住了。");
    },
    [clearDragLeaveTimer, setCatState],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      scheduleDragLeaveReset();
    },
    [scheduleDragLeaveReset],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      clearDragLeaveTimer();
      await processFile(event.dataTransfer.files?.[0]);
    },
    [clearDragLeaveTimer, processFile],
  );

  return { handleDragEnter, handleDragOver, handleDragLeave, handleDrop };
}
