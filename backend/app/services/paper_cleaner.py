import re


REFERENCE_HEADING_RE = re.compile(
    r"(?im)^\s*(references|bibliography|参考文献|参考资料)\s*$"
)


def clean_paper_text(raw_text: str) -> str:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"(?m)^\s*\d+\s*$", "", text)
    text = re.sub(r"(?m)^\s*page\s+\d+\s*(of\s+\d+)?\s*$", "", text, flags=re.I)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    ref_match = REFERENCE_HEADING_RE.search(text)
    if ref_match and ref_match.start() > len(text) * 0.45:
        text = text[: ref_match.start()].strip()

    return text.strip()

