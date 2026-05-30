# API-контракт AI-сервиса

Документ для Backend-разработчика. Всё что нужно для интеграции.

---

## 1. Базовый URL

```
https://localhost:8001         # локальная разработка
https://95.31.220.62:8001      # продакшн
```

Сервис работает только по **HTTPS** (самоподписанный сертификат `certificates/server.crt`).  
При первом обращении браузер/клиент выдаст предупреждение — добавьте сертификат в доверенные или отключите проверку SSL в dev-окружении (`verify=False` / `--insecure`).

---

## 2. Очередь запросов

Сервис пропускает к Ollama **один запрос за раз** через глобальный семафор.

**Используют очередь** (вызывают LLM):
`/ai/process`, `/ai/stream`, `/ai/onboarding`, `/ai/daily-action/{user_id}`, `/ai/cashflow/{user_id}`, `/ai/patterns/{user_id}`

**Не используют очередь** (без LLM, отвечают мгновенно):
`/ai/cashflow/calculate`, `/ai/onboarding/{user_id}/status`, `/health`, `/ai/queue/status`

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
  "table": {
    "headers": ["Вариант", "Платёж/мес", "Переплата", "Нагрузка PTI"],
    "rows": [
      ["Текущий кредит", "10 082 ₽", "41 961 ₽", "31.4%"],
      ["Меньшая сумма (−30%)", "7 057 ₽", "29 373 ₽", "24.8%"]
    ]
  },
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

**Ответ — без таблицы (200):**
```json
{
  "text": "Ваш индекс финансового здоровья — 53 из 100...",
  "table": null,
  "structured": { "summary": "...", "recommendations": [], "risks": [] },
  "sources": [],
  "intent": "analysis",
  "error": null
}
```

**Ответ — ошибка (200):**
```json
{
  "text": "Произошла ошибка при обработке запроса. Попробуйте ещё раз.",
  "table": null,
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
| `table` | object \| null | Таблица если LLM решил что она нужна (см. ниже) |
| `table.headers` | array[string] | Заголовки столбцов |
| `table.rows` | array[array[string]] | Строки таблицы, все ячейки — строки |
| `structured.summary` | string \| — | Краткое резюме |
| `structured.recommendations` | array[string] \| — | Список рекомендаций |
| `structured.risks` | array[string] \| — | Список рисков |
| `structured.calculator_result` | object \| — | Результаты калькуляторов (раздел 5) |
| `sources` | array[string] | Ссылки (только при веб-поиске) |
| `intent` | string | `"action"` \| `"casual"` \| `"analysis"` \| `"advice"` \| `"question"` |
| `error` | string \| null | null если всё ок |

`table` появляется по решению LLM — когда ответ выигрывает от структуры: финансовый план, разбивка расходов, сравнение вариантов кредита. В остальных случаях `null`. Если LLM вернул невалидный JSON внутри тега — `table = null`, текст остаётся без изменений.

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
data: {"text": "...", "table": null, "structured": {...}, "sources": [...], "intent": "advice", "error": null}
```

**Статусы и когда появляются:**

| `status` | Когда |
|----------|-------|
| `"queued"` | Всегда, немедленно при подключении |
| `"processing"` | Когда запрос дошёл до начала очереди |
| `"searching"` | Только если запрос требует веб-поиска |
| `"analyzing"` | Перед вызовом LLM-аналитика |

`event: result` — финальное событие. Структура `data` идентична ответу `/ai/process` (включая поле `table`).

**Пример на Python:**
```python
import httpx

with httpx.stream("POST", "https://localhost:8001/ai/stream", verify=False, json={
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
  "suggested_answers": [
    "Редко, в основном готовлю дома",
    "Пару раз в месяц",
    "Часто, почти каждую неделю"
  ],
  "phase": 2,
  "complete": false,
  "profile_summary": null
}
```

**Ответ — онбординг завершён (200):**
```json
{
  "question": null,
  "suggested_answers": [],
  "phase": 3,
  "complete": true,
  "profile_summary": "Отлично, я тебя понял! Доход ~180 000 ₽/мес. Цель: финансовая подушка. Теперь я смогу давать персональные советы."
}
```

**Ответ — ошибка LLM (200):**
```json
{
  "question": "Расскажите немного о себе — чем занимаетесь?",
  "suggested_answers": ["Работаю в офисе", "Фриланс или своё дело", "Учусь"],
  "phase": 1,
  "complete": false,
  "profile_summary": null,
  "error": "Ollama timeout"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `question` | string \| null | Следующий вопрос. `null` когда `complete=true` |
| `suggested_answers` | array[string] | 2–3 готовых варианта ответа для быстрых кнопок. Пустой массив при `complete=true` |
| `phase` | int | 1 = личность, 2 = образ жизни, 3 = финансы |
| `complete` | bool | `true` — профиль сохранён |
| `profile_summary` | string \| null | Текстовое резюме при `complete=true` |

`suggested_answers` — подсказки для UI (quick-reply кнопки). Пользователь может выбрать один из вариантов или написать свой ответ свободным текстом — оба сценария обрабатываются одинаково.

---

### GET /ai/daily-action/{user_id}

Персональная карточка-совет на сегодня. Категория определяется детерминированно по `user_id + дата` — каждый день новая, у разных пользователей разная последовательность. Использует очередь.

**Запрос:** без тела.

**Ответ (200) — единый контракт во всех случаях:**
```json
{
  "action": "Переведите 6 000 ₽ на накопления прямо сейчас",
  "category": "накопления",
  "impact": "+6 000 ₽ к цели — через 50 месяцев достигнете квартиры"
}
```

**Ответ — ошибка (200):**
```json
{
  "action": "Пройдите онбординг",
  "category": "",
  "impact": "Получите персональный анализ финансов",
  "error": "..."
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `action` | string | Конкретное действие прямо сейчас |
| `category` | string | Категория на сегодня (на русском) |
| `impact` | string | Польза от действия, по возможности с цифрой |

**Категории (значения поля `category`):**

| Значение | Калькулятор | Доп. условие |
|----------|-------------|--------------|
| `"накопления"` | `savings_plan` | нужен `monthly_income` |
| `"денежный поток"` | `cashflow_forecast` | нужен `monthly_income` + `current_balance` в профиле |
| `"долги"` | `financial_health_score` | нужен `monthly_income` |
| `"цель"` | `savings_plan` | нужен `monthly_income` + `financial_goal` |
| `"здоровье"` | `financial_health_score` | нужен `monthly_income` |

Если условие не выполнено — возвращается generic-текст без вызова LLM. Контракт ответа не меняется.

---

### POST /ai/cashflow/calculate

Рассчитать кэшфлоу по текущему балансу и дням до зарплаты. Остальные данные (расходы, платежи) берутся из профиля онбординга. **Не использует очередь** — без LLM, только калькулятор.

**Тело запроса:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "current_balance": 15000.0,
  "days_to_salary": 18
}
```

| Поле | Тип | Обязательное |
|------|-----|--------------|
| `user_id` | string | да |
| `current_balance` | float | да |
| `days_to_salary` | int | да |

**Ответ — успех (200):** структура идентична `GET /ai/cashflow/{user_id}` (см. ниже).

**Ошибки:**
```json
{"detail": "Профиль не найден"}          // HTTP 404
{"detail": "Сначала пройдите онбординг"} // HTTP 422 — нет monthly_expenses_estimate в профиле
```

---

### GET /ai/cashflow/{user_id}

Детальный прогноз денежного потока до зарплаты с поднёвной разбивкой. Использует очередь.

Требует в профиле: `current_balance`, желательно `monthly_expenses_estimate`, `days_to_salary`, `fixed_payments`.

**Ответ — успех (200):**
```json
{
  "projected_balance": -9000.0,
  "will_be_negative": true,
  "shortage": 9000.0,
  "days_to_salary": 18,
  "daily_avg_spend": 833.33,
  "danger_day": 12,
  "verdict": "Денег не хватит до зарплаты — дефицит 9 000 ₽. Закончатся примерно через 12 дн.",
  "daily_burn": 833.33,
  "forecast": [
    {"day": 0, "balance": 15000.0, "event": null},
    {"day": 1, "balance": 14166.67, "event": null},
    {"day": 5, "balance": 9666.67, "event": "аренда"},
    {"day": 12, "balance": -166.67, "event": null}
  ],
  "risk_events": [
    {"day": 5, "balance": 9666.67, "event": "аренда"}
  ],
  "critical_day": 12
}
```

**Ответ — нет профиля или баланса (200):**
```json
{"error": "Профиль не найден"}
{"error": "Нет данных о текущем балансе"}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `projected_balance` | float | Остаток к дате зарплаты |
| `will_be_negative` | bool | Уйдёт ли в минус |
| `shortage` | float | Нехватка в рублях (0 если хватает) |
| `danger_day` | int \| null | День когда кончатся деньги (базовый алгоритм) |
| `daily_burn` | float | `(monthly_expenses − fixed_total) / 30` — дневные переменные траты |
| `forecast` | array | Поднёвной прогноз `{day, balance, event}` от дня 0 до `days_to_salary` |
| `risk_events` | array | Только записи где `event != null` |
| `critical_day` | int \| null | Первый день когда `balance < 0` по поднёвному прогнозу |

`fixed_payments` вычитаются как разовые списания в свой день (`days_from_now`), а не через `daily_burn`.

---

### GET /ai/patterns/{user_id}

Анализ паттернов трат. Детерминированная логика + LLM-инсайт. Использует очередь.

**Ответ — успех (200):**
```json
{
  "pattern_label": "долговая нагрузка",
  "expense_ratio": 0.72,
  "debt_ratio": 0.35,
  "free_ratio": 0.0,
  "top_category": "housing",
  "insight": "Долговая нагрузка занимает 35% дохода — это выше безопасного порога в 30%. Приоритет: погасить самый дорогой кредит.",
  "breakdown": {"housing": 25000.0, "subscriptions": 1500.0, "debt": 15000.0}
}
```

**Ответ — нет профиля или дохода (200):**
```json
{
  "pattern_label": null,
  "expense_ratio": null,
  "debt_ratio": null,
  "free_ratio": null,
  "top_category": null,
  "insight": "Пройдите онбординг для анализа паттернов трат.",
  "breakdown": {}
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `pattern_label` | string \| null | `"живёт в ноль"` \| `"долговая нагрузка"` \| `"накопитель"` \| `"базовый баланс"` |
| `expense_ratio` | float \| null | `monthly_expenses_estimate / monthly_income` |
| `debt_ratio` | float \| null | `monthly_debt_payments / monthly_income` |
| `free_ratio` | float \| null | `max(1 − expense_ratio − debt_ratio, 0)` |
| `top_category` | string \| null | Категория с наибольшей суммой в `breakdown` |
| `insight` | string | LLM plain text (1-2 предложения) или fallback |
| `breakdown` | object | Суммы по категориям `fixed_payments` |

**Правила `pattern_label` (первое подходящее):**

| Условие | Метка |
|---------|-------|
| `free_ratio < 0.05` | `"живёт в ноль"` |
| `debt_ratio > 0.30` | `"долговая нагрузка"` |
| `savings / income > 3` | `"накопитель"` |
| иначе | `"базовый баланс"` |

**Категории `breakdown` (по ключевым словам в поле `name` у `fixed_payments`):**

| Ключевые слова | Категория |
|----------------|-----------|
| аренда, ипотека, квартира | `housing` |
| подписка, spotify, netflix, кино, музыка | `subscriptions` |
| кредит, займ, долг, рассрочка | `debt` |
| интернет, телефон, связь | `utilities` |
| всё остальное | `other` |

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
| `current_balance` | float \| null | Остаток на счёте (руб). Нужен для `cashflow_forecast` |
| `days_to_salary` | int \| null | Дней до зарплаты. Нужен для `cashflow_forecast` |
| `fixed_payments` | array \| null | Список `{"amount": float, "days_from_now": int, "name": "аренда"}`. `name` используется в `/ai/patterns` для категоризации |
| `goals` | array[string] | Финансовые цели. Первый элемент → `savings_plan` |
| `portfolio` | object | Инвестпортфель (произвольный JSON) |
| `risk_tolerance` | `"low"` \| `"medium"` \| `"high"` \| null | Риск-профиль |

Все поля опциональны. Пустой `{}` — ответ без персонализации, `calculator_result` не появится.

---

## 5. Структура calculator_result

Появляется в `structured.calculator_result` при `intent` = `"analysis"` или `"advice"` и наличии `monthly_income`. Все ключи независимы — каждый появляется по своим условиям.

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

### cashflow — прогноз до зарплаты

Условие: запрос содержит слова `хватит / до зарплаты / остаток / сколько осталось / дотяну / не хватает / баланс` и в профиле есть `current_balance`.

```json
{
  "projected_balance": -24000.0,
  "will_be_negative": true,
  "shortage": 24000.0,
  "days_to_salary": 18,
  "daily_avg_spend": 2000.0,
  "danger_day": 10,
  "verdict": "Денег не хватит до зарплаты — дефицит 24 000 ₽. Закончатся примерно через 10 дн."
}
```

| Поле | Описание |
|------|----------|
| `projected_balance` | Остаток к дате зарплаты (может быть отрицательным) |
| `will_be_negative` | `true` если денег не хватит |
| `shortage` | Нехватка в рублях (0 если `will_be_negative=false`) |
| `days_to_salary` | Дней до зарплаты из профиля |
| `daily_avg_spend` | Средние траты в день (`monthly_expenses / 30`) |
| `danger_day` | Через сколько дней закончатся деньги. `null` если хватает |
| `verdict` | Текстовый вердикт на русском |

`fixed_payments` из `user_profile` вычитаются если `days_from_now ≤ days_to_salary`.

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
2. Показывать question + suggested_answers как quick-reply кнопки
3. Отправлять ответы пока complete=false (свободный текст или выбранный вариант)
4. При complete=true → показать profile_summary
5. GET /ai/onboarding/{user_id}/status → получить структурированный профиль
6. Сохранить профиль, использовать в context.user_profile для /ai/process
```

### Ежедневная карточка
```
GET /ai/daily-action/{user_id}
  → показать action + impact пользователю
```
Карточка меняется каждый день автоматически. Повторный вызов в тот же день вернёт то же самое.

### Кэшфлоу по актуальному балансу (рекомендуется)
```
POST /ai/cashflow/calculate {"user_id": "...", "current_balance": 15000, "days_to_salary": 18}
  → отрендерить forecast как график баланса по дням
  → выделить risk_events (дни платежей)
  → если critical_day != null — предупредить пользователя
```
Используй этот эндпоинт если хочешь передать актуальный баланс со стороны Frontend/Backend,
а не тот, что хранится в профиле.

### Детальный кэшфлоу из профиля
```
GET /ai/cashflow/{user_id}
  → то же самое, но current_balance берётся из сохранённого профиля
```

### Паттерны трат
```
GET /ai/patterns/{user_id}
  → показать pattern_label + insight
  → отрендерить breakdown как диаграмму
```

**Параллельные запросы:** не вызывай `/ai/onboarding` параллельно с одним `user_id`.

---

## 8. Коды ошибок

**Большинство эндпоинтов всегда возвращают HTTP 200.** Ошибки — через поле `error`.

| Ситуация | `error` | Что делать |
|----------|---------|------------|
| Ollama не запущена | `"Ollama timeout — model=..."` | Проверить `/health`, повторить |
| Ollama 500 | — | Автоматически 2 retry с паузой 1с |
| Ollama вернула невалидный JSON | `"Expecting value: line 1..."` | Повторить запрос |
| MongoDB недоступна | — | Онбординг через in-memory, данные теряются при перезапуске |
| LLM вернул невалидный JSON таблицы | — | `table = null`, текст ответа без изменений |

**Исключения — эндпоинты с HTTP-кодами ошибок:**

| Эндпоинт | Код | `detail` | Причина |
|----------|-----|----------|---------|
| `POST /ai/cashflow/calculate` | 404 | `"Профиль не найден"` | Онбординг не пройден |
| `POST /ai/cashflow/calculate` | 422 | `"Сначала пройдите онбординг"` | Нет `monthly_expenses_estimate` в профиле |

**HTTP 422 (FastAPI)** — невалидное тело запроса:
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
| `GET /ai/daily-action/{id}` | **5–20 с** + время ожидания в очереди; < 1 с если нет профиля | 60 с |
| `POST /ai/cashflow/calculate` | < 1 с (без LLM, без очереди) | 10 с |
| `GET /ai/cashflow/{id}` | < 1 с (без LLM) | 10 с |
| `GET /ai/patterns/{id}` | **5–15 с** + время ожидания в очереди; < 1 с если нет профиля | 60 с |

**Важно:** `/ai/process` и `/ai/onboarding` блокируют друг друга через очередь. Если фронт отправил `/ai/process`, то следующий `/ai/onboarding` встанет в очередь. Для интерактивного UI предпочитай `/ai/stream` — пользователь видит прогресс, а не зависший экран.

**Порт:** `8001`. Не конфликтует с основным Backend на `8000`.
