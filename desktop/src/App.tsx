import { useEffect, useState } from "react";
import { paperApi } from "./api/paperApi";
import { CatPet } from "./components/CatPet";
import { HistoryPanel } from "./components/HistoryPanel";
import { PaperChatWindow } from "./components/PaperChatWindow";
import { SettingsPanel } from "./components/SettingsPanel";
import { SummaryWindow } from "./components/SummaryWindow";
import { useCatState } from "./hooks/useCatState";
import { usePaperDrop } from "./hooks/usePaperDrop";
import type { PaperSummary } from "./types/paper";

const SETUP_PROMPT_KEY = "paperCat.setupPrompted.v2";

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
  const dropHandlers = usePaperDrop({
    setCatState,
    onSummary: setLatestSummary,
  });

  useEffect(() => {
    return window.paperCat?.onPetMood((nextState, nextMessage) => {
      setCatState(nextState, nextMessage);
      if (nextState === "success") {
        window.setTimeout(() => setCatState("idle"), 2400);
      }
    });
  }, [setCatState]);

  useEffect(() => {
    if (window.localStorage.getItem(SETUP_PROMPT_KEY) === "done") return;

    const timer = window.setTimeout(async () => {
      window.localStorage.setItem(SETUP_PROMPT_KEY, "done");
      setCatState("idle", "第一次见面，先配置保存路径和模型；也可以先跳过。");
      await window.paperCat?.openSettings("setup");
    }, 700);

    return () => window.clearTimeout(timer);
  }, [setCatState]);

  const openLatest = async () => {
    if (latestSummary) {
      await window.paperCat?.setCurrentSummary(latestSummary);
      await window.paperCat?.openSummary();
      setCatState("idle");
      return;
    }
    try {
      const result = await paperApi.list();
      const latest = result.papers[0];
      if (latest) {
        await window.paperCat?.setCurrentSummary(latest);
        await window.paperCat?.openSummary();
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
      onOpenLatest={openLatest}
      onOpenHistory={() => window.paperCat?.openHistory()}
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
