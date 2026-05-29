# AI Service

FastAPI-микросервис финансового помощника. Порт **8001**, протокол **HTTPS**.

## Запуск

```bash
cd ai-service

# HTTPS (продакшн и локальная разработка)
uvicorn app.main:app --host 0.0.0.0 --port 8001 \
  --ssl-keyfile certificates/server.key \
  --ssl-certfile certificates/server.crt

# Или через start.py (запускает также Ollama и следит за процессами)
python start.py
```

## Проверка

```bash
curl -k https://localhost:8001/health
```

## Переменные окружения

Скопируй `.env.example` → `.env` и заполни:

| Переменная | Описание |
|---|---|
| `OLLAMA_BASE_URL` | URL Ollama, по умолчанию `http://localhost:11434` |
| `PLANNER_MODEL` | Модель планировщика |
| `ANALYST_MODEL` | Модель аналитика |
| `MONGODB_URI` | MongoDB Atlas connection string |

## Сертификаты

Лежат в `certificates/server.key` и `certificates/server.crt`.
Самоподписанные — используй флаг `-k` в curl или настрой доверие на клиенте.
