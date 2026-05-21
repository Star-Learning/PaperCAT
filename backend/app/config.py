from os import getenv
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(getenv("PAPERCAT_DATA_DIR", "")).resolve() if getenv("PAPERCAT_DATA_DIR") else Path(__file__).resolve().parents[1]
LLM_SECRET_PATH = BASE_DIR / "secrets" / "llm.env"
STORAGE_SECRET_PATH = BASE_DIR / "secrets" / "storage.env"
load_dotenv(BASE_DIR / ".env")
load_dotenv(STORAGE_SECRET_PATH, override=True)
load_dotenv(LLM_SECRET_PATH, override=True)


class Settings:
    llm_api_key: str = getenv("LLM_API_KEY", "")
    llm_base_url: str = getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    llm_model: str = getenv("LLM_MODEL", "gpt-4.1-mini")
    llm_timeout_seconds: float = float(getenv("LLM_TIMEOUT_SECONDS", "60"))
    database_path: Path = (BASE_DIR / getenv("DATABASE_PATH", "./data/papers.db")).resolve()
    paper_cache_dir: Path = (BASE_DIR / getenv("PAPER_CACHE_DIR", "./outputs/cache")).resolve()
    max_paper_chars: int = int(getenv("MAX_PAPER_CHARS", "60000"))


settings = Settings()


def mask_secret(value: str) -> str:
    if not value:
        return ""
    if len(value) <= 8:
        return "***"
    return f"{value[:5]}...{value[-4:]}"


def save_llm_settings(
    *,
    api_key: str | None,
    base_url: str,
    model: str,
    timeout_seconds: float,
) -> None:
    if api_key is not None and api_key.strip():
        settings.llm_api_key = api_key.strip()
    settings.llm_base_url = base_url.strip().rstrip("/")
    settings.llm_model = model.strip()
    settings.llm_timeout_seconds = timeout_seconds

    LLM_SECRET_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"LLM_API_KEY={settings.llm_api_key}",
        f"LLM_BASE_URL={settings.llm_base_url}",
        f"LLM_MODEL={settings.llm_model}",
        f"LLM_TIMEOUT_SECONDS={settings.llm_timeout_seconds:g}",
        "",
    ]
    LLM_SECRET_PATH.write_text("\n".join(lines), encoding="utf-8")


def save_storage_settings(*, paper_cache_dir: str) -> None:
    next_cache_dir = Path(paper_cache_dir).expanduser().resolve()
    next_cache_dir.mkdir(parents=True, exist_ok=True)
    probe_path = next_cache_dir / ".papercat-write-test"
    probe_path.write_text("ok", encoding="utf-8")
    probe_path.unlink(missing_ok=True)

    settings.paper_cache_dir = next_cache_dir

    STORAGE_SECRET_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"PAPER_CACHE_DIR={settings.paper_cache_dir}",
        "",
    ]
    STORAGE_SECRET_PATH.write_text("\n".join(lines), encoding="utf-8")
