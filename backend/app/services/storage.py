from datetime import datetime, timezone
from sqlite3 import Error as SQLiteError
from uuid import uuid4

from app.database import get_connection


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _row_to_dict(row) -> dict:
    return dict(row)


def save_paper(
    *,
    paper_id: str | None = None,
    file_path: str,
    summary_markdown: str,
    short_comment: str | None,
    title: str | None = None,
    authors: str | None = None,
    year: str | None = None,
    file_name: str | None = None,
    file_size: int | None = None,
    page_count: int | None = None,
    cached_pdf_path: str | None = None,
    cache_dir: str | None = None,
    metadata_json: str | None = None,
    tags: str | None = None,
) -> dict:
    paper_id = paper_id or str(uuid4())
    now = _now()
    try:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO papers (
                    id, title, authors, year, file_name, file_size, page_count,
                    file_path, cached_pdf_path, cache_dir, metadata_json,
                    summary_markdown, short_comment, tags, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    paper_id,
                    title,
                    authors,
                    year,
                    file_name,
                    file_size,
                    page_count,
                    file_path,
                    cached_pdf_path,
                    cache_dir,
                    metadata_json,
                    summary_markdown,
                    short_comment,
                    tags,
                    now,
                    now,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        return _row_to_dict(row)
    except SQLiteError as exc:
        raise RuntimeError("小猫保存历史时打了个盹，请稍后再试。") from exc


def list_papers() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM papers ORDER BY created_at DESC").fetchall()
    return [_row_to_dict(row) for row in rows]


def get_paper(paper_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
    return _row_to_dict(row) if row else None


def delete_paper(paper_id: str) -> bool:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM papers WHERE id = ?", (paper_id,))
        conn.commit()
    return cursor.rowcount > 0
