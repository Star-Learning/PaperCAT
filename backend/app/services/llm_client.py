import httpx

from app.config import settings


class LlmError(RuntimeError):
    pass


async def summarize_with_llm(system_prompt: str, user_prompt: str) -> str:
    if not settings.llm_api_key:
        raise LlmError("还没有配置 LLM_API_KEY。")

    url = f"{settings.llm_base_url}/chat/completions"
    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 4096,
    }
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500]
        raise LlmError(f"模型接口返回错误：{exc.response.status_code} {body}") from exc
    except Exception as exc:
        raise LlmError("模型接口暂时没有回应，请检查网络、base URL 或 API key。") from exc

    try:
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        raise LlmError("模型返回格式异常，PaperCat 没能读懂。") from exc

