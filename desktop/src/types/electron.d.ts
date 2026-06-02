import type { CatState, PaperSummary } from "./paper";

declare global {
  interface Window {
    paperCat?: {
      getPathForFile: (file: File) => string;
      setCurrentSummary: (summary: PaperSummary) => Promise<boolean>;
      publishSummary: (summary: PaperSummary) => Promise<boolean>;
      getCurrentSummary: () => Promise<PaperSummary | null>;
      onSummaryUpdated: (callback: (summary: PaperSummary | null) => void) => () => void;
      onSummaryCreated: (callback: (summary: PaperSummary) => void) => () => void;
      openSummary: () => Promise<void>;
      openPaperChat: (paperId: string) => Promise<void>;
      openHistory: (paperId?: string) => Promise<void>;
      onHistorySelect: (callback: (paperId: string) => void) => () => void;
      openSettings: (mode?: "setup") => Promise<void>;
      quit: () => Promise<void>;
      getPetPosition: () => Promise<[number, number]>;
      setPetPosition: (x: number, y: number) => Promise<boolean>;
      setPetMood: (state: CatState, message?: string) => Promise<boolean>;
      onPetMood: (callback: (state: CatState, message?: string) => void) => () => void;
      showContextMenu: () => Promise<void>;
      selectDirectory: () => Promise<string | null>;
    };
  }
}

export {};
