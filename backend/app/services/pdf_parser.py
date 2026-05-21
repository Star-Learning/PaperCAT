from pathlib import Path
from typing import Any

import fitz


class PdfParseError(ValueError):
    pass


def extract_pdf_text(file_path: str) -> dict[str, Any]:
    path = Path(file_path).expanduser()
    if not path.exists():
        raise PdfParseError("这份 PDF 好像不在原来的位置了。")
    if path.suffix.lower() != ".pdf":
        raise PdfParseError("小猫现在只吃 PDF。")

    try:
        doc = fitz.open(path)
    except Exception as exc:
        raise PdfParseError("PDF 打不开，可能文件损坏或被占用。") from exc

    try:
        pages: list[str] = []
        for page in doc:
            text = page.get_text("text", sort=True).strip()
            if len(text) < 30:
                blocks = page.get_text("blocks", sort=True)
                text = "\n".join(str(block[4]).strip() for block in blocks if len(block) > 4)
            if text:
                pages.append(text)

        return {
            "text": "\n\n".join(pages).strip(),
            "page_count": doc.page_count,
            "metadata": dict(doc.metadata or {}),
        }
    finally:
        doc.close()
