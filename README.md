# AI-сервис финансового помощника

Микросервис на FastAPI, реализующий AI-логику финансового помощника для массовой аудитории. Часть хакатон-проекта — работает независимо на порту **8001**, не пересекаясь с основным Backend (8000).

---

## Стек

| Компонент | Технология |
|-----------|-----------|
| Фреймворк | FastAPI + Uvicorn (HTTPS) |
| Граф агентов | LangGraph |
| LLM | Ollama · qwen2.5:7b-instruct-q4_K_M |
| База данных | MongoDB Atlas (pymongo) |
| Поиск | Serper / Tavily / DuckDuckGo |
| Конфигурация | `.env` + `prompts.yaml` |

---

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                    FastAPI (8001)                    │
│                                                     │
│  /ai/process ──→ LangGraph ──→ Planner              │
│  /ai/stream  ──→  (граф)   ──→ Search (если нужно) │
│                            ──→ Analyst (LLM)        │
│                                                     │
│  /ai/onboarding  ──→ OnboardingFlow ──→ MongoDB     │
│  /ai/bank-offers ──→ Scorer (детерминированный)     │
│  /ai/cashflow    ──→ Calculator (без LLM)           │
│  /ai/patterns    ──→ Calculator + LLM-инсайт        │
│  /ai/daily-action ──→ Calculator + LLM-совет        │
└─────────────────────────────────────────────────────┘
```

**Принцип:** калькуляторы считают цифры, LLM только объясняет результаты. LLM никогда не выполняет арифметику.

**Очередь:** глобальный семафор пропускает к Ollama один LLM-запрос за раз. Детерминированные эндпоинты (`/ai/bank-offers`, `/ai/cashflow/calculate`) работают вне очереди и отвечают мгновенно.

---

## Быстрый старт

### Требования

- Python 3.11+
- [Ollama](https://ollama.ai) с загруженной моделью `qwen2.5:7b-instruct-q4_K_M`
- MongoDB Atlas (опционально — без него онбординг работает в памяти)
- SSL-сертификат (файлы в `certificates/`)

### Установка

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

### Запуск

```bash
python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8001 \
  --ssl-certfile certificates/server.crt \
  --ssl-keyfile  certificates/server.key
```

Проверка: `curl -k https://localhost:8001/health`

---

## Конфигурация `.env`

```env
OLLAMA_BASE_URL=http://localhost:11434
PLANNER_MODEL=qwen2.5:7b-instruct-q4_K_M
ANALYST_MODEL=qwen2.5:7b-instruct-q4_K_M
AI_SERVICE_PORT=8001
LOG_LEVEL=INFO

# Поиск (используется в /ai/process при запросах актуальных данных)
SERPER_API_KEY=         # google.serper.dev — основной
TAVILY_API_KEY=         # app.tavily.com    — резерв

# MongoDB (без URI онбординг хранится в памяти процесса)
MONGODB_URI=mongodb+srv://...
```

Все LLM-промпты — в `app/prompts.yaml`. Меняются без перезапуска сервиса.

---

## Эндпоинты

### Основной чат

| Метод | Путь | Очередь | Время |
|-------|------|---------|-------|
| `POST` | `/ai/process` | да | 15–60 с |
| `POST` | `/ai/stream` | да | первый байт < 1 с, SSE-поток |

**Пример запроса:**
```json
POST /ai/process
{
  "user_id": "uuid",
  "query": "Стоит ли мне брать кредит на машину?",
  "context": {
    "user_profile": { "monthly_income": 150000, "monthly_debt_payments": 10000 },
    "history": []
  }
}
```

**Пример ответа:**
```json
{
  "text": "С учётом вашего дохода кредитная нагрузка составит 31.4% — жёлтая зона...",
  "table": { "headers": ["Вариант", "Платёж", "PTI"], "rows": [["...", "...", "..."]] },
  "structured": { "summary": "...", "recommendations": ["..."], "risks": ["..."] },
  "intent": "advice",
  "sources": [],
  "error": null
}
```

Поле `table` появляется по решению LLM — когда ответ выигрывает от структуры (сравнение вариантов кредита, разбивка расходов и т.п.). В остальных случаях — `null`.

### Онбординг

Девятишаговый диалог (3 фазы: личность → образ жизни → финансы), который формирует `UserFinancialProfile`. Профиль сохраняется в MongoDB и используется для персонализации чата.

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/ai/onboarding` | Один шаг диалога |
| `GET` | `/ai/onboarding/{user_id}/status` | Статус и готовый профиль |

**Фазы:**
```
Фаза 1 — ЛИЧНОСТЬ    (2–3 вопроса): интересы, образ жизни → доверие
Фаза 2 — ОБРАЗ ЖИЗНИ (3–4 вопроса): кафе, подписки, транспорт → косвенные траты
Фаза 3 — ФИНАНСЫ     (4–5 вопросов): доход, расходы, кредиты, цели → профиль
```

**Пример шага:**
```json
POST /ai/onboarding
{ "user_id": "uuid", "message": "Работаю разработчиком, увлекаюсь спортом" }

→ {
    "question": "Как часто ходишь в кафе или рестораны?",
    "suggested_answers": ["Редко", "Пару раз в месяц", "Часто"],
    "phase": 2,
    "complete": false
  }
```

После `complete: true` забери профиль через `/status` и передавай в `context.user_profile` каждого запроса к `/ai/process`.

### Калькуляторы (без LLM)

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/ai/cashflow/calculate` | Кэшфлоу по балансу и дням до зарплаты |
| `GET` | `/ai/cashflow/{user_id}` | То же, но баланс берётся из профиля |
| `GET` | `/ai/patterns/{user_id}` | Паттерн трат + LLM-инсайт |
| `GET` | `/ai/daily-action/{user_id}` | Персональный совет на сегодня |

**Кэшфлоу** возвращает поднёвной прогноз баланса до зарплаты с выделением рисковых событий:

```json
POST /ai/cashflow/calculate
{ "user_id": "uuid", "current_balance": 15000, "days_to_salary": 18 }

→ {
    "projected_balance": -9000.0,
    "will_be_negative": true,
    "shortage": 9000.0,
    "critical_day": 12,
    "forecast": [
      { "day": 0,  "balance": 15000.0, "event": null },
      { "day": 5,  "balance": 9666.67, "event": "аренда" },
      { "day": 12, "balance": -166.67, "event": null }
    ],
    "risk_events": [{ "day": 5, "balance": 9666.67, "event": "аренда" }]
  }
```

### Подбор кредитных предложений

```
POST /ai/bank-offers
```

Детерминированный скоринг без LLM и без внешних запросов. Из базы 48 предложений 28 банков отбирает **топ-6** наиболее подходящих под запрос пользователя. Отвечает за **< 50 мс**.

**Запрос:**
```json
{
  "user_id": "uuid",
  "loan_amount": 500000,
  "loan_rate": 15.0,
  "loan_months": 24
}
```

**Ответ:**
```json
{
  "offers": [
    {
      "bank_name": "Сбербанк",
      "domain": "sber.ru",
      "rate": 14.5,
      "loan_months": 24,
      "monthly_payment": 24124.71,
      "score": 99,
      "logo_url": "https://img.logo.dev/sber.ru?token=free",
      "offer_url": "https://sber.ru/credits/consumer"
    }
  ],
  "search_query": "кредит 500000 ₽ на 24 мес. под 15.0% годовых"
}
```

**Как считается score:**
```
score = max(0, 1 − |offer.rate − loan_rate| / loan_rate)   × 40   ← ставка  (40%)
      + max(0, 1 − |offer.months − loan_months| / loan_months) × 60   ← срок (60%)
```
Предложение с точным совпадением по обоим параметрам → `score = 100`.

**Покрытие (28 банков, 48 предложений):**

> Т-Банк · Сбербанк · Альфа-Банк · ВТБ · Газпромбанк · Россельхозбанк · МТС Банк · Почта Банк · Совкомбанк · Росбанк · Уралсиб · Промсвязьбанк · Ренессанс Кредит · МКБ · ОТП Банк · Ак Барс Банк · Банк БСПБ · Абсолют Банк · Хоум Банк · УБРиР · Банк Зенит · СКБ-Банк · Банк ДОМ.РФ · РНКБ Банк · Русский Стандарт · Кредит Европа · Синара Банк · Экспобанк · Банк Авангард · Металлинвестбанк · Кубань Кредит · СДМ-Банк · Банк Центр-Инвест · Левобережный Банк · Инбанк · АТБ

---

## Структура проекта

```
ai-service/
├── app/
│   ├── main.py           # FastAPI-приложение, все эндпоинты, middleware логирования
│   ├── schemas.py         # Pydantic-модели запросов/ответов
│   ├── graph.py           # LangGraph: Planner → Search → Analyst
│   ├── llm.py             # OllamaClient с retry-логикой
│   ├── onboarding.py      # Трёхфазный онбординг-диалог
│   ├── calculators.py     # PTI, аннуитет, индексы здоровья, кэшфлоу
│   ├── bank_offers.py     # База 48 офферов + детерминированный скоринг
│   ├── patterns.py        # Анализ паттернов трат
│   ├── daily_action.py    # Ежедневный персональный совет
│   ├── connectors.py      # Serper → Tavily → DuckDuckGo
│   ├── database.py        # MongoDB: сессии онбординга и профили
│   ├── queue.py           # Глобальный семафор для Ollama
│   └── prompts.yaml       # Все LLM-промпты
├── docs/
│   └── backend-contract.md   # Полный API-контракт для Backend
├── certificates/
│   ├── server.crt
│   └── server.key
├── .env
├── requirements.txt
└── README.md
```

---

## Калькуляторы

### PTI (Payment-to-Income)
```
PTI = ежемесячные_платежи / доход × 100%

Зелёный  PTI < 30%   — нагрузка в норме
Жёлтый   30% ≤ PTI < 50% — повышенная нагрузка
Красный  PTI ≥ 50%   — критическая нагрузка
```

### Аннуитетный платёж
```
P = S × r(1+r)^n / ((1+r)^n − 1)

S = сумма кредита
r = годовая_ставка / 12 / 100
n = срок в месяцах
```

### Индекс финансового здоровья (0–100)
```
expense_score  = f(расходы / доход)       → 0 / 10 / 20 / 33
debt_score     = f(долги / доход)          → 0 / 10 / 20 / 33
savings_score  = f(накопления / месяцев)   → 0 / 10 / 20 / 34

Уровни: critical (0–40) · medium (41–65) · good (66–85) · excellent (86–100)
```

---

## Логирование

Middleware логирует входной и выходной JSON каждого запроса:

```
2026-05-30 19:33:40 [INFO] app.main: [IN] POST /ai/bank-offers
{
  "user_id": "alex",
  "loan_amount": 500000,
  "loan_rate": 15.0,
  "loan_months": 24
}

2026-05-30 19:33:40 [INFO] app.main: [OUT] POST /ai/bank-offers
{
  "offers": [...],
  "search_query": "кредит 500000 ₽ на 24 мес. под 15.0% годовых"
}
```

SSE-стрим (`/ai/stream`) — логируется только входной JSON (тело ответа нельзя буферизовать без потери стриминга).

---

## Коды ответов

Большинство эндпоинтов **всегда возвращают HTTP 200**. Ошибки передаются через поле `error` в теле ответа — никогда через HTTP 500.

Исключение — `POST /ai/cashflow/calculate` возвращает HTTP 422 если онбординг не пройден.

Подробный контракт со всеми полями, примерами и таймаутами — в [`docs/backend-contract.md`](docs/backend-contract.md).
