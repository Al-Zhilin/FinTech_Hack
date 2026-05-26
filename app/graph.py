import json
import logging
import os
import re
from typing import Any, TypedDict

import yaml
from langgraph.graph import END, StateGraph

from .connectors import web_search
from .llm import OllamaClient

logger = logging.getLogger(__name__)

# ── Demo fallback (fill before demo) ──────────────────────────────────────────
# Key = substring to match in query (case-insensitive).
# Value = dict with "text" and "structured" keys.
DEMO_RESPONSES: dict[str, dict] = {}

# ── State ──────────────────────────────────────────────────────────────────────
class AgentState(TypedDict):
    # Input
    user_id: str
    query: str
    context: dict[str, Any]
    mode: str
    # Planner output
    intent: str
    needs_search: bool
    search_query: str | None
    # Search output
    search_results: list[str]
    sources: list[str]
    # Analyst output
    answer_text: str
    structured: dict[str, Any]
    # Error propagation
    error: str | None


# ── Config ─────────────────────────────────────────────────────────────────────
def _load_prompts() -> dict:
    path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


PROMPTS = _load_prompts()
PLANNER_MODEL = os.getenv("PLANNER_MODEL", "qwen2.5:7b-instruct-q4_K_M")
ANALYST_MODEL = os.getenv("ANALYST_MODEL", "qwen2.5:7b-instruct-q4_K_M")


def _parse_json(raw: str) -> dict:
    """Strip markdown fences and control characters, then parse JSON."""
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    # Remove control chars except \t \n \r which are valid in JSON strings
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    return json.loads(cleaned)


def _client() -> OllamaClient:
    return OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))


# ── Nodes ──────────────────────────────────────────────────────────────────────
def node_planner(state: AgentState) -> AgentState:
    logger.info(f"[planner] start — query='{state['query'][:80]}'")
    cfg = PROMPTS["planner"]
    prompt = cfg["user_template"].format(query=state["query"])

    intent = "question"
    needs_search = False
    search_query = None

    try:
        raw = _client().generate(model=PLANNER_MODEL, prompt=prompt, system=cfg["system"])
        data = _parse_json(raw)
        intent = data.get("intent", "question")
        needs_search = bool(data.get("needs_search", False))
        search_query = data.get("search_query") or None
    except Exception as e:
        logger.warning(f"[planner] failed ({e}), defaulting intent=question needs_search=False")

    logger.info(f"[planner] done — intent={intent} needs_search={needs_search} search_query={search_query!r}")
    return {**state, "intent": intent, "needs_search": needs_search, "search_query": search_query}


def node_search(state: AgentState) -> AgentState:
    query = state.get("search_query") or state["query"]
    logger.info(f"[search] start — query='{query}'")
    snippets, urls = web_search(query)
    logger.info(f"[search] done — {len(snippets)} snippets, {len(urls)} urls")
    return {**state, "search_results": snippets, "sources": urls}


def _build_profile_block(profile: dict) -> str:
    if not profile:
        return ""
    labels = [
        ("financial_literacy", "Уровень финграмотности"),
        ("age", "Возраст"),
        ("occupation", "Профессия"),
        ("monthly_income", "Доход в месяц (руб)"),
        ("monthly_expenses", "Расходы в месяц (руб)"),
        ("savings", "Накопления (руб)"),
        ("risk_tolerance", "Риск-профиль"),
    ]
    parts = [f"- {label}: {profile[key]}" for key, label in labels if profile.get(key) is not None]
    if profile.get("goals"):
        parts.append(f"- Финансовые цели: {', '.join(profile['goals'])}")
    if profile.get("portfolio"):
        parts.append(f"- Портфель: {profile['portfolio']}")
    return ("Профиль пользователя:\n" + "\n".join(parts)) if parts else ""


def node_analyst(state: AgentState) -> AgentState:
    logger.info("[analyst] start")
    cfg = PROMPTS["analyst"]

    search_block = ""
    if state.get("search_results"):
        lines = "\n".join(f"- {s}" for s in state["search_results"][:5])
        search_block = f"Результаты поиска:\n{lines}"

    profile_block = _build_profile_block(state.get("context", {}).get("user_profile", {}))

    prompt = cfg["user_template"].format(
        query=state["query"],
        search_block=search_block,
        profile_block=profile_block,
    )

    raw = ""
    answer_text = "Не удалось получить ответ."
    structured: dict[str, Any] = {}

    try:
        raw = _client().generate(model=ANALYST_MODEL, prompt=prompt, system=cfg["system"])
        data = _parse_json(raw)
        answer_text = data.get("text", raw)
        structured = data.get("structured", {})
    except Exception as e:
        logger.warning(f"[analyst] parse failed ({e}), using raw text")
        answer_text = raw or answer_text

    logger.info(f"[analyst] done — answer_len={len(answer_text)}")
    return {**state, "answer_text": answer_text, "structured": structured}


# ── Routing ────────────────────────────────────────────────────────────────────
def _route_planner(state: AgentState) -> str:
    return "search" if state.get("needs_search") else "analyst"


# ── Graph assembly ─────────────────────────────────────────────────────────────
def _build_graph():
    g = StateGraph(AgentState)
    g.add_node("planner", node_planner)
    g.add_node("search", node_search)
    g.add_node("analyst", node_analyst)
    g.set_entry_point("planner")
    g.add_conditional_edges("planner", _route_planner, {"search": "search", "analyst": "analyst"})
    g.add_edge("search", "analyst")
    g.add_edge("analyst", END)
    return g.compile()


GRAPH = _build_graph()


# ── Public entry point ─────────────────────────────────────────────────────────
def run_graph(user_id: str, query: str, context: dict, mode: str) -> dict:
    # Demo fallback check
    for keyword, demo in DEMO_RESPONSES.items():
        if keyword.lower() in query.lower():
            logger.info(f"[graph] demo fallback — keyword='{keyword}'")
            return {"text": demo.get("text", ""), "structured": demo.get("structured", {}), "sources": [], "error": None}

    initial: AgentState = {
        "user_id": user_id,
        "query": query,
        "context": context,
        "mode": mode,
        "intent": "question",
        "needs_search": False,
        "search_query": None,
        "search_results": [],
        "sources": [],
        "answer_text": "",
        "structured": {},
        "error": None,
    }

    result = GRAPH.invoke(initial)
    return {
        "text": result.get("answer_text", ""),
        "structured": result.get("structured", {}),
        "sources": result.get("sources", []),
        "intent": result.get("intent", "question"),
        "error": result.get("error"),
    }
