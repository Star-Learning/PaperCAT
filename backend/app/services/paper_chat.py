from collections.abc import AsyncIterator
from pathlib import Path

from app.config import settings
from app.schemas import ChatMessage
from app.services.llm_client import complete_chat, stream_chat
from app.services.paper_cleaner import clean_paper_text
from app.services.pdf_parser import extract_pdf_text


MAX_CHAT_PAPER_CHARS = 30000
MAX_CHAT_HISTORY_MESSAGES = 8


def _paper_source_path(paper: dict) -> str | None:
    cached_path = paper.get("cached_pdf_path")
    if cached_path and Path(cached_path).exists():
        return str(cached_path)
    file_path = paper.get("file_path")
    if file_path and Path(file_path).exists():
        return str(file_path)
    return None


def _paper_text_for_chat(paper: dict) -> str:
    source_path = _paper_source_path(paper)
    if not source_path:
        return ""
    try:
        parsed = extract_pdf_text(source_path)
    except Exception:
        return ""
    return clean_paper_text(parsed.get("text", ""))[:MAX_CHAT_PAPER_CHARS]


def _metadata_block(paper: dict) -> str:
    return "\n".join(
        [
            f"Title: {paper.get('title') or paper.get('file_name') or 'Untitled'}",
            f"Authors: {paper.get('authors') or 'Unknown'}",
            f"Year: {paper.get('year') or 'Unknown'}",
            f"File name: {paper.get('file_name') or 'Unknown'}",
            f"Pages: {paper.get('page_count') or 'Unknown'}",
        ]
    )


def build_paper_chat_messages(
    *,
    paper: dict,
    question: str,
    history: list[ChatMessage],
) -> list[dict[str, str]]:
    paper_text = _paper_text_for_chat(paper)
    summary = paper.get("summary_markdown") or ""
    context_parts = [
        "Paper metadata:",
        _metadata_block(paper),
        "",
        "PaperCat summary markdown:",
        summary[: settings.max_paper_chars],
        "",
        "PDF text extracted from the paper:",
        paper_text if paper_text else "No extractable PDF text is available.",
    ]

    system_prompt = "\n".join(
        [
            "You are PaperCat, a precise research assistant in a per-paper chat window.",
            "The model context includes both PaperCat's summary markdown and text extracted from the paper PDF.",
            "Answer only about the paper context provided below unless the user explicitly asks for general background.",
            "Be honest when the context is insufficient. Cite sections, concepts, or evidence from the provided context when possible.",
            "Use the user's language by default. Keep answers structured and useful for academic reading.",
            "",
            "\n".join(context_parts),
        ]
    )

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for item in history[-MAX_CHAT_HISTORY_MESSAGES:]:
        messages.append({"role": item.role, "content": item.content})
    messages.append({"role": "user", "content": question.strip()})
    return messages


async def chat_with_paper(
    *,
    paper: dict,
    question: str,
    history: list[ChatMessage],
) -> str:
    messages = build_paper_chat_messages(paper=paper, question=question, history=history)
    return await complete_chat(messages, temperature=0.25, max_tokens=1800)


async def stream_chat_with_paper(
    *,
    paper: dict,
    question: str,
    history: list[ChatMessage],
) -> AsyncIterator[str]:
    messages = build_paper_chat_messages(paper=paper, question=question, history=history)
    async for chunk in stream_chat(messages, temperature=0.25, max_tokens=1800):
        yield chunk
