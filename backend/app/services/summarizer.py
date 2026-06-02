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
    marker = "## 猫猫短评"
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
            "# PaperCAT 论文精读",
            "",
            "## 摘要",
            "",
            "一句话概括：",
            "> **PaperCAT 已保存这篇 PDF 的本地信息，但当前未启用大模型总结。**",
            "",
            "- **问题：** 需要配置大模型 API 后才能生成完整论文精读。",
            "- **方法：** 当前仅完成 PDF 元数据读取、本地缓存和历史记录保存。",
            "- **创新：** 暂无模型生成内容。",
            "- **结果：** PDF 已进入本地缓存，可稍后重新解读。",
            "- **意义：** 配置 API 后，PaperCAT 会按论文精读 skill 输出结构化总结。",
            "",
            "## 背景",
            "",
            "当前没有可用的大模型配置，因此 PaperCAT 无法基于论文正文生成完整解读。",
            "",
            "## 方法",
            "",
            "### 1. 核心思路",
            "",
            "PaperCAT 已读取 PDF、缓存文件，并准备将可提取文本交给大模型。",
            "",
            "### 2. 关键模块",
            "",
            "- PDF 文本提取",
            "- 本地缓存",
            "- 历史记录保存",
            "",
            "## 实验",
            "",
            f"- **任务/数据：** {title}",
            "- **评价指标：** 当前未生成实验解读。",
            "- **核心结果：** 需要配置大模型 API 后生成。",
            "- **需要注意：** 如果 PDF 是扫描版，可能需要 OCR 才能获得正文。",
            "",
            "## 结论",
            "",
            "用一句话总结：",
            "> **这是一条本地保存记录，不是完整模型总结。**",
            "",
            "核心贡献：",
            f"- 文件名：{path.name}",
            f"- 作者：{authors or '论文中未明确说明'}",
            f"- 页数：{page_count}",
            "",
            "### 后续可追问",
            "",
            "- 这篇论文的核心贡献是什么？",
            "- 方法部分有哪些关键模块？",
            "- 实验结果是否支持论文结论？",
            "",
            "## 猫猫短评",
            "",
            f"PaperCAT 已缓存这篇论文，文件大小 {file_size} bytes，缓存目录为 {cache['cache_dir']}。",
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
