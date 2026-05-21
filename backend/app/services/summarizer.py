import json
import re
from pathlib import Path
from uuid import uuid4

from app.config import settings
from app.prompts.literature_summary_prompt import SYSTEM_PROMPT, USER_PROMPT_TEMPLATE
from app.services.llm_client import summarize_with_llm
from app.services.paper_cache import cache_pdf, cache_summary
from app.services.paper_cleaner import clean_paper_text
from app.services.pdf_parser import extract_pdf_text


def _clean_metadata(metadata: dict) -> dict:
    return {str(key): value for key, value in metadata.items() if value not in (None, "")}


def _title_from_metadata_or_file(metadata: dict, file_path: str) -> str:
    title = str(metadata.get("title") or "").strip()
    if title:
        return title[:180]
    return Path(file_path).name


def _extract_short_comment(markdown: str) -> str:
    marker = "## 猫咪短评"
    if marker in markdown:
        tail = markdown.split(marker, 1)[1].strip()
        first_line = next((line.strip("- ").strip() for line in tail.splitlines() if line.strip()), "")
        if first_line:
            return first_line[:160]
    first_sentence = re.split(r"[。！？\n]", markdown.strip(), maxsplit=1)[0].strip()
    return first_sentence[:120] if first_sentence else "总结成功"


def _mock_summary(*, title: str, authors: str | None, page_count: int, file_size: int, path: Path, cache: dict) -> str:
    return "\n".join(
        [
            "# 总结成功",
            "",
            "PaperCat 已成功收到这篇 PDF，并已把论文信息与缓存文件保存到本地。",
            "",
            "## 论文信息",
            f"- 标题：{title}",
            f"- 作者：{authors or '未识别'}",
            f"- 页数：{page_count}",
            f"- 文件名：{path.name}",
            f"- 文件大小：{file_size} bytes",
            "",
            "## 本地缓存",
            f"- 原始路径：{path}",
            f"- 缓存目录：{cache['cache_dir']}",
            f"- 缓存 PDF：{cache['cached_pdf_path']}",
            "",
            "## 当前阶段",
            "- 大模型总结服务未启用，已返回 mock 总结。",
        ]
    )


async def summarize_paper(file_path: str) -> dict:
    parsed = extract_pdf_text(file_path)
    path = Path(file_path).expanduser().resolve()
    paper_id = str(uuid4())
    metadata = _clean_metadata(parsed.get("metadata", {}))
    cache = cache_pdf(paper_id=paper_id, file_path=str(path), metadata=metadata)

    title = _title_from_metadata_or_file(metadata, str(path))
    authors = str(metadata.get("author") or "").strip() or None
    page_count = int(parsed.get("page_count") or 0)
    file_size = path.stat().st_size
    cleaned_text = clean_paper_text(parsed.get("text", ""))

    if settings.llm_api_key and len(cleaned_text) >= 200:
        limited_text = cleaned_text[: settings.max_paper_chars]
        user_prompt = USER_PROMPT_TEMPLATE.format(paper_text=limited_text)
        summary_markdown = await summarize_with_llm(SYSTEM_PROMPT, user_prompt)
    elif settings.llm_api_key:
        summary_markdown = _mock_summary(
            title=title,
            authors=authors,
            page_count=page_count,
            file_size=file_size,
            path=path,
            cache=cache,
        )
        summary_markdown += "\n\n> PDF 可提取文本太少，可能是扫描版；当前先保存信息与缓存。"
    else:
        summary_markdown = _mock_summary(
            title=title,
            authors=authors,
            page_count=page_count,
            file_size=file_size,
            path=path,
            cache=cache,
        )

    cache_summary(cache_dir=cache["cache_dir"], summary_markdown=summary_markdown)

    return {
        "paper_id": paper_id,
        "title": title,
        "authors": authors,
        "year": None,
        "file_name": path.name,
        "file_size": file_size,
        "page_count": page_count,
        "file_path": str(path),
        "cached_pdf_path": cache["cached_pdf_path"],
        "cache_dir": cache["cache_dir"],
        "metadata_json": json.dumps(metadata, ensure_ascii=False),
        "summary_markdown": summary_markdown,
        "short_comment": _extract_short_comment(summary_markdown),
    }

