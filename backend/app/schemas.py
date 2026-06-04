from pydantic import BaseModel, Field
from typing import Literal


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "paper-cat-backend"


class SummarizeRequest(BaseModel):
    file_path: str = Field(..., min_length=1)


class PaperOut(BaseModel):
    id: str
    title: str | None = None
    authors: str | None = None
    year: str | None = None
    file_name: str | None = None
    file_size: int | None = None
    page_count: int | None = None
    file_path: str
    cached_pdf_path: str | None = None
    cache_dir: str | None = None
    metadata_json: str | None = None
    summary_markdown: str
    short_comment: str | None = None
    tags: str | None = None
    reading_status: Literal["unread", "reading", "read", "favorite"] = "unread"
    created_at: str
    updated_at: str


class PaperListResponse(BaseModel):
    papers: list[PaperOut]


class PaperUpdate(BaseModel):
    tags: str | None = None
    reading_status: Literal["unread", "reading", "read", "favorite"] = "unread"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class StoredChatMessage(ChatMessage):
    id: str
    paper_id: str
    created_at: str


class PaperChatHistoryResponse(BaseModel):
    messages: list[StoredChatMessage]


class PaperChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    history: list[ChatMessage] = Field(default_factory=list)


class PaperChatResponse(BaseModel):
    answer: str


class LlmSettingsOut(BaseModel):
    has_api_key: bool
    api_key_masked: str
    base_url: str
    model: str
    timeout_seconds: float


class LlmSettingsUpdate(BaseModel):
    api_key: str | None = None
    base_url: str
    model: str
    timeout_seconds: float = 120


class StorageSettingsOut(BaseModel):
    database_path: str
    paper_cache_dir: str


class StorageSettingsUpdate(BaseModel):
    paper_cache_dir: str = Field(..., min_length=1)
