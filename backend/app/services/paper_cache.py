import json
import shutil
from pathlib import Path

from app.config import settings


def cache_pdf(*, paper_id: str, file_path: str, metadata: dict) -> dict:
    source = Path(file_path).expanduser().resolve()
    cache_dir = settings.paper_cache_dir / paper_id
    cache_dir.mkdir(parents=True, exist_ok=True)

    cached_pdf_path = cache_dir / source.name
    shutil.copy2(source, cached_pdf_path)

    metadata_path = cache_dir / "metadata.json"
    metadata_path.write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return {
        "cache_dir": str(cache_dir),
        "cached_pdf_path": str(cached_pdf_path),
        "metadata_path": str(metadata_path),
    }


def cache_summary(*, cache_dir: str, summary_markdown: str) -> str:
    summary_path = Path(cache_dir) / "summary.md"
    summary_path.write_text(summary_markdown, encoding="utf-8")
    return str(summary_path)
