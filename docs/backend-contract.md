# API-контракт AI-сервиса

Документ для Backend-разработчика. Всё что нужно для интеграции.

---

## 1. Базовый URL

```
http://localhost:8001        # локальная разработка
http://95.31.220.62:8001     # продакшн
```

---

## 2. Очередь запросов

Сервис пропускает к Ollama **один запрос за раз** через глобальный семафор.  
Все три "тяжёлых" эндпоинта (`/ai/process`, `/ai/stream`, `/ai/onboarding`) используют одну очередь.

Если Ollama занята — новые запросы ждут своей очереди. `/ai/stream` позволяет показать пользователю статус ожидания в реальном времени.

---

## 3. Эндпоинты

### GET /health

Проверка доступности сервиса, Ollama и MongoDB.

**Запрос:** без тела.

**Ответ (200):**
```json
{
  "status": "ok",
  "ollama": "up",
  "mongo": "up"
}
```

| Поле | Возможные значения | Описание |
|------|--------------------|----------|
| `status` | `"ok"` | Всегда `"ok"` если сервис жив |
| `ollama` | `"up"` \| `"down"` | Доступность Ollama |
| `mongo` | `"up"` \| `"down"` \| `"disabled"` | `"disabled"` если `MONGODB_URI` не задан в `.env` |

---

### POST /ai/process

Основной эндпоинт. Блокирующий — ждёт полного ответа. Использует очередь.

**Тело запроса:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "query": "Стоит ли мне брать кредит на машину?",
  "context": {
    "user_profile": {
      "age": 28,
      "occupation": "разработчик",
      "financial_literacy": "medium",
      "monthly_income": 150000.0,
      "monthly_expenses": 90000.0,
      "monthly_debt_payments": 10000.0,
      "savings": 300000.0,
      "financial_goal_amount": 500000.0,
      "goals": ["накопить на квартиру"],
      "portfolio": {},
      "risk_tolerance": "medium"
    }
  },
  "mode": "chat"
}
```

| Поле | Тип | Обязательное | По умолчанию |
|------|-----|--------------|--------------|
| `user_id` | string | да | — |
| `query` | string | да | — |
| `context` | object | нет | `{}` |
| `context.user_profile` | object | нет | все поля null/[] |
| `mode` | string | нет | `"chat"` |

**Ответ — успех (200):**
```json
{
  "text": "С учётом ваших данных кредитная нагрузка составит 31.4% — это жёлтая зона...",
  "structured": {
    "summary": "Нагрузка повышенная, брать с осторожностью.",
    "recommendations": ["Рассмотрите меньшую сумму кредита"],
    "risks": ["Рост долговой нагрузки при потере дохода"],
    "calculator_result": {
      "health": { "total_score": 53, "level": "medium", "action": "..." },
      "traffic_light": { "color": "yellow", "pti_before": 18.8, "pti_after": 31.4, "..." : "..." },
      "savings_plan": { "free_money": 15000.0, "months_to_goal": 50, "..." : "..." }
    }
  },
  "sources": [],
  "intent": "advice",
  "error": null
}
```

**Ответ — ошибка (200):**
```json
{
  "text": "Произошла ошибка при обработке запроса. Попробуйте ещё раз.",
  "structured": {},
  "sources": [],
  "intent": "question",
  "error": "Ollama timeout — model=qwen2.5:7b-instruct-q4_K_M"
}
```

**Поля ответа:**

| Поле | Тип | Описание |
|------|-----|----------|
| `text` | string | Основной текстовый ответ |
| `structured.summary` | string \| — | Краткое резюме |
| `structured.recommendations` | array[string] \| — | Список рекомендаций |
| `structured.risks` | array[string] \| — | Список рисков |
| `structured.calculator_result` | object \| — | Результаты калькуляторов (раздел 5) |
| `sources` | array[string] | Ссылки (только при веб-поиске) |
| `intent` | string | `"action"` \| `"casual"` \| `"analysis"` \| `"advice"` \| `"question"` |
| `error` | string \| null | null если всё ок |

`calculator_result` появляется только при `intent` = `"analysis"` или `"advice"` **и** наличии `monthly_income` в профиле.

---

### POST /ai/stream

Тот же результат что `/ai/process`, но через **Server-Sent Events**. Позволяет показывать прогресс в UI.

**Тело запроса:** идентично `/ai/process`.

**Ответ:** `Content-Type: text/event-stream`

Поток событий в порядке появления:

```
event: status
data: {"status": "queued", "message": "Запрос в очереди..."}

event: status
data: {"status": "processing", "message": "Запрос обрабатывается..."}

event: status
data: {"status": "searching", "message": "Ищу информацию..."}

event: status
data: {"status": "analyzing", "message": "Анализирую данные..."}

event: result
data: {"text": "...", "structured": {...}, "sources": [...], "intent": "advice", "error": null}
```

**Статусы и когда появляются:**

| `status` | Когда |
|----------|-------|
| `"queued"` | Всегда, немедленно при подключении |
| `"processing"` | Когда запрос дошёл до начала очереди |
| `"searching"` | Только если запрос требует веб-поиска |
| `"analyzing"` | Перед вызовом LLM-аналитика |

`event: result` — финальное событие. Структура `data` идентична ответу `/ai/process`.

**Пример на Python:**
```python
import httpx

with httpx.stream("POST", "http://localhost:8001/ai/stream", json={
    "user_id": "user-1",
    "query": "Как у меня дела с финансами?",
    "context": {"user_profile": {"monthly_income": 80000}}
}) as r:
    for line in r.iter_lines():
        if line.startswith("data:"):
            data = json.loads(line[5:])
            if "status" in data:
                print("Статус:", data["message"])
            elif "text" in data:
                print("Ответ:", data["text"])
```

---

### GET /ai/queue/status

Текущее состояние очереди. Можно поллить для показа позиции в очереди.

**Запрос:** без тела.

**Ответ (200):**
```json
{
  "queue_size": 2,
  "processing": true
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `queue_size` | int | Количество запросов, ожидающих в очереди |
| `processing` | bool | `true` если Ollama сейчас обрабатывает запрос |

---

### POST /ai/onboarding

Один шаг онбординг-диалога. Всего 9 вопросов (2 + 3 + 4). Использует очередь.

**Тело запроса:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Играю в теннис, смотрю аниме"
}
```

**Ответ — диалог продолжается (200):**
```json
{
  "question": "Как часто ходишь в кафе или рестораны?",
  "phase": 2,
  "complete": false,
  "profile_summary": null
}
```

**Ответ — онбординг завершён (200):**
```json
{
  "question": null,
  "phase": 3,
  "complete": true,
  "profile_summary": "Отлично, я тебя понял! Доход ~180 000 ₽/мес. Цель: финансовая подушка. Теперь я смогу давать персональные советы."
}
```

**Ответ — ошибка LLM (200):**
```json
{
  "question": "Расскажите немного о себе — чем занимаетесь?",
  "phase": 1,
  "complete": false,
  "profile_summary": null,
  "error": "Ollama timeout"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `question` | string \| null | Следующий вопрос. `null` когда `complete=true` |
| `phase` | int | 1 = личность, 2 = образ жизни, 3 = финансы |
| `complete` | bool | `true` — профиль сохранён |
| `profile_summary` | string \| null | Текстовое резюме при `complete=true` |

---

### GET /ai/onboarding/{user_id}/status

Получить статус и профиль после завершения онбординга.

**Ответ — завершён (200):**
```json
{
  "complete": true,
  "phase": 3,
  "profile": {
    "lifestyle": {
      "interests": ["спорт", "кино"],
      "subscriptions": ["Spotify", "Кинопоиск"],
      "dining_frequency": "sometimes",
      "transport": "public"
    },
    "finances": {
      "monthly_income": 180000.0,
      "monthly_expenses_estimate": 90000.0,
      "monthly_debt_payments": 15000.0,
      "has_mortgage": false,
      "has_loans": true,
      "savings": 500000.0,
      "financial_goal": "финансовая подушка",
      "financial_goal_amount": null
    },
    "meta": {
      "financial_literacy": "medium",
      "onboarding_complete": true,
      "phase": 3
    }
  }
}
```

**Ответ — не завершён (200):**
```json
{ "complete": false, "phase": 2, "profile": null }
```

---

## 4. Структура user_profile

```json
{
  "age": 28,
  "occupation": "менеджер",
  "financial_literacy": "medium",
  "monthly_income": 120000.0,
  "monthly_expenses": 80000.0,
  "monthly_debt_payments": 10000.0,
  "savings": 200000.0,
  "financial_goal_amount": 500000.0,
  "goals": ["накопить на отпуск"],
  "portfolio": {},
  "risk_tolerance": "medium"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `age` | int \| null | Возраст |
| `occupation` | string \| null | Профессия |
| `financial_literacy` | `"beginner"` \| `"medium"` \| `"advanced"` \| null | Влияет на стиль ответа AI |
| `monthly_income` | float \| null | Доход (руб). Нужен для калькуляторов |
| `monthly_expenses` | float \| null | Расходы (руб) |
| `monthly_debt_payments` | float \| null | Платежи по кредитам/ипотеке (руб) |
| `savings` | float \| null | Накопления (руб) |
| `financial_goal_amount` | float \| null | Целевая сумма (руб). Нужна для `savings_plan` |
| `goals` | array[string] | Финансовые цели. Первый элемент → `savings_plan` |
| `portfolio` | object | Инвестпортфель (произвольный JSON) |
| `risk_tolerance` | `"low"` \| `"medium"` \| `"high"` \| null | Риск-профиль |

Все поля опциональны. Пустой `{}` — ответ без персонализации, `calculator_result` не появится.

---

## 5. Структура calculator_result

Появляется в `structured.calculator_result` при `intent` = `"analysis"` или `"advice"` и наличии `monthly_income`. Все три ключа независимы — каждый появляется по своим условиям.

### health — индекс финансового здоровья

Условие: есть `monthly_income`.

```json
{
  "total_score": 53,
  "expense_score": 20,
  "debt_score": 33,
  "savings_score": 0,
  "level": "medium",
  "action": "Создайте финансовую подушку: откладывайте хотя бы 1 000–2 000 ₽ в месяц."
}
```

| Поле | Описание |
|------|----------|
| `total_score` | 0–100, сумма трёх индексов |
| `expense_score` | Расходы/доход: 0 / 10 / 20 / 33 |
| `debt_score` | Долг/доход: 0 / 10 / 20 / 33 |
| `savings_score` | Подушка в месяцах: 0 / 10 / 20 / 34 |
| `level` | `"critical"` (0–40) \| `"medium"` (41–65) \| `"good"` (66–85) \| `"excellent"` (86–100) |
| `action` | Самая острая проблема → конкретный совет |

### savings_plan — план накопления

Условие: `goals` не пустой.

```json
{
  "free_money": 15000.0,
  "recommended_monthly": 3000.0,
  "months_to_goal": 50,
  "realistic": true,
  "goal_name": "отпуск",
  "advice": "Откладывая 3 000 ₽/мес., достигнете цели «отпуск» примерно за 4 лет 2 мес.",
  "note": "Сумма цели не указана — план приблизительный"
}
```

| Поле | Описание |
|------|----------|
| `free_money` | `income − expenses − debt_payments` |
| `recommended_monthly` | 20% от `free_money` |
| `months_to_goal` | int или `null` если нет `financial_goal_amount` или `free_money ≤ 0` |
| `realistic` | `true` если `months_to_goal ≤ 60` |
| `note` | Только если `financial_goal_amount` не передан |

### traffic_light — кредитный светофор

Условие: запрос содержит слова `кредит / займ / ипотека / рассрочка` и LLM извлёк сумму из текста.

```json
{
  "color": "yellow",
  "pti_before": 18.8,
  "pti_after": 31.4,
  "monthly_payment": 10081.72,
  "total_overpayment": 41961.36,
  "monthly_income": 80000.0,
  "verdict": "Нагрузка повышенная — берите с осторожностью, есть риски."
}
```

| Поле | Описание |
|------|----------|
| `color` | `"green"` (PTI < 30%) \| `"yellow"` (30–50%) \| `"red"` (> 50%) |
| `pti_before` | Долговая нагрузка до нового кредита, % |
| `pti_after` | Долговая нагрузка с новым кредитом, % |
| `monthly_payment` | Аннуитетный платёж, руб |
| `total_overpayment` | Переплата за весь срок, руб |
| `monthly_income` | Доход из профиля или 50 000 по умолчанию |

---

## 6. Маппинг онбординг → user_profile

После `complete=true` забери профиль через `GET /ai/onboarding/{user_id}/status` и передавай в `/ai/process`:

| Из `profile.finances` | В `user_profile` |
|-----------------------|------------------|
| `monthly_income` | `monthly_income` |
| `monthly_expenses_estimate` | `monthly_expenses` |
| `monthly_debt_payments` | `monthly_debt_payments` |
| `savings` | `savings` |
| `financial_goal` | `goals[0]` |
| `financial_goal_amount` | `financial_goal_amount` |
| Из `profile.meta` | |
| `financial_literacy` | `financial_literacy` |

---

## 7. Сценарий интеграции

### Обычный чат (без стриминга)
```
POST /ai/process → ждать 15–60с → показать text
```

### Чат со стримингом (рекомендуется)
```
POST /ai/stream → SSE поток:
  "queued"     → показать "Запрос принят..."
  "processing" → показать "Обрабатываем..."
  "searching"  → показать "Ищем данные..."
  "analyzing"  → показать "Анализируем..."
  result       → показать text
```

### Онбординг
```
1. POST /ai/onboarding {"message": "Привет"} → получить первый вопрос
2. Показывать question пользователю, отправлять ответы пока complete=false
3. При complete=true → показать profile_summary
4. GET /ai/onboarding/{user_id}/status → получить структурированный профиль
5. Сохранить профиль, использовать в context.user_profile для /ai/process
```

**Параллельные запросы:** не вызывай `/ai/onboarding` параллельно с одним `user_id`.

---

## 8. Коды ошибок

**Сервис всегда возвращает HTTP 200.** Ошибки — через поле `error`.

| Ситуация | `error` | Что делать |
|----------|---------|------------|
| Ollama не запущена | `"Ollama timeout — model=..."` | Проверить `/health`, повторить |
| Ollama 500 | — | Автоматически 2 retry с паузой 1с |
| Ollama вернула невалидный JSON | `"Expecting value: line 1..."` | Повторить запрос |
| MongoDB недоступна | — | Онбординг через in-memory, данные теряются при перезапуске |

**HTTP 422** — невалидное тело запроса:
```json
{"detail": [{"type": "missing", "loc": ["body", "user_id"], "msg": "Field required"}]}
```

---

## 9. Время ответа

| Эндпоинт | Типичное время | Рекомендованный таймаут |
|----------|----------------|--------------------------|
| `GET /health` | < 1 с (до 5 с при Atlas cold start) | 10 с |
| `GET /ai/queue/status` | < 50 мс | 2 с |
| `POST /ai/process` | **15–60 с** + время ожидания в очереди | 120 с |
| `POST /ai/stream` | первый байт < 1 с, результат 15–60 с | соединение держать открытым |
| `POST /ai/onboarding` | **5–20 с** + время ожидания в очереди | 60 с |
| `GET /ai/onboarding/{id}/status` | < 1 с | 5 с |

**Важно:** `/ai/process` и `/ai/onboarding` блокируют друг друга через очередь. Если фронт отправил `/ai/process`, то следующий `/ai/onboarding` встанет в очередь. Для интерактивного UI предпочитай `/ai/stream` — пользователь видит прогресс, а не зависший экран.

**Порт:** `8001`. Не конфликтует с основным Backend на `8000`.
