import type { PaperSummary } from "./paper";

declare global {
  interface Window {
    paperCat?: {
      getPathForFile: (file: File) => string;
      setCurrentSummary: (summary: PaperSummary) => Promise<boolean>;
      getCurrentSummary: () => Promise<PaperSummary | null>;
      onSummaryUpdated: (callback: (summary: PaperSummary | null) => void) => () => void;
      openSummary: () => Promise<void>;
      openHistory: () => Promise<void>;
      openSettings: () => Promise<void>;
      quit: () => Promise<void>;
      getPetPosition: () => Promise<[number, number]>;
      setPetPosition: (x: number, y: number) => Promise<boolean>;
      showContextMenu: () => Promise<void>;
      selectDirectory: () => Promise<string | null>;
    };
  }
}

export {};
