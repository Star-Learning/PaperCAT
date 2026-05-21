from fastapi import APIRouter, HTTPException

from app.config import mask_secret, save_llm_settings, save_storage_settings, settings
from app.schemas import (
    LlmSettingsOut,
    LlmSettingsUpdate,
    StorageSettingsOut,
    StorageSettingsUpdate,
)


router = APIRouter()


@router.get("/llm", response_model=LlmSettingsOut)
def get_llm_settings() -> LlmSettingsOut:
    return LlmSettingsOut(
        has_api_key=bool(settings.llm_api_key),
        api_key_masked=mask_secret(settings.llm_api_key),
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        timeout_seconds=settings.llm_timeout_seconds,
    )


@router.put("/llm", response_model=LlmSettingsOut)
def update_llm_settings(payload: LlmSettingsUpdate) -> LlmSettingsOut:
    if not payload.base_url.strip():
        raise HTTPException(status_code=400, detail="Base URL 不能为空。")
    if not payload.model.strip():
        raise HTTPException(status_code=400, detail="模型名称不能为空。")
    if payload.timeout_seconds <= 0:
        raise HTTPException(status_code=400, detail="超时时间必须大于 0。")

    save_llm_settings(
        api_key=payload.api_key,
        base_url=payload.base_url,
        model=payload.model,
        timeout_seconds=payload.timeout_seconds,
    )
    return get_llm_settings()


@router.get("/storage", response_model=StorageSettingsOut)
def get_storage_settings() -> StorageSettingsOut:
    return StorageSettingsOut(
        database_path=str(settings.database_path),
        paper_cache_dir=str(settings.paper_cache_dir),
    )


@router.put("/storage", response_model=StorageSettingsOut)
def update_storage_settings(payload: StorageSettingsUpdate) -> StorageSettingsOut:
    try:
        save_storage_settings(paper_cache_dir=payload.paper_cache_dir)
    except OSError as exc:
        raise HTTPException(status_code=400, detail=f"保存路径不可写：{exc}") from exc
    return get_storage_settings()
