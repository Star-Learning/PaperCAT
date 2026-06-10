import { useCallback, useEffect, useRef, useState } from "react";
import { paperApi } from "./api/paperApi";
import { CatPet } from "./components/CatPet";
import { HistoryPanel } from "./components/HistoryPanel";
import { PaperChatWindow } from "./components/PaperChatWindow";
import { SettingsPanel } from "./components/SettingsPanel";
import { SummaryWindow } from "./components/SummaryWindow";
import { useCatState } from "./hooks/useCatState";
import { usePaperDrop } from "./hooks/usePaperDrop";
import type { PaperSummary } from "./types/paper";

function routeMode() {
  const hash = window.location.hash || "#/pet";
  if (hash.includes("summary")) return "summary";
  if (hash.includes("history")) return "history";
  if (hash.includes("chat")) return "chat";
  if (hash.includes("settings")) return "settings";
  return "pet";
}

function PetApp() {
  const { state, message, setCatState } = useCatState();
  const [latestSummary, setLatestSummary] = useState<PaperSummary | null>(null);
  const latestSummaryRef = useRef<PaperSummary | null>(null);
  const handleLatestSummary = useCallback((summary: PaperSummary) => {
    latestSummaryRef.current = summary;
    setLatestSummary(summary);
  }, []);
  const dropHandlers = usePaperDrop({
    setCatState,
    onSummary: handleLatestSummary,
  });

  useEffect(() => {
    return window.paperCat?.onPetMood((nextState, nextMessage) => {
      setCatState(nextState, nextMessage);
      if (nextState === "success") {
        window.setTimeout(() => setCatState("idle"), 2400);
      }
    });
  }, [setCatState]);

  const openLatestInHistory = async () => {
    const currentLatest = latestSummaryRef.current ?? latestSummary;
    if (currentLatest) {
      await window.paperCat?.setCurrentSummary(currentLatest);
      await window.paperCat?.openHistory(currentLatest.id);
      setCatState("idle");
      return;
    }

    try {
      const result = await paperApi.list();
      const latest = result.papers[0];
      if (latest) {
        latestSummaryRef.current = latest;
        setLatestSummary(latest);
        await window.paperCat?.setCurrentSummary(latest);
        await window.paperCat?.openHistory(latest.id);
        setCatState("idle");
      } else {
        setCatState("idle", "还没有总结，先喂我一篇 PDF。");
      }
    } catch {
      setCatState("error", "后端还没连上。");
    }
  };

  return (
    <CatPet
      state={state}
      message={message}
      onOpenLatest={openLatestInHistory}
      onOpenHistory={() => window.paperCat?.openHistory(latestSummary?.id)}
      onOpenSettings={() => window.paperCat?.openSettings()}
      onContextMenu={() => window.paperCat?.showContextMenu()}
      canOpenLatest={Boolean(latestSummary)}
      dropHandlers={dropHandlers}
    />
  );
}

export function App() {
  const mode = routeMode();
  if (mode === "summary") return <SummaryWindow />;
  if (mode === "history") return <HistoryPanel />;
  if (mode === "chat") return <PaperChatWindow />;
  if (mode === "settings") return <SettingsPanel />;
  return <PetApp />;
}
