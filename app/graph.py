import json
import logging
import os
import re
from typing import Any, TypedDict

import yaml
from langgraph.graph import END, StateGraph

from .calculators import cashflow_forecast, credit_traffic_light, financial_health_score, savings_plan
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
    table: dict | None
    # Error propagation
    error: str | None


# ── Config ─────────────────────────────────────────────────────────────────────
def _load_prompts() -> dict:
    path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    try:
        with open(path, encoding="utf-8") as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        raise RuntimeError(f"prompts.yaml not found at {path}") from None


PROMPTS = _load_prompts()
PLANNER_MODEL = os.getenv("PLANNER_MODEL", "qwen2.5:7b-instruct-q4_K_M")
ANALYST_MODEL = os.getenv("ANALYST_MODEL", "qwen2.5:7b-instruct-q4_K_M")
_CLIENT = OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))


_LOAN_KEYWORDS = re.compile(
    r"\b(кредит\w*|займ\w*|заём\w*|ипотек\w*|рассрочк\w*)\b",
    re.IGNORECASE,
)

_CASHFLOW_KEYWORDS = re.compile(
    r"хватит|до зарплаты|остаток|сколько осталось|дотяну|не хватает|баланс",
    re.IGNORECASE,
)


def _parse_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
    return json.loads(cleaned)


def _extract_loan_params(query: str) -> dict | None:
    cfg = PROMPTS["loan_extractor"]
    prompt = cfg["user_template"].format(query=query)
    try:
        raw = _CLIENT.generate(model=PLANNER_MODEL, prompt=prompt, system=cfg["system"])
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", cleaned)
        if cleaned.lower() in ("null", "none", ""):
            return None
        data = json.loads(cleaned)
        if not data or not data.get("loan_amount"):
            return None
        return data
    except Exception as e:
        logger.debug(f"[loan_extractor] failed: {e}")
        return None


# ── Nodes ──────────────────────────────────────────────────────────────────────
def node_planner(state: AgentState) -> AgentState:
    logger.info(f"[planner] start — query='{state['query'][:80]}'")
    cfg = PROMPTS["planner"]
    prompt = cfg["user_template"].format(query=state["query"])

    intent = "question"
    needs_search = False
    search_query = None

    try:
        raw = _CLIENT.generate(model=PLANNER_MODEL, prompt=prompt, system=cfg["system"])
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
        ("monthly_expenses_estimate", "Расходы в месяц (руб)"),
        ("monthly_debt_payments", "Платежи по долгам в месяц (руб)"),
        ("savings", "Накопления (руб)"),
        ("current_balance", "Текущий остаток (руб)"),
        ("days_to_salary", "Дней до зарплаты"),
        ("risk_tolerance", "Риск-профиль"),
    ]
    parts = [f"- {label}: {profile[key]}" for key, label in labels if profile.get(key) is not None]
    if profile.get("goals"):
        parts.append(f"- Финансовые цели: {', '.join(profile['goals'])}")
    if profile.get("portfolio"):
        parts.append(f"- Портфель: {profile['portfolio']}")
    return ("Профиль пользователя:\n" + "\n".join(parts)) if parts else ""


def _run_calculator(state: AgentState) -> dict | None:
    intent = state.get("intent", "")
    if intent not in ("advice", "analysis"):
        return None

    profile = state.get("context", {}).get("user_profile", {}) or {}
    query = state.get("query", "")
    result: dict = {}

    income = profile.get("monthly_income")

    if income:
        expenses = profile.get("monthly_expenses_estimate") or 0.0
        savings_val = profile.get("savings") or 0.0
        debt = profile.get("monthly_debt_payments") or 0.0

        result["health"] = financial_health_score(income, expenses, debt, savings_val)

        goals = profile.get("goals", [])
        if goals:
            goal_amount = profile.get("financial_goal_amount") or 0.0
            plan = savings_plan(income, expenses, debt, goal_amount=goal_amount, goal_name=goals[0])
            if not goal_amount:
                plan["note"] = "Сумма цели не указана — план приблизительный"
            result["savings_plan"] = plan

    if _LOAN_KEYWORDS.search(query):
        loan_params = _extract_loan_params(query)
        if loan_params:
            traffic = credit_traffic_light(
                monthly_income=income or 50_000.0,
                current_payments=profile.get("monthly_debt_payments") or 0.0,
                new_loan_amount=float(loan_params.get("loan_amount", 0)),
                new_loan_rate_annual=float(loan_params.get("rate_annual", 20.0)),
                new_loan_months=int(loan_params.get("months", 12)),
            )
            result["traffic_light"] = traffic
            logger.info(f"[calculator] traffic_light={traffic['color']} pti_after={traffic['pti_after']}")

    if _CASHFLOW_KEYWORDS.search(query):
        monthly_expenses = profile.get("monthly_expenses_estimate") or 0.0
        cashflow = cashflow_forecast(
            current_balance=profile.get("current_balance") or 0.0,
            daily_avg_spend=monthly_expenses / 30 if monthly_expenses else 0.0,
            days_to_salary=profile.get("days_to_salary") or 15,
            fixed_payments=profile.get("fixed_payments") or [],
        )
        result["cashflow"] = cashflow
        logger.info(f"[calculator] cashflow projected={cashflow['projected_balance']} negative={cashflow['will_be_negative']}")

    return result or None


def node_analyst(state: AgentState) -> AgentState:
    logger.info("[analyst] start")
    cfg = PROMPTS["analyst"]

    search_block = ""
    if state.get("search_results"):
        lines = "\n".join(f"- {s}" for s in state["search_results"][:5])
        search_block = f"Результаты поиска:\n{lines}"

    profile_block = _build_profile_block(state.get("context", {}).get("user_profile", {}))

    calc_result = _run_calculator(state)
    calc_block = ""
    if calc_result:
        import json as _json
        calc_block = "Результаты калькулятора:\n" + _json.dumps(calc_result, ensure_ascii=False, indent=2)

    prompt = cfg["user_template"].format(
        query=state["query"],
        search_block=search_block,
        profile_block=profile_block,
        calc_block=calc_block,
    )

    raw = ""
    answer_text = "Не удалось получить ответ."
    structured: dict[str, Any] = {}
    table: dict | None = None

    try:
        raw = _CLIENT.generate(model=ANALYST_MODEL, prompt=prompt, system=cfg["system"])

        # Extract <table>...</table> before JSON parsing
        table_match = re.search(r"<table>(.*?)</table>", raw, re.DOTALL)
        if table_match:
            try:
                table = json.loads(table_match.group(1).strip())
            except Exception:
                table = None
            raw = raw[:table_match.start()] + raw[table_match.end():]

        data = _parse_json(raw)
        answer_text = data.get("text", raw)
        structured = data.get("structured", {})
        if calc_result:
            structured["calculator_result"] = calc_result
    except Exception as e:
        logger.warning(f"[analyst] parse failed ({e}), using raw text")
        answer_text = raw or answer_text
        if calc_result:
            structured["calculator_result"] = calc_result

    logger.info(f"[analyst] done — answer_len={len(answer_text)} table={'yes' if table else 'no'}")
    return {**state, "answer_text": answer_text, "structured": structured, "table": table}


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
        "table": None,
        "error": None,
    }

    result = GRAPH.invoke(initial)
    return {
        "text": result.get("answer_text", ""),
        "table": result.get("table"),
        "structured": result.get("structured", {}),
        "sources": result.get("sources", []),
        "intent": result.get("intent", "question"),
        "error": result.get("error"),
    }
