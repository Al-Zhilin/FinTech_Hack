import hashlib
import json
import logging
import os
import re
from datetime import date

import yaml

from .calculators import cashflow_forecast, financial_health_score, savings_plan
from .database import get_user_profile
from .llm import OllamaClient

logger = logging.getLogger(__name__)

CATEGORIES = ["накопления", "денежный поток", "долги", "цель", "здоровье"]

_GENERIC_CARDS = {
    "накопления": {
        "action": "Отложите любую сумму сегодня",
        "impact": "Даже 500 ₽ в день — это 15 000 ₽ за месяц",
    },
    "денежный поток": {
        "action": "Запишите сегодняшние расходы",
        "impact": "Понимание трат — первый шаг к контролю бюджета",
    },
    "долги": {
        "action": "Проверьте сумму всех платежей за месяц",
        "impact": "Знание нагрузки помогает принять верное решение",
    },
    "цель": {
        "action": "Определите сумму вашей ближайшей цели",
        "impact": "Конкретная цель достигается в 3 раза чаще, чем размытая",
    },
    "здоровье": {
        "action": "Укажите доход и расходы в профиле",
        "impact": "Получите персональный анализ финансового здоровья",
    },
}

_CLIENT = OllamaClient(os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))


def _pick_category(user_id: str) -> str:
    digest = hashlib.md5(f"{user_id}{date.today().isoformat()}".encode()).hexdigest()
    return CATEGORIES[int(digest, 16) % len(CATEGORIES)]


def _load_prompts() -> dict:
    path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


def _run_calculator(category: str, profile: dict) -> dict | None:
    f = profile.get("finances", {})
    income   = f.get("monthly_income")
    expenses = f.get("monthly_expenses_estimate") or 0.0
    debt     = f.get("monthly_debt_payments") or 0.0
    savings  = f.get("savings") or 0.0

    try:
        if category in ("здоровье", "долги") and income:
            return financial_health_score(income, expenses, debt, savings)

        if category == "накопления" and income:
            goal_name   = f.get("financial_goal") or "Накопления"
            goal_amount = f.get("financial_goal_amount") or 0.0
            return savings_plan(income, expenses, debt, goal_amount, goal_name)

        if category == "цель" and income and f.get("financial_goal"):
            goal_name   = f.get("financial_goal", "Цель")
            goal_amount = f.get("financial_goal_amount") or 0.0
            return savings_plan(income, expenses, debt, goal_amount, goal_name)

        if category == "денежный поток":
            current_balance = f.get("current_balance")
            if current_balance is None:
                return None
            daily = expenses / 30 if expenses else 0.0
            days  = f.get("days_to_salary") or 15
            return cashflow_forecast(
                current_balance=float(current_balance),
                daily_avg_spend=daily,
                days_to_salary=int(days),
                fixed_payments=[],
            )

    except Exception as e:
        logger.warning(f"[daily_action] calculator error category={category}: {e}")

    return None


def _call_llm(category: str, calc_result: dict) -> dict:
    cfg = _load_prompts()["daily_action"]
    model = os.getenv("ANALYST_MODEL", "qwen2.5:7b-instruct-q4_K_M")
    user_prompt = cfg["user_template"].format(
        category=category,
        calc_result=json.dumps(calc_result, ensure_ascii=False, indent=2),
    )
    raw = _CLIENT.generate(model=model, prompt=user_prompt, system=cfg["system"])
    return _extract_json(raw)


def get_daily_action(user_id: str) -> dict:
    category = _pick_category(user_id)
    generic  = _GENERIC_CARDS[category]

    profile = get_user_profile(user_id)
    if not profile:
        return {"action": generic["action"], "category": category, "impact": generic["impact"]}

    calc_result = _run_calculator(category, profile)
    if not calc_result:
        return {"action": generic["action"], "category": category, "impact": generic["impact"]}

    try:
        llm = _call_llm(category, calc_result)
        return {
            "action":   llm.get("action",  generic["action"]),
            "category": category,
            "impact":   llm.get("impact",  generic["impact"]),
        }
    except Exception as e:
        logger.warning(f"[daily_action] LLM failed: {e}, using calculator fallback")
        impact = (
            calc_result.get("verdict")
            or calc_result.get("advice")
            or calc_result.get("action")
            or generic["impact"]
        )
        return {"action": generic["action"], "category": category, "impact": impact}
