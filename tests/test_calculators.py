import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.calculators import credit_traffic_light, financial_health_score, savings_plan


def test_credit_traffic_light_green():
    result = credit_traffic_light(
        monthly_income=100_000,
        current_payments=5_000,
        new_loan_amount=200_000,
        new_loan_rate_annual=12.0,
        new_loan_months=24,
    )
    assert result["color"] == "green"
    assert result["pti_after"] < 30
    assert result["monthly_payment"] > 0
    assert result["total_overpayment"] > 0
    assert result["pti_before"] == 5.0


def test_credit_traffic_light_red():
    result = credit_traffic_light(
        monthly_income=50_000,
        current_payments=20_000,
        new_loan_amount=500_000,
        new_loan_rate_annual=20.0,
        new_loan_months=36,
    )
    assert result["color"] == "red"
    assert result["pti_after"] > 50


def test_credit_traffic_light_zero_income():
    result = credit_traffic_light(
        monthly_income=0,
        current_payments=0,
        new_loan_amount=100_000,
        new_loan_rate_annual=10.0,
        new_loan_months=12,
    )
    assert result["color"] == "red"
    assert "доход" in result["verdict"].lower()


def test_financial_health_score_excellent():
    result = financial_health_score(
        monthly_income=150_000,
        monthly_expenses=60_000,
        monthly_debt_payments=10_000,
        savings=1_000_000,
    )
    assert result["total_score"] >= 66
    assert result["level"] in ("good", "excellent")
    assert result["expense_score"] == 33
    assert result["debt_score"] == 33
    assert result["savings_score"] == 34


def test_financial_health_score_critical():
    result = financial_health_score(
        monthly_income=50_000,
        monthly_expenses=48_000,
        monthly_debt_payments=10_000,
        savings=0,
    )
    assert result["total_score"] <= 40
    assert result["level"] == "critical"
    assert result["expense_score"] == 0
    assert result["savings_score"] == 0


def test_savings_plan_realistic():
    result = savings_plan(
        monthly_income=100_000,
        monthly_expenses=60_000,
        monthly_debt_payments=10_000,
        goal_amount=300_000,
        goal_name="Отпуск",
    )
    # free_money = 30_000, recommended = 6_000, months = 50
    assert result["free_money"] == 30_000.0
    assert result["recommended_monthly"] == 6_000.0
    assert result["months_to_goal"] == 50
    assert result["realistic"] is True
    assert "Отпуск" in result["advice"]


def test_savings_plan_no_free_money():
    result = savings_plan(
        monthly_income=50_000,
        monthly_expenses=50_000,
        monthly_debt_payments=5_000,
        goal_amount=100_000,
        goal_name="Авто",
    )
    assert result["free_money"] < 0
    assert result["realistic"] is False
    assert "расход" in result["advice"].lower() or "нет" in result["advice"].lower()
