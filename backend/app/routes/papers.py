import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.schemas import PaperChatRequest, PaperChatResponse, PaperListResponse, PaperOut, SummarizeRequest
from app.services.paper_chat import chat_with_paper, stream_chat_with_paper
from app.services.storage import delete_paper, get_paper, get_paper_by_file_path, list_papers, save_paper
from app.services.summarizer import summarize_paper


router = APIRouter()


def _sse(event: str, data: dict | str) -> str:
    payload = data if isinstance(data, str) else json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {payload}\n\n"


def _lookup_path_candidates(file_path: str) -> list[str]:
    candidates = [file_path]
    try:
        candidates.append(str(Path(file_path).expanduser().resolve()))
    except OSError:
        pass
    return list(dict.fromkeys(candidates))


@router.post("/summarize", response_model=PaperOut)
async def summarize(request: SummarizeRequest) -> PaperOut:
    try:
        result = await summarize_paper(request.file_path)
        record = save_paper(
            paper_id=result["paper_id"],
            file_path=result["file_path"],
            title=result["title"],
            authors=result["authors"],
            year=result["year"],
            file_name=result["file_name"],
            file_size=result["file_size"],
            page_count=result["page_count"],
            cached_pdf_path=result["cached_pdf_path"],
            cache_dir=result["cache_dir"],
            metadata_json=result["metadata_json"],
            summary_markdown=result["summary_markdown"],
            short_comment=result["short_comment"],
        )
        return PaperOut(**record)
    except Exception as exc:
        detail = str(exc) or "小猫处理论文时卡住了，请稍后再试。"
        raise HTTPException(status_code=400, detail=detail) from exc


@router.get("", response_model=PaperListResponse)
def index() -> PaperListResponse:
    return PaperListResponse(papers=[PaperOut(**row) for row in list_papers()])


@router.get("/lookup", response_model=PaperOut | None)
def lookup(file_path: str = Query(..., min_length=1)) -> PaperOut | None:
    for candidate in _lookup_path_candidates(file_path):
        record = get_paper_by_file_path(candidate)
        if record:
            return PaperOut(**record)
    return None


@router.get("/{paper_id}", response_model=PaperOut)
def show(paper_id: str) -> PaperOut:
    record = get_paper(paper_id)
    if not record:
        raise HTTPException(status_code=404, detail="这条历史记录不存在。")
    return PaperOut(**record)


@router.post("/{paper_id}/chat", response_model=PaperChatResponse)
async def chat(paper_id: str, request: PaperChatRequest) -> PaperChatResponse:
    record = get_paper(paper_id)
    if not record:
        raise HTTPException(status_code=404, detail="这条历史记录不存在。")
    try:
        answer = await chat_with_paper(
            paper=record,
            question=request.question,
            history=request.history,
        )
    except Exception as exc:
        detail = str(exc) or "这次对话没有成功，请稍后再试。"
        raise HTTPException(status_code=400, detail=detail) from exc
    return PaperChatResponse(answer=answer)


@router.post("/{paper_id}/chat/stream")
async def chat_stream(paper_id: str, request: PaperChatRequest) -> StreamingResponse:
    record = get_paper(paper_id)
    if not record:
        raise HTTPException(status_code=404, detail="这条历史记录不存在。")

    async def events():
        try:
            async for chunk in stream_chat_with_paper(
                paper=record,
                question=request.question,
                history=request.history,
            ):
                yield _sse("delta", {"text": chunk})
            yield _sse("done", {"ok": True})
        except Exception as exc:
            yield _sse("error", {"message": str(exc) or "这次对话没有成功，请稍后再试。"})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/{paper_id}")
def destroy(paper_id: str) -> dict[str, bool]:
    deleted = delete_paper(paper_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="这条历史记录已经不存在了。")
    return {"ok": True}
