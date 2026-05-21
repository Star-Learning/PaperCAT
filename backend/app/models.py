from dataclasses import dataclass


@dataclass
class PaperRecord:
    id: str
    title: str | None
    authors: str | None
    year: str | None
    file_path: str
    summary_markdown: str
    short_comment: str | None
    tags: str | None
    created_at: str
    updated_at: str

