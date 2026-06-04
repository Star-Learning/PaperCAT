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
    reading_status: str = "unread",
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
                    summary_markdown, short_comment, tags, reading_status, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    reading_status,
                    now,
                    now,
                ),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
        return _row_to_dict(row)
    except SQLiteError as exc:
        raise RuntimeError("小猫保存历史时卡住了，请稍后再试。") from exc


def list_papers() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM papers ORDER BY created_at DESC").fetchall()
    return [_row_to_dict(row) for row in rows]


def update_paper_meta(
    paper_id: str,
    *,
    tags: str | None,
    reading_status: str,
) -> dict | None:
    if reading_status not in {"unread", "reading", "read", "favorite"}:
        raise ValueError("Unknown reading status")
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            UPDATE papers
            SET tags = ?, reading_status = ?, updated_at = ?
            WHERE id = ?
            """,
            (tags, reading_status, now, paper_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
    return _row_to_dict(row) if row else None


def get_paper(paper_id: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute("SELECT * FROM papers WHERE id = ?", (paper_id,)).fetchone()
    return _row_to_dict(row) if row else None


def get_paper_by_file_path(file_path: str) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            """
            SELECT * FROM papers
            WHERE file_path = ? OR cached_pdf_path = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (file_path, file_path),
        ).fetchone()
    return _row_to_dict(row) if row else None


def delete_paper(paper_id: str) -> bool:
    with get_connection() as conn:
        conn.execute("DELETE FROM paper_chat_messages WHERE paper_id = ?", (paper_id,))
        cursor = conn.execute("DELETE FROM papers WHERE id = ?", (paper_id,))
        conn.commit()
    return cursor.rowcount > 0


def list_chat_messages(paper_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, paper_id, role, content, created_at
            FROM paper_chat_messages
            WHERE paper_id = ?
            ORDER BY created_at ASC
            """,
            (paper_id,),
        ).fetchall()
    return [_row_to_dict(row) for row in rows]


def save_chat_message(*, paper_id: str, role: str, content: str) -> dict:
    if role not in {"user", "assistant"}:
        raise ValueError("Unknown chat role")
    message_id = str(uuid4())
    now = _now()
    with get_connection() as conn:
        conn.execute(
            """
            INSERT INTO paper_chat_messages (id, paper_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (message_id, paper_id, role, content, now),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM paper_chat_messages WHERE id = ?", (message_id,)).fetchone()
    return _row_to_dict(row)


def save_chat_exchange(*, paper_id: str, question: str, answer: str) -> None:
    now = _now()
    with get_connection() as conn:
        conn.executemany(
            """
            INSERT INTO paper_chat_messages (id, paper_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            [
                (str(uuid4()), paper_id, "user", question, now),
                (str(uuid4()), paper_id, "assistant", answer, _now()),
            ],
        )
        conn.commit()


def clear_chat_messages(paper_id: str) -> int:
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM paper_chat_messages WHERE paper_id = ?", (paper_id,))
        conn.commit()
    return cursor.rowcount
