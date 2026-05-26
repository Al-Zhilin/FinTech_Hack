"""
Стресс-тесты AI-сервиса. Запуск:
    python tests/run_tests.py
Сервис должен быть запущен на http://localhost:8001
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

import httpx

BASE_URL = "http://localhost:8001"
RESULTS_FILE = Path(__file__).parent / "results.json"
TIMEOUT = 120  # секунд на один запрос

# ── Тесты ─────────────────────────────────────────────────────────────────────
# Поля теста:
#   group            — группа (для группировки вывода)
#   name             — название
#   endpoint         — /health или /ai/process
#   method           — GET / POST
#   request_body     — тело запроса (None для GET)
#   expected         — авто-проверки:
#     .status          — для /health
#     .intent          — ожидаемый intent (строгое совпадение)
#     .keywords        — хотя бы одно слово должно быть в text
#     .has_structured  — structured не должен быть пустым
#   meta             — информационные поля (не проверяются):
#     .expected_search — ожидаемое решение planner по поиску

TESTS: list[dict] = [

    # ── smoke ──────────────────────────────────────────────────────────────────
    {
        "name": "health — сервис живой",
        "group": "smoke",
        "endpoint": "/health",
        "method": "GET",
        "request_body": None,
        "expected": {"status": "ok"},
    },
    {
        "name": "базовый вопрос без профиля",
        "group": "smoke",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test-001",
            "query": "Что такое диверсификация портфеля?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {
            "keywords": ["портфель", "риск", "активы", "диверсификация"],
            "has_structured": True,
        },
    },

    # ── robustness ────────────────────────────────────────────────────────────
    {
        "name": "пустая строка",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },
    {
        "name": "бессмыслица (asdfghjkl)",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "asdfghjkl",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },
    {
        "name": "очень длинный запрос (1000+ символов)",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "lorem ipsum dolor sit amet " * 50,
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },
    {
        "name": "emoji вперемешку",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "💰 Сколько 🤔 стоит 📈 биткоин сегодня?? 🚀",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },
    {
        "name": "английский запрос",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "What is the current EUR/USD exchange rate?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },
    {
        "name": "CAPS + лишняя пунктуация",
        "group": "robustness",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_robust",
            "query": "ЧТО ТАКОЕ ИНФЛЯЦИЯ?!?!?!?!",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"not_empty_text": True},
    },

    # ── planner_classification ─────────────────────────────────────────────────
    {
        "name": "ETF — что такое?",
        "group": "planner_classification",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_planner",
            "query": "Что такое ETF?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"intent": "question"},
        "meta": {"expected_search": False},
    },
    {
        "name": "курс доллара — актуальный вопрос",
        "group": "planner_classification",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_planner",
            "query": "Какой сейчас курс доллара?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"intent": "analysis"},
        "meta": {"expected_search": True},
    },
    {
        "name": "трата — action-запрос",
        "group": "planner_classification",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_planner",
            "query": "Добавь трату 500 рублей на еду",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"intent": "action"},
        "meta": {"expected_search": False},
    },
    {
        "name": "ипотека — advice-запрос",
        "group": "planner_classification",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_planner",
            "query": "Стоит ли мне взять ипотеку под 15%?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"intent": "advice"},
        "meta": {"expected_search": None},  # любое
    },
    {
        "name": "привет — casual",
        "group": "planner_classification",
        "endpoint": "/ai/process",
        "method": "POST",
        "request_body": {
            "user_id": "test_planner",
            "query": "Привет, как дела?",
            "context": {"user_profile": {}},
            "mode": "chat",
        },
        "expected": {"intent": "casual"},
        "meta": {"expected_search": False},
    },

]


# ── Runner ─────────────────────────────────────────────────────────────────────

def check_server() -> bool:
    try:
        with httpx.Client(timeout=5) as client:
            client.get(f"{BASE_URL}/health")
        return True
    except httpx.ConnectError:
        return False


def run_test(test: dict) -> dict:
    method = test.get("method", "POST")
    url = BASE_URL + test["endpoint"]
    body = test.get("request_body")

    t0 = time.perf_counter()
    status_code = None
    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            if method == "GET":
                resp = client.get(url)
            else:
                resp = client.post(url, json=body)
        elapsed = time.perf_counter() - t0
        status_code = resp.status_code
        data = resp.json()
        error = None
    except Exception as e:
        elapsed = time.perf_counter() - t0
        data = {}
        error = str(e)

    passed, failures = _check_expected(test.get("expected"), data, error, status_code)

    return {
        "name": test["name"],
        "group": test.get("group", ""),
        "passed": passed,
        "failures": failures,
        "elapsed": round(elapsed, 2),
        "status_code": status_code,
        "response": data,
        "error": error,
        "meta": test.get("meta", {}),
        "expected": test.get("expected", {}),
        "request_body": test.get("request_body") or {},
    }


def _check_expected(expected: dict | None, data: dict, error: str | None, status_code: int | None = None) -> tuple[bool, list[str]]:
    failures = []

    if error:
        failures.append(f"request error: {error}")
        return False, failures

    if not expected:
        return True, []

    if "status" in expected:
        if data.get("status") != expected["status"]:
            failures.append(f"status: got {data.get('status')!r}, want {expected['status']!r}")

    if "intent" in expected:
        got = data.get("intent")
        if got != expected["intent"]:
            failures.append(f"intent: got {got!r}, want {expected['intent']!r}")

    if "keywords" in expected:
        text = (data.get("text") or "").lower()
        hits = [kw for kw in expected["keywords"] if kw.lower() in text]
        if not hits:
            failures.append(f"keywords: ни одного из {expected['keywords']} в ответе")

    if expected.get("has_structured"):
        if not data.get("structured"):
            failures.append("structured: пустой dict")

    if expected.get("not_empty_text"):
        if status_code != 200:
            failures.append(f"HTTP {status_code} (ожидался 200)")
        if not (data.get("text") or "").strip():
            failures.append("text пустой")

    return len(failures) == 0, failures


# ── Print helpers ──────────────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"


def print_result(r: dict) -> None:
    status = "PASS" if r["passed"] else "FAIL"
    color = GREEN if r["passed"] else RED
    print(f"{color}[{status}]{RESET} {r['name']} — {r['elapsed']}с")

    if r["error"]:
        print(f"       error: {r['error']}")
        return

    if r["group"] == "robustness":
        query = r["request_body"].get("query", "")
        q_display = repr(query[:40]) if len(query) <= 40 else f"{len(query)} символов"
        http_status = r["status_code"] or "—"
        text = (r["response"].get("text") or "")[:200]
        print(f"       query:  {q_display}")
        print(f"       HTTP:   {http_status} | text: {text or '(пусто)'}")
    elif r["group"] == "planner_classification":
        actual_intent  = r["response"].get("intent", "—")
        expected_intent = r["expected"].get("intent", "—")
        expected_search = r["meta"].get("expected_search")

        match_mark = f"{GREEN}✓{RESET}" if actual_intent == expected_intent else f"{RED}✗{RESET}"
        search_str = "any" if expected_search is None else str(expected_search)
        print(f"       intent:  ожидалось={expected_intent:<10} фактически={actual_intent:<10} {match_mark}")
        print(f"       search:  ожидалось={search_str}")
    else:
        text   = (r["response"].get("text") or "")[:200]
        intent = r["response"].get("intent", "—")
        sources = r["response"].get("sources", [])
        if text:
            print(f"       text: {text}")
        if intent != "—":
            print(f"       intent: {intent}")
        if sources:
            print(f"       sources: {len(sources)} шт → {sources[0]}")

    if r["failures"]:
        for f in r["failures"]:
            print(f"       {RED}✗ {f}{RESET}")


def print_group_summary(group: str, results: list[dict]) -> None:
    group_results = [r for r in results if r["group"] == group]
    if not group_results:
        return
    passed = sum(1 for r in group_results if r["passed"])
    total  = len(group_results)
    color  = GREEN if passed == total else RED
    print(f"  {color}{group}: {passed}/{total} passed{RESET}")


def print_summary(results: list[dict]) -> None:
    total  = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    avg    = sum(r["elapsed"] for r in results) / total if total else 0

    print()
    print("=" * 60)
    print(f"  ИТОГО: {passed}/{total} passed  |  failed: {failed}  |  avg: {avg:.1f}с")
    print()

    groups = list(dict.fromkeys(r["group"] for r in results))
    for g in groups:
        print_group_summary(g, results)

    print()
    print(f"  {'Тест':<42} {'Статус':>6} {'Время':>7}")
    print("  " + "-" * 58)
    for r in results:
        status = "PASS" if r["passed"] else "FAIL"
        color  = GREEN if r["passed"] else RED
        name   = r["name"][:42]
        print(f"  {color}{name:<42} {status:>6}{RESET} {r['elapsed']:>6.1f}с")
    print("=" * 60)


def save_results(results: list[dict]) -> None:
    payload = {
        "timestamp": datetime.now().isoformat(),
        "total": len(results),
        "passed": sum(1 for r in results if r["passed"]),
        "results": results,
    }
    RESULTS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n  Результаты сохранены → {RESULTS_FILE}")


# ── Entry point ────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"\nAI Service stress tests  |  {BASE_URL}")
    print("=" * 60)

    if not check_server():
        print(f"\n{RED}[ERROR]{RESET} Сервис не отвечает. Запусти:")
        print("  uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload")
        sys.exit(1)

    results = []
    current_group = None

    for test in TESTS:
        group = test.get("group", "")
        if group != current_group:
            current_group = group
            print(f"\n── {group} {'─' * (54 - len(group))}")

        r = run_test(test)
        results.append(r)
        print_result(r)

    print_summary(results)
    save_results(results)


if __name__ == "__main__":
    main()
