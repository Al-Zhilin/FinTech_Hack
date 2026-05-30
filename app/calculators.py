def credit_traffic_light(
    monthly_income: float,
    current_payments: float,
    new_loan_amount: float,
    new_loan_rate_annual: float,
    new_loan_months: int,
) -> dict:
    if monthly_income <= 0:
        return {
            "color": "red",
            "pti_before": 0.0,
            "pti_after": 0.0,
            "monthly_payment": 0.0,
            "total_overpayment": 0.0,
            "monthly_income": monthly_income,
            "verdict": "Невозможно рассчитать: доход не указан.",
        }

    r = new_loan_rate_annual / 12 / 100
    n = new_loan_months
    s = new_loan_amount

    if r == 0 or n == 0:
        monthly_payment = s / n if n > 0 else 0.0
    else:
        monthly_payment = s * (r * (1 + r) ** n) / ((1 + r) ** n - 1)

    total_overpayment = monthly_payment * n - s
    pti_before = current_payments / monthly_income * 100
    pti_after = (current_payments + monthly_payment) / monthly_income * 100

    if pti_after < 30:
        color = "green"
        verdict = "Кредитная нагрузка в норме — можно брать."
    elif pti_after < 50:
        color = "yellow"
        verdict = "Нагрузка повышенная — берите с осторожностью, есть риски."
    else:
        color = "red"
        verdict = "Нагрузка критическая — кредит существенно ухудшит финансовое положение."

    return {
        "color": color,
        "pti_before": round(pti_before, 1),
        "pti_after": round(pti_after, 1),
        "monthly_payment": round(monthly_payment, 2),
        "total_overpayment": round(total_overpayment, 2),
        "monthly_income": monthly_income,
        "verdict": verdict,
    }


def financial_health_score(
    monthly_income: float,
    monthly_expenses: float,
    monthly_debt_payments: float,
    savings: float,
) -> dict:
    if monthly_income <= 0:
        return {
            "total_score": 0,
            "expense_score": 0,
            "debt_score": 0,
            "savings_score": 0,
            "level": "critical",
            "action": "Укажите ваш ежемесячный доход для расчёта финансового здоровья.",
        }

    expense_ratio = monthly_expenses / monthly_income
    if expense_ratio < 0.50:
        expense_score = 33
    elif expense_ratio < 0.70:
        expense_score = 20
    elif expense_ratio < 0.90:
        expense_score = 10
    else:
        expense_score = 0

    debt_ratio = monthly_debt_payments / monthly_income
    if debt_ratio < 0.15:
        debt_score = 33
    elif debt_ratio < 0.30:
        debt_score = 20
    elif debt_ratio < 0.50:
        debt_score = 10
    else:
        debt_score = 0

    savings_months = savings / monthly_income
    if savings_months >= 6:
        savings_score = 34
    elif savings_months >= 3:
        savings_score = 20
    elif savings_months >= 1:
        savings_score = 10
    else:
        savings_score = 0

    total_score = expense_score + debt_score + savings_score

    if total_score <= 40:
        level = "critical"
    elif total_score <= 65:
        level = "medium"
    elif total_score <= 85:
        level = "good"
    else:
        level = "excellent"

    # Самая острая проблема → конкретный совет
    if savings_score == 0:
        action = "Создайте финансовую подушку: откладывайте хотя бы 1 000–2 000 ₽ в месяц."
    elif expense_score == 0:
        action = "Расходы съедают почти весь доход — найдите 2-3 статьи для сокращения."
    elif debt_score == 0:
        action = "Долговая нагрузка критическая — приоритет: погасить дорогие кредиты."
    elif expense_score < 20:
        action = "Расходы высокие — попробуйте вести бюджет и сократить необязательные траты."
    elif savings_score < 20:
        action = "Подушка безопасности мала — наращивайте накопления до 3 месячных расходов."
    else:
        action = "Финансовое здоровье хорошее — рассмотрите инвестиции для роста капитала."

    return {
        "total_score": total_score,
        "expense_score": expense_score,
        "debt_score": debt_score,
        "savings_score": savings_score,
        "level": level,
        "action": action,
    }


def savings_plan(
    monthly_income: float,
    monthly_expenses: float,
    monthly_debt_payments: float,
    goal_amount: float,
    goal_name: str,
) -> dict:
    free_money = monthly_income - monthly_expenses - monthly_debt_payments
    recommended_monthly = free_money * 0.2

    if recommended_monthly > 0 and goal_amount > 0:
        months_raw = goal_amount / recommended_monthly
        months_to_goal = int(months_raw) + (1 if months_raw % 1 > 0 else 0)
        realistic = months_to_goal <= 60
    else:
        months_to_goal = None
        realistic = False

    if free_money <= 0:
        advice = (
            f"Свободных денег нет — расходы превышают доход. "
            f"Для цели «{goal_name}» сначала сократите расходы."
        )
    elif not realistic:
        years = (months_to_goal or 0) // 12
        advice = (
            f"Цель «{goal_name}» займёт более 5 лет при откладывании 20% свободных средств. "
            f"Рассмотрите увеличение дохода или инвестирование части накоплений."
        )
    else:
        years = (months_to_goal or 0) // 12
        months_rem = (months_to_goal or 0) % 12
        period = f"{years} лет {months_rem} мес." if years else f"{months_rem} мес."
        advice = (
            f"Откладывая {recommended_monthly:,.0f} ₽/мес., достигнете цели «{goal_name}» "
            f"примерно за {period}."
        )

    return {
        "free_money": round(free_money, 2),
        "recommended_monthly": round(recommended_monthly, 2),
        "months_to_goal": months_to_goal,
        "realistic": realistic,
        "goal_name": goal_name,
        "advice": advice,
    }


def cashflow_forecast(
    current_balance: float,
    daily_avg_spend: float,
    days_to_salary: int,
    fixed_payments: list[dict],
) -> dict:
    balance = max(float(current_balance), 0.0)
    daily = max(float(daily_avg_spend), 0.0)
    days = max(int(days_to_salary), 0)

    valid_payments = [
        p for p in (fixed_payments or [])
        if isinstance(p, dict)
        and isinstance(p.get("amount"), (int, float))
        and isinstance(p.get("days_from_now"), (int, float))
        and 0 < p["days_from_now"] <= days
    ]
    fixed_total = sum(p["amount"] for p in valid_payments)
    projected = balance - daily * days - fixed_total

    will_be_negative = projected < 0
    shortage = round(abs(projected), 2) if will_be_negative else 0.0

    danger_day = _find_danger_day(balance, daily, days, valid_payments)

    if will_be_negative:
        verdict = f"Денег не хватит до зарплаты — дефицит {shortage:,.0f} ₽."
        if danger_day is not None:
            verdict += f" Закончатся примерно через {danger_day} дн."
    else:
        verdict = f"Денег хватит до зарплаты, остаток ~{projected:,.0f} ₽."

    return {
        "projected_balance": round(projected, 2),
        "will_be_negative": will_be_negative,
        "shortage": shortage,
        "days_to_salary": days,
        "daily_avg_spend": round(daily, 2),
        "danger_day": danger_day,
        "verdict": verdict,
    }


def cashflow_forecast_detailed(
    current_balance: float,
    monthly_expenses: float,
    monthly_debt_payments: float,
    days_to_salary: int,
    fixed_payments: list[dict],
) -> dict:
    days = max(int(days_to_salary), 0)
    balance_start = max(float(current_balance), 0.0)

    valid_fixed = [
        p for p in (fixed_payments or [])
        if isinstance(p, dict)
        and isinstance(p.get("amount"), (int, float))
        and isinstance(p.get("days_from_now"), (int, float))
        and 0 < p["days_from_now"] <= days
    ]

    fixed_total = sum(p["amount"] for p in valid_fixed)
    daily_burn = max((float(monthly_expenses) - fixed_total) / 30, 0.0) if days else 0.0

    base = cashflow_forecast(
        current_balance=balance_start,
        daily_avg_spend=daily_burn,
        days_to_salary=days,
        fixed_payments=valid_fixed,
    )

    payments_by_day: dict[int, list[dict]] = {}
    for p in valid_fixed:
        payments_by_day.setdefault(int(p["days_from_now"]), []).append(p)

    forecast: list[dict] = [{"day": 0, "balance": round(balance_start, 2), "event": None}]
    running = balance_start
    critical_day: int | None = None

    for day in range(1, days + 1):
        running -= daily_burn
        event = None
        for p in payments_by_day.get(day, []):
            running -= p["amount"]
            event = p.get("name") or "платёж"
        forecast.append({"day": day, "balance": round(running, 2), "event": event})
        if running < 0 and critical_day is None:
            critical_day = day

    risk_events = [e for e in forecast if e["event"] is not None]

    return {
        **base,
        "daily_burn":  round(daily_burn, 2),
        "forecast":    forecast,
        "risk_events": risk_events,
        "critical_day": critical_day,
    }


def _find_danger_day(
    balance: float, daily: float, days: int, valid_payments: list[dict]
) -> int | None:
    payments = sorted(valid_payments, key=lambda p: p["days_from_now"])
    running = balance
    prev_day = 0

    for p in payments:
        pay_day = int(p["days_from_now"])
        span = pay_day - prev_day
        if daily > 0 and running < daily * span:
            return prev_day + int(running / daily)
        running -= daily * span
        running -= p["amount"]
        if running < 0:
            return pay_day
        prev_day = pay_day

    remaining_days = days - prev_day
    if daily > 0 and running < daily * remaining_days:
        return prev_day + int(running / daily)

    return None
