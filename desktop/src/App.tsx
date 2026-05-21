import { useState } from "react";
import { paperApi } from "./api/paperApi";
import { CatPet } from "./components/CatPet";
import { HistoryPanel } from "./components/HistoryPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SummaryWindow } from "./components/SummaryWindow";
import { useCatState } from "./hooks/useCatState";
import { usePaperDrop } from "./hooks/usePaperDrop";
import type { PaperSummary } from "./types/paper";

function routeMode() {
  const hash = window.location.hash || "#/pet";
  if (hash.includes("summary")) return "summary";
  if (hash.includes("history")) return "history";
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
  if (mode === "settings") return <SettingsPanel />;
  return <PetApp />;
}
