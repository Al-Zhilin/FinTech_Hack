# HackathonBack — Backend API

FastAPI-бэкенд для FinTech-приложения: финансовый AI-ассистент с онбордингом и чатом. Написан на Python 3.12+, хранит данные в MongoDB Atlas, общается с внешним AI-сервисом по HTTPS.

## Стек технологий

| Технология | Назначение |
|---|---|
| **FastAPI** | Веб-фреймворк, автодокументация (Swagger/ReDoc) |
| **Uvicorn** | ASGI-сервер |
| **Motor** | Async-драйвер для MongoDB |
| **httpx** | Async HTTP-клиент для запросов к AI-сервису |
| **Pydantic Settings** | Конфигурация через `.env` |
| **MongoDB Atlas** | Облачная БД (`FinTechHack`) |

## Быстрый старт

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # заполнить переменные
uvicorn app.main:app --reload
```

API-документация: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger) и [http://localhost:8000/redoc](http://localhost:8000/redoc)

## Структура проекта

```
app/
├── main.py                    # Точка входа: приложение, CORS, lifespan
├── core/
│   ├── config.py              # Все настройки из .env
│   └── database.py            # Подключение к MongoDB, создание индексов
├── api/
│   └── v1/
│       ├── router.py          # Агрегирует все роутеры
│       └── endpoints/
│           ├── health.py      # GET /health
│           ├── ai.py          # GET /ai/health
│           ├── chat.py        # POST /chat/message, /chat/stream
│           └── onboarding.py  # POST /onboarding/step, /onboarding/stream
└── schemas/
    ├── chat.py                # ChatRequest, ChatResponse, AIStructured
    └── onboarding.py          # OnboardingRequest, OnboardingResponse
```

## База данных MongoDB

### Коллекция `users`

```json
{
  "login": "string (unique)",
  "ai_user_id": "UUID (автогенерация)",
  "profile": {
    "monthly_income": null,
    "monthly_expenses": null,
    "monthly_debt_payments": null,
    "savings": null,
    "financial_goal_amount": null,
    "goals": [],
    "financial_literacy": null
  },
  "onboarding_complete": false,
  "created_at": "datetime UTC"
}
```

Индекс: `login` (unique)

### Коллекция `messages`

```json
{
  "login": "string",
  "role": "user | assistant",
  "content": "string",
  "created_at": "datetime UTC"
}
```

Индекс: составной `(login, created_at DESC)`

## Эндпоинты

### `GET /api/v1/health`

Проверка работоспособности самого бэкенда.

**Response:**
```json
{ "status": "ok", "version": "0.1.0", "timestamp": "2026-05-30T..." }
```

---

### `GET /api/v1/ai/health`

Проверка доступности внешнего AI-сервиса. Ожидает от него `{ "status": "ok", "ollama": "up" }`.

**Response:** `200 { "message": "ok, ai is available" }` или `502` если AI недоступен.

---

### `POST /api/v1/chat/message`

Отправка сообщения в чат, получение ответа AI одним блоком.

**Поток выполнения:**
1. Получить/создать пользователя в MongoDB (+ UUID для AI-сервиса)
2. Загрузить последние 10 сообщений истории
3. Сохранить сообщение пользователя в `messages`
4. POST к AI-сервису: `{AI_SERVICE_URL}/ai/process`
5. Сохранить ответ AI в `messages`
6. Вернуть ответ клиенту

**Request:**
```json
{ "login": "user123", "message": "Как мне накопить на квартиру?" }
```

**Payload к AI-сервису:**
```json
{
  "user_id": "<UUID>",
  "query": "Как мне накопить на квартиру?",
  "context": { "user_profile": { "...профиль..." } },
  "mode": "chat",
  "history": [ "...10 последних сообщений..." ]
}
```

**Response:**
```json
{
  "text": "Текст ответа",
  "structured": {
    "summary": "...",
    "recommendations": ["..."],
    "risks": ["..."]
  },
  "sources": [],
  "intent": "question",
  "error": null
}
```

---

### `POST /api/v1/chat/stream`

То же, что `/chat/message`, но ответ передаётся через **Server-Sent Events (SSE)**.

- Media type: `text/event-stream`
- Каждое событие: `data: {...json...}\n\n`
- Полный ответ сохраняется в MongoDB после завершения стрима
- Таймауты: connect=10s, read=без ограничения, write=10s

---

### `POST /api/v1/onboarding/step`

Один шаг финансового онбординга. AI задаёт вопросы для построения профиля пользователя.

**Поток выполнения:**
1. Получить/создать пользователя
2. Загрузить историю сообщений
3. Сохранить сообщение пользователя
4. POST к AI-сервису: `{AI_SERVICE_URL}/ai/onboarding`
5. Если AI вернул `complete: true` — GET статус/профиль с `{AI_SERVICE_URL}/ai/onboarding/{uuid}/status`, сохранить профиль, выставить `onboarding_complete = true`
6. Вернуть ответ

**Request:**
```json
{ "login": "user123", "message": "Моя зарплата 80 000 рублей" }
```

**Response:**
```json
{
  "question": "Следующий вопрос от AI",
  "phase": 2,
  "complete": false,
  "profile_summary": null,
  "error": null
}
```

Когда `complete: true` — профиль пользователя записан в MongoDB.

---

### `POST /api/v1/onboarding/stream`

SSE-версия онбординга. Порядок событий в стриме:

1. `event: status` — сразу при старте (сигнал что запрос принят)
2. `event: result` — JSON с ответом AI после его получения

## Конфигурация (`.env`)

| Переменная | По умолчанию | Описание |
|---|---|---|
| `PROJECT_NAME` | `HackathonBack` | Название в Swagger |
| `VERSION` | `0.1.0` | Версия API |
| `DEBUG` | `false` | Debug-режим |
| `ALLOWED_ORIGINS` | `["http://localhost:3000"]` | CORS |
| `AI_SERVICE_URL` | `http://localhost:8001` | URL внешнего AI-сервиса |
| `CA_CERT_PATH` | `certs/ca.crt` | Путь к CA-сертификату для TLS |
| `AI_SSL_VERIFY` | `false` | Проверять ли SSL AI-сервиса |
| `MONGODB_URI` | `mongodb://localhost:27017` | URI MongoDB |
| `MONGODB_DB_NAME` | `hackathon` | Имя базы данных |

## Архитектура взаимодействия

```
Фронтенд (localhost:3000)
        │
        │ HTTP / SSE
        ▼
FastAPI Backend (localhost:8000)
        │
        ├─► MongoDB Atlas ─── хранение пользователей и сообщений
        │
        └─► AI-сервис (внешний хост)
                ├── POST /ai/process                   ← чат
                ├── POST /ai/onboarding                ← онбординг
                └── GET  /ai/onboarding/{id}/status    ← финальный профиль
```

## Ключевые технические особенности

- **Async I/O везде** — Motor + httpx, нет блокирующих операций
- **Пользователь создаётся автоматически** при первом обращении по `login`
- **UUID для AI-сервиса** генерируется один раз и хранится в профиле — AI-сервис ведёт свою сессию по нему
- **История чата** — передаётся в AI последние 10 сообщений при каждом запросе
- **Профиль строится постепенно** — AI сам решает когда онбординг завершён (`complete: true`)
- **SSE-стриминг** — оба ключевых потока (чат и онбординг) имеют streaming-версии
- **SSL** — поддерживает кастомный CA-сертификат для self-hosted AI-сервиса
