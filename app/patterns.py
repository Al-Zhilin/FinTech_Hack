import logging
import os

import yaml

from .database import get_user_profile
from .llm import OllamaClient

logger = logging.getLogger(__name__)

_CLIENT = OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))

_KEYWORD_CATEGORIES: dict[str, list[str]] = {
    "housing":       ["аренда", "ипотека", "квартира", "жильё", "жилье", "коммунал"],
    "subscriptions": ["подписка", "spotify", "netflix", "кино", "youtube", "музыка", "vk", "яндекс"],
    "debt":          ["кредит", "займ", "заём", "долг", "рассрочка"],
    "utilities":     ["интернет", "телефон", "связь", "мтс", "билайн", "мегафон", "электричество", "газ"],
}


def _categorize(name: str) -> str:
    low = name.lower()
    for category, keywords in _KEYWORD_CATEGORIES.items():
        if any(kw in low for kw in keywords):
            return category
    return "other"


def _load_prompts() -> dict:
    path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _call_llm(pattern_label: str, expense_ratio: float, debt_ratio: float,
              free_ratio: float, top_category: str | None) -> str:
    cfg = _load_prompts()["spending_patterns"]
    model = os.getenv("ANALYST_MODEL", "qwen2.5:7b-instruct-q4_K_M")
    prompt = cfg["user_template"].format(
        pattern_label=pattern_label,
        expense_ratio=f"{expense_ratio:.0%}",
        debt_ratio=f"{debt_ratio:.0%}",
        free_ratio=f"{free_ratio:.0%}",
        top_category=top_category or "не определена",
    )
    return _CLIENT.generate(model=model, prompt=prompt, system=cfg["system"]).strip()


def analyze_patterns(user_id: str) -> dict:
    profile = get_user_profile(user_id)

    if not profile:
        return {
            "pattern_label": None, "expense_ratio": None, "debt_ratio": None,
            "free_ratio": None, "top_category": None,
            "insight": "Пройдите онбординг для анализа паттернов трат.",
            "breakdown": {},
        }

    f = profile.get("finances", {})
    income = f.get("monthly_income")

    if not income:
        return {
            "pattern_label": None, "expense_ratio": None, "debt_ratio": None,
            "free_ratio": None, "top_category": None,
            "insight": "Укажите доход для анализа паттернов трат.",
            "breakdown": {},
        }

    expenses = f.get("monthly_expenses_estimate") or 0.0
    debt     = f.get("monthly_debt_payments") or 0.0
    savings  = f.get("savings") or 0.0

    expense_ratio = round(expenses / income, 4)
    debt_ratio    = round(debt / income, 4)
    free_ratio    = round(max(1.0 - expense_ratio - debt_ratio, 0.0), 4)

    # Categorize fixed_payments by name keywords
    breakdown: dict[str, float] = {}
    for p in (f.get("fixed_payments") or []):
        if not isinstance(p, dict):
            continue
        amount = p.get("amount", 0)
        if not isinstance(amount, (int, float)) or amount <= 0:
            continue
        cat = _categorize(p.get("name", ""))
        breakdown[cat] = breakdown.get(cat, 0.0) + float(amount)
    breakdown = {k: round(v, 2) for k, v in breakdown.items()}

    top_category = max(breakdown, key=breakdown.__getitem__) if breakdown else None

    # Pattern label — first matching rule wins
    if free_ratio < 0.05:
        pattern_label = "живёт в ноль"
    elif debt_ratio > 0.30:
        pattern_label = "долговая нагрузка"
    elif savings / income > 3:
        pattern_label = "накопитель"
    else:
        pattern_label = "базовый баланс"

    try:
        insight = _call_llm(pattern_label, expense_ratio, debt_ratio, free_ratio, top_category)
    except Exception as e:
        logger.warning(f"[patterns] LLM failed: {e}")
        insight = f"Паттерн: {pattern_label}. Свободных средств {free_ratio:.0%} от дохода."

    return {
        "pattern_label": pattern_label,
        "expense_ratio": expense_ratio,
        "debt_ratio":    debt_ratio,
        "free_ratio":    free_ratio,
        "top_category":  top_category,
        "insight":       insight,
        "breakdown":     breakdown,
    }
