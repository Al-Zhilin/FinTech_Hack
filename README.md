# HackathonBack — Backend API

FastAPI-бэкенд PWA приложения. Принимает запросы от фронтенда, управляет данными пользователей в MongoDB и проксирует запросы к внешнему AI-сервису с кешированием ответов.

---

## Стек технологий

| Технология | Версия | Назначение |
|---|---|---|
| **Python** | 3.12+ | Язык |
| **FastAPI** | ≥ 0.115 | Веб-фреймворк, Swagger/ReDoc |
| **Uvicorn** | ≥ 0.32 | ASGI-сервер |
| **Motor** | ≥ 3.6 | Async-драйвер MongoDB |
| **httpx** | ≥ 0.28 | Async HTTP-клиент для AI-сервиса |
| **Pydantic Settings** | ≥ 2.6 | Конфигурация через `.env` |
| **MongoDB Atlas** | — | Облачная база данных |

---

## Быстрый старт

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env    # заполнить переменные
uvicorn app.main:app --reload
```

| Интерфейс | URL |
|---|---|
| Swagger UI | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Базовый путь API | http://localhost:8000/api/v1 |

---

## Конфигурация (`.env`)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PROJECT_NAME` | `HackathonBack` | Название в Swagger |
| `VERSION` | `0.1.0` | Версия API |
| `DEBUG` | `false` | Debug-режим |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | CORS |
| `AI_SERVICE_URL` | `http://localhost:8001` | URL внешнего AI-сервиса |
| `CA_CERT_PATH` | `certs/ca.crt` | Путь к CA-сертификату |
| `AI_SSL_VERIFY` | `false` | Проверка SSL AI-сервиса |
| `MONGODB_URI` | `mongodb://localhost:27017` | URI MongoDB |
| `MONGODB_DB_NAME` | `hackathon` | Имя базы данных |

---

## Архитектура

```
Фронтенд  ──HTTP/SSE──►  FastAPI Backend (:8000)
                              │
                    ┌─────────┴──────────┐
                    │                    │
              MongoDB Atlas          AI-сервис (:8001, HTTPS)
              ┌──────────┐          ┌────────────────────────┐
              │ users    │          │ POST /ai/process       │
              │ messages │          │ POST /ai/stream        │
              │ ai_cache │          │ POST /ai/onboarding    │
              └──────────┘          │ GET  /ai/daily-action  │
                                    │ GET  /ai/cashflow      │
                                    │ GET  /ai/patterns      │
                                    │ POST /ai/bank-offers   │
                                    │ POST /ai/cashflow/calc │
                                    └────────────────────────┘
```

**Поток запроса:** `main.py` → `api/v1/router.py` → `endpoints/<модуль>.py`

---

## Структура проекта

```
app/
├── main.py                        # FastAPI app, CORS, lifespan, запуск планировщика
├── core/
│   ├── config.py                  # Настройки через pydantic-settings
│   ├── database.py                # Подключение к MongoDB, создание индексов
│   ├── cache.py                   # Чтение/запись кеша AI-ответов в ai_cache
│   ├── scheduler.py               # Фоновое обновление кеша (старт + раз в час)
│   └── fallbacks.py               # Математический расчёт кешфлоу без AI
├── api/
│   └── v1/
│       ├── router.py              # Агрегирует все роутеры
│       └── endpoints/
│           ├── health.py          # GET /health
│           ├── ai.py              # AI-эндпоинты (daily-action, cashflow, patterns, bank-offers)
│           ├── chat.py            # POST /chat/message, /chat/stream
│           └── onboarding.py      # POST /onboarding/step, /onboarding/stream
└── schemas/
    ├── chat.py                    # ChatRequest, ChatResponse
    ├── onboarding.py              # OnboardingRequest, OnboardingResponse
    ├── cashflow.py                # CashflowCalculateRequest, CashflowResponse
    ├── patterns.py                # PatternsResponse
    ├── daily_action.py            # DailyActionResponse
    └── bank_offers.py             # BankOffersRequest, BankOffersResponse
```

---

## База данных

### Коллекция `users`

```json
{
  "login": "user@example.com",
  "profile": {
    "monthly_income": 120000.0,
    "monthly_expenses": 80000.0,
    "monthly_debt_payments": 10000.0,
    "savings": 200000.0,
    "financial_goal_amount": 500000.0,
    "goals": ["накопить на квартиру"],
    "financial_literacy": "medium"
  },
  "onboarding_complete": true,
  "created_at": "2026-05-30T10:00:00Z"
}
```

Индексы: `login` (unique)

### Коллекция `messages`

```json
{
  "login": "user@example.com",
  "role": "user | assistant",
  "content": "Текст сообщения",
  "created_at": "2026-05-30T10:00:00Z"
}
```

Индексы: составной `(login, created_at DESC)`

### Коллекция `ai_cache`

```json
{
  "user_id": "user@example.com",
  "endpoint": "daily_action | patterns | cashflow | bank_offers",
  "response": { "...ответ AI-сервиса..." },
  "cached_at": "2026-05-30T10:00:00Z"
}
```

Индексы: составной уникальный `(user_id, endpoint)`

---

## Система кеширования

При каждом **успешном** ответе от AI-сервиса бэкенд сохраняет его в `ai_cache`. При недоступности AI-сервиса — отдаёт кешированный ответ вместо ошибки.

**Фоновый планировщик** (`scheduler.py`) запускается вместе с приложением:
- через 5 секунд после старта обходит всех пользователей и обновляет кеш
- затем повторяет каждый час

**Триггер после онбординга** — как только пользователь завершает онбординг, его `daily-action` и `patterns` обновляются немедленно (не ждут часового цикла).

| Эндпоинт | Кеш | При недоступности AI |
|---|---|---|
| `daily-action`, `patterns`, `cashflow`, `bank-offers` | Сохраняется | Кеш → при пустом кеше: 503 |
| `cashflow/calculate` | — | Математический расчёт по входным данным |
| `chat`, `onboarding` | — | 503 / SSE `event: error` |

---

## API Reference

### `GET /api/v1/health`

Проверка работоспособности бэкенда.

```json
{ "status": "ok", "version": "0.1.0", "timestamp": "2026-05-30T10:00:00Z" }
```

---

### `GET /api/v1/ai/health`

Проверка доступности AI-сервиса, Ollama и Mongo на удаленном AI сервере.

```json
{ "message": "ok, ai is available" }
```

Возвращает `502` если AI-сервис недоступен или Ollama не запущена.

---

### `GET /api/v1/ai/queue/status`

Состояние очереди AI-сервиса.

```json
{ "queue_size": 2, "processing": true }
```

---

### `GET /api/v1/ai/daily-action/{login}`

Персональная карточка-совет на сегодня. Меняется раз в сутки, детерминирована по пользователю.

```json
{
  "action": "Переведите 6 000 ₽ на накопления прямо сейчас",
  "category": "накопления",
  "impact": "+6 000 ₽ к цели — через 50 месяцев достигнете квартиры",
  "error": null
}
```

---

### `GET /api/v1/ai/cashflow/{login}`

Детальный прогноз денежного потока до зарплаты (поднёвной). Данные берутся из профиля пользователя.

```json
{
  "projected_balance": -9000.0,
  "will_be_negative": true,
  "shortage": 9000.0,
  "days_to_salary": 18,
  "daily_avg_spend": 833.33,
  "danger_day": 12,
  "verdict": "Денег не хватит до зарплаты — дефицит 9 000 ₽",
  "daily_burn": 833.33,
  "forecast": [{ "day": 0, "balance": 15000.0, "event": null }],
  "risk_events": [],
  "critical_day": 12
}
```

---

### `POST /api/v1/ai/cashflow/calculate`

Расчёт кешфлоу по актуальному балансу (без LLM, только математика). При недоступности AI — возвращает собственный расчёт.

**Request:**
```json
{ "user_id": "user@example.com", "current_balance": 15000.0, "days_to_salary": 18 }
```

**Response:** аналогичен `GET /ai/cashflow/{login}`.

Ошибки: `422` если онбординг не пройден.

---

### `GET /api/v1/ai/patterns/{login}`

Анализ паттернов трат пользователя.

```json
{
  "pattern_label": "долговая нагрузка",
  "expense_ratio": 0.72,
  "debt_ratio": 0.35,
  "free_ratio": 0.0,
  "top_category": "housing",
  "insight": "Долговая нагрузка занимает 35% дохода — выше безопасного порога в 30%.",
  "breakdown": { "housing": 25000.0, "debt": 15000.0 }
}
```

---

### `POST /api/v1/ai/bank-offers`

Подбор банковских предложений по кредиту через Tavily-поиск + LLM-парсинг. Офферы отсортированы по `score` (0–100).

**Request:**
```json
{
  "user_id": "user@example.com",
  "loan_amount": 500000,
  "loan_rate": 12.5,
  "loan_months": 24
}
```

**Response:**
```json
{
  "offers": [
    {
      "bank_name": "Сбербанк",
      "domain": "sber.ru",
      "rate": 12.5,
      "loan_months": 24,
      "monthly_payment": 23549.12,
      "score": 100.0,
      "logo_url": "https://img.logo.dev/sber.ru?token=free",
      "offer_url": "https://sber.ru/credits/consumer"
    }
  ],
  "search_query": "банк кредит наличными ставка 500000 рублей 24 месяцев"
}
```

---

### `POST /api/v1/chat/message`

Синхронный чат с AI-ассистентом. История последних 10 сообщений автоматически передаётся в контексте.

**Request:**
```json
{ "login": "user@example.com", "message": "Стоит ли мне брать кредит на машину?" }
```

**Response:**
```json
{
  "text": "С учётом ваших данных кредитная нагрузка составит 31.4%...",
  "table": {
    "headers": ["Вариант", "Платёж/мес", "Переплата"],
    "rows": [["Текущий кредит", "10 082 ₽", "41 961 ₽"]]
  },
  "structured": {
    "summary": "Нагрузка повышенная.",
    "recommendations": ["Рассмотрите меньшую сумму"],
    "risks": ["Рост долга при потере дохода"],
    "calculator_result": {}
  },
  "sources": [],
  "intent": "advice",
  "error": null
}
```

---

### `POST /api/v1/chat/stream`

Стриминговый чат через **Server-Sent Events**. Позволяет показывать прогресс в реальном времени.

`Content-Type: text/event-stream`

```
event: status
data: {"status": "queued", "message": "Запрос принят..."}

event: status
data: {"status": "analyzing", "message": "Анализирую данные..."}

event: result
data: {"text": "...", "table": null, "structured": {...}, "intent": "advice", "error": null}
```

При ошибке подключения к AI:
```
event: error
data: {"error": "Нет соединения с AI-сервером"}
```

---

### `POST /api/v1/onboarding/step`

Один шаг диалогового онбординга (всего ~9 вопросов, 3 фазы). AI строит финансовый профиль пользователя.

**Request:**
```json
{ "login": "user@example.com", "message": "Работаю в найме, доход 120 000 ₽" }
```

**Response — диалог продолжается:**
```json
{
  "question": "Как часто ходишь в кафе или рестораны?",
  "suggested_answers": ["Редко", "Пару раз в месяц", "Часто"],
  "phase": 2,
  "complete": false,
  "profile_summary": null
}
```

**Response — онбординг завершён:**
```json
{
  "question": null,
  "suggested_answers": [],
  "phase": 3,
  "complete": true,
  "profile_summary": "Доход ~120 000 ₽/мес. Цель: накопить на квартиру."
}
```

При `complete: true` профиль сохраняется в MongoDB и немедленно прогревается кеш AI-данных пользователя.

---

### `POST /api/v1/onboarding/stream`

SSE-версия онбординга.

```
event: status
data: {"status": "processing", "message": "Обрабатываем ответ..."}

event: result
data: {"question": "...", "suggested_answers": [...], "phase": 1, "complete": false}
```

---

## Ключевые технические решения

**Идентификация пользователей** — в качестве `user_id` везде используется `login` (строка от фронтенда). Никаких внутренних UUID.

**Санация профиля** — перед отправкой в AI-сервис числовые поля профиля (`monthly_income`, `savings` и др.) принудительно приводятся к `float | null`. Защита от некорректных данных, которые AI онбординг-сервис может вернуть в виде строк.

**История чата** — последние 10 сообщений передаются в каждый запрос к `/ai/process` и `/ai/stream` в формате `[{"role": "user|assistant", "text": "..."}]`.

**Обработка ошибок** — сетевые ошибки (`ConnectError`, `ReadTimeout` и т.д.) возвращают `503`. Ошибки протокола/статуса (`HTTPStatusError`) — `502`. Кешированный ответ используется прозрачно, без индикации фолбэка клиенту.

**SSL** — поддерживается кастомный CA-сертификат (`CA_CERT_PATH`) для self-hosted AI-сервиса. В dev-режиме проверка отключается (`AI_SSL_VERIFY=false`).

**Async I/O везде** — Motor + httpx, нет блокирующих операций. Фоновый планировщик кеша запускается через `asyncio.create_task` в lifespan.
