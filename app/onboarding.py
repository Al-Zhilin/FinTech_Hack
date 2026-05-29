import json
import logging
import os
import re

import yaml

from .database import get_onboarding_history, save_onboarding_message, save_user_profile
from .llm import OllamaClient

logger = logging.getLogger(__name__)

_prompts: dict = {}

# Predefined question queue — LLM picks next question, Python enforces progression
PHASE_QUESTIONS = {
    1: [
        "Привет! Чтобы лучше понять твою ситуацию, расскажи — чем занимаешься в свободное время?",
        "Какими приложениями или сервисами пользуешься каждый день — соцсети, музыка, доставка?",
    ],
    2: [
        "Как часто ходишь в кафе или рестораны — редко, пару раз в месяц или часто?",
        "Есть ли платные подписки — стриминг, фитнес, облако и т.д.?",
        "Как добираешься до работы или учёбы — на своей машине, транспорте или такси?",
    ],
    3: [
        "Переходим к финансам — примерно какой у тебя ежемесячный доход? Можно диапазоном, не обязательно точно.",
        "Есть ли обязательные платежи каждый месяц — аренда, ипотека, кредиты?",
        "Есть ли какие-то накопления или финансовая подушка?",
        "И последнее — какая у тебя главная финансовая цель на ближайший год?",
    ],
}

# Total questions count: 2 + 3 + 4 = 9
PHASE_LIMITS = {1: 2, 2: 3, 3: 4}


def _load_prompts() -> dict:
    global _prompts
    if _prompts:
        return _prompts
    path = os.path.join(os.path.dirname(__file__), "prompts.yaml")
    with open(path, encoding="utf-8") as f:
        _prompts = yaml.safe_load(f)
    return _prompts


def _extract_json(raw: str) -> dict:
    raw = re.sub(r"```(?:json)?", "", raw).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


def _count_questions_by_phase(history: list[dict]) -> dict[int, int]:
    counts: dict[int, int] = {1: 0, 2: 0, 3: 0}
    for msg in history:
        if msg["role"] == "assistant":
            p = msg.get("phase", 1)
            counts[p] = counts.get(p, 0) + 1
    return counts


def _next_question(phase_counts: dict[int, int]) -> tuple[str | None, int, bool]:
    """Returns (question_text, phase, complete)."""
    for phase in (1, 2, 3):
        asked = phase_counts.get(phase, 0)
        limit = PHASE_LIMITS[phase]
        questions = PHASE_QUESTIONS[phase]
        if asked < limit:
            idx = min(asked, len(questions) - 1)
            return questions[idx], phase, False
    return None, 3, True


def _extract_data_from_answer(user_message: str, history: list[dict], phase: int) -> dict:
    """Ask LLM to extract structured data from the user's answer."""
    prompts = _load_prompts()
    system = prompts["onboarding"]["extractor_system"]
    history_tail = "\n".join(
        f"{'Пользователь' if m['role'] == 'user' else 'Ассистент'}: {m['text']}"
        for m in history[-20:]
    )
    user_prompt = prompts["onboarding"]["extractor_template"].format(
        history=history_tail or "Начало диалога",
        user_message=user_message,
        phase=phase,
    )

    ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("PLANNER_MODEL", "qwen2.5:7b-instruct-q4_K_M")
    client = OllamaClient(ollama_url)

    try:
        raw = client.generate(model=model, prompt=user_prompt, system=system)
        return _extract_json(raw)
    except Exception as e:
        logger.warning(f"[onboarding] extraction failed: {e}")
        return {}


async def process_onboarding(user_id: str, user_message: str, history: list[dict]) -> dict:
    phase_counts = _count_questions_by_phase(history)
    current_phase = max((p for p, c in phase_counts.items() if c > 0), default=1)

    # Extract data from this answer
    extracted = _extract_data_from_answer(user_message, history, current_phase)

    # Save user message with extracted data attached
    save_onboarding_message(user_id, "user", user_message, current_phase, extracted or None)

    # Determine next question
    next_q, next_phase, complete = _next_question(phase_counts)

    if complete:
        # Build and save profile from full history extraction
        profile = _build_profile(history, extracted)
        save_user_profile(user_id, profile)
        logger.info(f"[onboarding] profile saved for user {user_id}")
        summary = _build_summary(profile)
        save_onboarding_message(user_id, "assistant", summary, 3)
        return {
            "next_question": None,
            "phase": 3,
            "onboarding_complete": True,
            "extracted_data": extracted,
            "profile_summary": summary,
        }

    save_onboarding_message(user_id, "assistant", next_q, next_phase)
    return {
        "next_question": next_q,
        "phase": next_phase,
        "onboarding_complete": False,
        "extracted_data": extracted,
        "profile_summary": None,
    }


def _build_profile(history: list[dict], last_extracted: dict) -> dict:
    """Merge all extracted data from history into a profile."""
    merged: dict = {}
    for msg in history:
        if msg.get("extracted"):
            merged.update(msg["extracted"])
    merged.update(last_extracted)

    return {
        "lifestyle": {
            "interests": merged.get("interests", []),
            "subscriptions": merged.get("subscriptions", []),
            "dining_frequency": merged.get("dining_frequency", "sometimes"),
            "transport": merged.get("transport", "public"),
        },
        "finances": {
            "monthly_income": merged.get("monthly_income"),
            "monthly_expenses_estimate": merged.get("monthly_expenses_estimate"),
            "monthly_debt_payments": merged.get("monthly_debt_payments"),
            "has_mortgage": merged.get("has_mortgage", False),
            "has_loans": merged.get("has_loans", False),
            "savings": merged.get("savings"),
            "financial_goal": merged.get("financial_goal"),
            "financial_goal_amount": merged.get("financial_goal_amount"),
        },
        "meta": {
            "financial_literacy": merged.get("financial_literacy", "medium"),
            "onboarding_complete": True,
            "phase": 3,
        },
    }


def _build_summary(profile: dict) -> str:
    f = profile.get("finances", {})
    l = profile.get("lifestyle", {})
    parts = []
    if l.get("interests"):
        parts.append(f"Интересы: {', '.join(l['interests'])}")
    if f.get("monthly_income"):
        parts.append(f"Доход ~{f['monthly_income']:,.0f} ₽/мес")
    if f.get("financial_goal"):
        parts.append(f"Цель: {f['financial_goal']}")
    if f.get("savings"):
        parts.append(f"Накопления ~{f['savings']:,.0f} ₽")
    base = ". ".join(parts) if parts else "Профиль собран"
    return f"Отлично, я тебя понял! {base}. Теперь я смогу давать персональные советы."
