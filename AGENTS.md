# Правила проекта

## Всё — через Docker

Запуск backend или frontend напрямую (вне Docker-контейнера) **запрещён**.

### Почему
- Окружение должно быть изолированным и воспроизводимым
- Hugging Face Space разворачивается через Docker

### Как запускать

```bash
# Всё сразу (backend + frontend dev):
make dev

# Только backend:
make dev-backend

# Только frontend (dev с hot-reload):
make dev-frontend

# Production сборка:
make build
make run
```

### Что запрещено

- `bun run src/index.ts` или `bun --watch src/index.ts` в `backend/`
- `npm run dev` или `bun run dev` в `frontend/`
- любые прямые запуски процессов без Docker

### Структура Docker-сервисов

```
  backend (WebSocket + встроенный генератор демо-алертов)
    │
    ├── frontend-dev (Nuxt hot-reload, через volumes)
    └── frontend (nginx, production)
```

**Локальный дев (dev профиль):**
1. `backend` запускается со встроенным генератором псевдо-алертов
2. `frontend-dev` показывает на порту 3001, подключается к backend по WebSocket

**Production профиль (HF Space):**
1. `backend` пытается подключиться к реальному LSST Kafka
2. Если LSST Kafka недоступен — включает встроенный генератор
3. `frontend` — nginx со статикой

### Сервисы

| Сервис | Образ | Порт | Зависимости |
|---|---|---|---|
| `backend` | `oven/bun` (из backend) | 3000 | — |
| `frontend-dev` | `node:24-alpine` | 3001 | backend |
| `frontend` | nginx:alpine | 80 | backend |

**Поток данных в dev:**
```
backend (встроенный генератор) → WebSocket → frontend
```

### Примечание

Для подключения к реальному LSST Kafka нужно передать переменные окружения:
- `KAFKA_BROKER`
- `KAFKA_TOPIC`
- `KAFKA_USER`
- `KAFKA_PASS`

В production на HF Space эти переменные задаются через Secrets в настройках Space.
