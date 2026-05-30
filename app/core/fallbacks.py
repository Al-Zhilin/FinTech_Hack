# Только детерминированные математические вычисления — без выдуманного контента.
# Используется когда AI-сервер недоступен, но входные данные от клиента есть.


def _annuity(amount: float, annual_rate: float, months: int) -> float:
    r = annual_rate / 100 / 12
    if r == 0 or months == 0:
        return round(amount / max(months, 1), 2)
    return round(amount * r * (1 + r) ** months / ((1 + r) ** months - 1), 2)


def cashflow_calculate_fallback(current_balance: float, days_to_salary: int) -> dict:
    """
    Расчёт кэшфлоу по аннуитетной логике без профиля пользователя.
    Оценка: 60% баланса уйдёт равномерно за период.
    """
    safe_days = max(days_to_salary, 1)
    daily_burn = round(current_balance * 0.6 / safe_days, 2)

    forecast = []
    balance = current_balance
    critical_day = None
    for day in range(days_to_salary + 1):
        if balance < 0 and critical_day is None:
            critical_day = day
        forecast.append({"day": day, "balance": round(balance, 2), "event": None})
        balance = round(balance - daily_burn, 2)

    projected_balance = round(current_balance - daily_burn * days_to_salary, 2)
    will_be_negative = projected_balance < 0
    shortage = round(max(0.0, -projected_balance), 2)

    verdict = (
        f"Есть риск нехватки средств до зарплаты — возможный дефицит {shortage:,.0f} ₽."
        if will_be_negative else
        f"Средств должно хватить до зарплаты. Прогнозируемый остаток: {projected_balance:,.0f} ₽."
    )

    return {
        "projected_balance": projected_balance,
        "will_be_negative": will_be_negative,
        "shortage": shortage,
        "days_to_salary": days_to_salary,
        "daily_avg_spend": daily_burn,
        "danger_day": critical_day,
        "verdict": verdict,
        "daily_burn": daily_burn,
        "forecast": forecast,
        "risk_events": [],
        "critical_day": critical_day,
    }
