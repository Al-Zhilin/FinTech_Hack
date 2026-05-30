import logging
import os
import time

import httpx
from duckduckgo_search import DDGS

logger = logging.getLogger(__name__)

_RETRY_DELAYS = [2, 4]  # секунды между попытками ddgs


def _ddgs_search(query: str, max_results: int) -> tuple[list[str], list[str]]:
    snippets: list[str] = []
    urls: list[str] = []

    for attempt in range(len(_RETRY_DELAYS) + 1):
        try:
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))

            for r in results:
                body = r.get("body", "")
                href = r.get("href", "")
                if body:
                    snippets.append(body)
                if href:
                    urls.append(href)

            logger.info(f"[search] ddgs '{query}' → {len(snippets)} results")
            return snippets, urls

        except Exception as e:
            if attempt < len(_RETRY_DELAYS):
                delay = _RETRY_DELAYS[attempt]
                logger.warning(f"[search] ddgs attempt {attempt + 1} failed ({e}), retry in {delay}s")
                time.sleep(delay)
            else:
                logger.error(f"[search] ddgs all attempts failed: {e}")

    return snippets, urls


def _serper_search(query: str, max_results: int) -> tuple[list[str], list[str]]:
    api_key = os.getenv("SERPER_API_KEY", "").strip()
    if not api_key:
        return [], []

    snippets: list[str] = []
    urls: list[str] = []

    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
                json={"q": query, "gl": "ru", "hl": "ru", "num": max_results},
            )
            r.raise_for_status()
            data = r.json()

        for item in data.get("organic", []):
            snippet = item.get("snippet", "")
            url = item.get("link", "")
            if snippet:
                snippets.append(snippet)
            if url:
                urls.append(url)

        logger.info(f"[search] serper '{query}' → {len(snippets)} results")
    except Exception as e:
        logger.error(f"[search] serper failed: {e}")

    return snippets, urls


def _tavily_search(query: str, max_results: int) -> tuple[list[str], list[str]]:
    api_key = os.getenv("TAVILY_API_KEY", "").strip()
    if not api_key:
        logger.info("[search] tavily skipped (no key)")
        return [], []

    snippets: list[str] = []
    urls: list[str] = []

    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.post(
                "https://api.tavily.com/search",
                json={"api_key": api_key, "query": query, "max_results": max_results, "include_raw_content": True},
            )
            r.raise_for_status()
            data = r.json()

        for item in data.get("results", []):
            content = item.get("raw_content") or item.get("content") or item.get("title", "")
            url = item.get("url", "")
            if content:
                snippets.append(content)
            if url:
                urls.append(url)

        logger.info(f"[search] tavily fallback → {len(snippets)} results")
    except Exception as e:
        logger.error(f"[search] tavily failed: {e}")

    return snippets, urls


def web_search(query: str, max_results: int = 5) -> tuple[list[str], list[str]]:
    """Returns (snippets, urls). Never raises — returns empty lists on total failure."""
    snippets, urls = _serper_search(query, max_results)

    if not snippets:
        snippets, urls = _tavily_search(query, max_results)

    if not snippets:
        snippets, urls = _ddgs_search(query, max_results)

    return snippets, urls


def tavily_search(query: str, max_results: int = 5) -> tuple[list[str], list[str]]:
    """Tavily-only search. Returns (snippets, urls)."""
    return _tavily_search(query, max_results)
