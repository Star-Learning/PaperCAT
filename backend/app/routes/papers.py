from fastapi import APIRouter, HTTPException

from app.schemas import PaperListResponse, PaperOut, SummarizeRequest
from app.services.storage import delete_paper, get_paper, list_papers, save_paper
from app.services.summarizer import summarize_paper


router = APIRouter()


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


@router.get("/{paper_id}", response_model=PaperOut)
def show(paper_id: str) -> PaperOut:
    record = get_paper(paper_id)
    if not record:
        raise HTTPException(status_code=404, detail="这条历史被小猫藏起来了。")
    return PaperOut(**record)


@router.delete("/{paper_id}")
def destroy(paper_id: str) -> dict[str, bool]:
    deleted = delete_paper(paper_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="这条历史已经不存在了。")
    return {"ok": True}
