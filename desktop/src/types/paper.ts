export type CatState =
  | "idle"
  | "hover"
  | "drag-over"
  | "eating"
  | "chewing"
  | "thinking"
  | "success"
  | "error"
  | "sleeping";

export interface PaperSummary {
  id: string;
  title?: string | null;
  authors?: string | null;
  year?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  page_count?: number | null;
  file_path: string;
  cached_pdf_path?: string | null;
  cache_dir?: string | null;
  metadata_json?: string | null;
  summary_markdown: string;
  short_comment?: string | null;
  tags?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaperListResponse {
  papers: PaperSummary[];
}
