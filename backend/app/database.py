import sqlite3
from pathlib import Path

from app.config import settings


SCHEMA = """
CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    title TEXT,
    authors TEXT,
    year TEXT,
    file_name TEXT,
    file_size INTEGER,
    page_count INTEGER,
    file_path TEXT NOT NULL,
    cached_pdf_path TEXT,
    cache_dir TEXT,
    metadata_json TEXT,
    summary_markdown TEXT NOT NULL,
    short_comment TEXT,
    tags TEXT,
    reading_status TEXT NOT NULL DEFAULT 'unread',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
"""

CHAT_SCHEMA = """
CREATE TABLE IF NOT EXISTS paper_chat_messages (
    id TEXT PRIMARY KEY,
    paper_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE
);
"""

MIGRATIONS = {
    "file_name": "ALTER TABLE papers ADD COLUMN file_name TEXT",
    "file_size": "ALTER TABLE papers ADD COLUMN file_size INTEGER",
    "page_count": "ALTER TABLE papers ADD COLUMN page_count INTEGER",
    "cached_pdf_path": "ALTER TABLE papers ADD COLUMN cached_pdf_path TEXT",
    "cache_dir": "ALTER TABLE papers ADD COLUMN cache_dir TEXT",
    "metadata_json": "ALTER TABLE papers ADD COLUMN metadata_json TEXT",
    "reading_status": "ALTER TABLE papers ADD COLUMN reading_status TEXT NOT NULL DEFAULT 'unread'",
}


def get_connection() -> sqlite3.Connection:
    db_path: Path = settings.database_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(SCHEMA)
        conn.execute(CHAT_SCHEMA)
        existing = {row["name"] for row in conn.execute("PRAGMA table_info(papers)").fetchall()}
        for column, sql in MIGRATIONS.items():
            if column not in existing:
                conn.execute(sql)
        conn.commit()
