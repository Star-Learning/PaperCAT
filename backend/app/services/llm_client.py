import json
from collections.abc import AsyncIterator

import httpx

from app.config import settings


class LlmError(RuntimeError):
    pass


def _chat_payload(
    messages: list[dict[str, str]],
    *,
    temperature: float,
    max_tokens: int,
    stream: bool = False,
) -> dict:
    return {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": stream,
    }


def _chat_headers() -> dict[str, str]:
    if not settings.llm_api_key:
        raise LlmError("还没有配置 LLM API Key。")
    return {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }


async def complete_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> str:
    url = f"{settings.llm_base_url}/chat/completions"
    payload = _chat_payload(messages, temperature=temperature, max_tokens=max_tokens)

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            response = await client.post(url, json=payload, headers=_chat_headers())
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500]
        raise LlmError(f"模型接口返回错误：{exc.response.status_code} {body}") from exc
    except LlmError:
        raise
    except Exception as exc:
        raise LlmError("模型接口暂时没有响应，请检查网络、Base URL 或 API key。") from exc

    try:
        return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:
        raise LlmError("模型返回格式异常，PaperCat 没能读懂。") from exc


async def stream_chat(
    messages: list[dict[str, str]],
    *,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> AsyncIterator[str]:
    url = f"{settings.llm_base_url}/chat/completions"
    payload = _chat_payload(messages, temperature=temperature, max_tokens=max_tokens, stream=True)

    try:
        async with httpx.AsyncClient(timeout=settings.llm_timeout_seconds) as client:
            async with client.stream("POST", url, json=payload, headers=_chat_headers()) as response:
                if response.status_code >= 400:
                    body = (await response.aread()).decode("utf-8", errors="replace")[:500]
                    raise LlmError(f"模型接口返回错误：{response.status_code} {body}")

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    raw = line.removeprefix("data:").strip()
                    if not raw or raw == "[DONE]":
                        if raw == "[DONE]":
                            break
                        continue
                    try:
                        data = json.loads(raw)
                        delta = data["choices"][0].get("delta", {})
                        content = delta.get("content") or ""
                    except Exception as exc:
                        raise LlmError("模型流式返回格式异常，PaperCat 没能读懂。") from exc
                    if content:
                        yield content
    except LlmError:
        raise
    except Exception as exc:
        raise LlmError("模型接口暂时没有响应，请检查网络、Base URL 或 API key。") from exc


async def summarize_with_llm(system_prompt: str, user_prompt: str) -> str:
    return await complete_chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
        max_tokens=4096,
    )
