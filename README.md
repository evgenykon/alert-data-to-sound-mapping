# Alert Data → Sound Mapping

Браузерный сонификатор «живых» алертов Обсерватории им. Веры Рубин (LSST).
Web Audio API + Vue 3 + D3.js + Kafka.

Превращает поток астрономических алертов в многоканальный пространственный звук в реальном времени. Учёный слышит космос: частота зависит от красного смещения, громкость — от мощности вспышки, тембр — от типа объекта, а панорама — от координат на небе.

## Архитектура

```
GitHub Pages (SPA)                    Hugging Face Space (Docker)
─────────────────────                 ────────────────────────────

  Vue 3 + Vite                          Node.js (Bun) + KafkaJS
  Web Audio API                          WebSocket (ws)
  D3.js (Aitoff projection)
  Tailwind CSS 4

  ┌──────────────────┐                 ┌──────────────────────┐
  │   Audio Engine    │                 │   Kafka Consumer     │
  │   Web Audio API   │                 │   (Avro → JSON)      │
  │   OscillatorNode  │                 │                      │
  │   GainNode        │◄──── WebSocket ──── WebSocket Server   │
  │   PannerNode      │                 │   broadcast          │
  │   AudioParam.ramp │                 └──────────────────────┘
  └──────────────────┘                              │
                                                    │
  ┌──────────────────┐                    ┌──────────┴──────────┐
  │   StarMap (D3)   │                    │  LSST Kafka         │
  │   Aitoff proj.   │                    │  (или генератор     │
  │   + tooltips     │                    │   если недоступен)  │
  └──────────────────┘                    └─────────────────────┘
```

## Data-to-Sound Mapping

| Астро-параметр | Audio-параметр | Преобразование |
|---|---|---|
| RA / Dec | `PannerNode.positionX/Y/Z` | Пространственная сцена неба |
| Magnitude | `GainNode.gain` | Яркость → громкость (логарифм) |
| Тип объекта | `OscillatorNode.type` | Sine=пульсар, Saw=сверхновая, Square=AGN |
| Redshift (z) | `OscillatorNode.frequency` | `f = 220 × 2^(z+1)` (эффект Доплера) |
| Время нарастания | `linearRampToValueAtTime` | Атака звука |
| Длительность | Фиксированная 300ms | — |

### Палитры звуков

- **Scientific** — форма волны по типу объекта, частота по z
- **Musical** — пентатоническая гамма, все синусы
- **Xenomorphic** — агрессивные square-волны
- **Minimal** — простые щелчки, постоянная высота
- **Cinematic** — драматичные звуки с длинной атакой

## Быстрый старт

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

### Открыть в браузере

После `make dev`:
- **Фронтенд**: http://localhost:3001/alert-data-to-sound-mapping/
- **Backend WebSocket**: ws://localhost:3000

## Структура проекта

```
alert-data-to-sound-mapping/
├── frontend/                    # Vue 3 + Vite + Tailwind CSS 4
│   ├── src/
│   │   ├── components/          # Vue-компоненты
│   │   │   ├── StarMap.vue          # D3.js Aitoff карта
│   │   │   ├── TransportControls.vue # Play, mode, event counter
│   │   │   ├── StrategySelector.vue  # Стратегии сонификации
│   │   │   ├── PaletteSelector.vue   # Выбор палитры звуков
│   │   │   ├── ClassFilter.vue       # Фильтр по типам объектов
│   │   │   ├── EventLog.vue          # Лог событий
│   │   │   └── ConnectionStatus.vue  # Статус подключения
│   │   ├── composables/         # Vue composables
│   │   │   ├── useAudioEngine.ts     # Web Audio API
│   │   │   ├── useAlertStore.ts      # Состояние алертов
│   │   │   ├── useSonification.ts    # Логика маппинга
│   │   │   └── useWebSocket.ts       # WS + demo fallback
│   │   ├── utils/
│   │   │   ├── mapping.ts            # Astro → Audio params
│   │   │   ├── projections.ts        # Aitoff projection
│   │   │   ├── demoGenerator.ts      # Псевдо-алерты
│   │   │   └── constellations.ts     # Определение созвездий
│   │   ├── types/alert.ts
│   │   ├── main.ts
│   │   ├── App.vue
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.ts
│   └── Dockerfile
├── backend/                     # Node.js (Bun) + KafkaJS
│   ├── src/
│   │   ├── index.ts             # Entry point
│   │   ├── consumer.ts          # KafkaJS consumer
│   │   ├── server.ts            # WebSocket server
│   │   ├── generator.ts         # Demo-алерты
│   │   └── types.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Local dev stack
├── Makefile
├── AGENTS.md                    # Правила проекта
└── docs/plan.md                 # Архитектурный документ
```

## Сервисы (Docker)

| Сервис | Образ | Порт | Зависимости |
|---|---|---|---|
| `backend` | `oven/bun` | 3000 | — |
| `frontend-dev` | `node:24-alpine` | 3001 | backend |
| `frontend` | nginx:alpine | 80 | backend |

**Поток данных в dev:**
```
backend (встроенный генератор) → WebSocket → frontend
```

## Стратегии сонификации

| Стратегия | Описание |
|---|---|
| **Aggregate** | Группировка событий в кластеры → один композитный звук |
| **Score Filter** | Только алерты с вероятностью > threshold |
| **Sampling** | Каждый N-й алерт |
| **Grains** | Каждый алерт = короткий гран (30ms), массив → текстура |
| **Rate Limit** | Макс K звуков/сек, редкие события с приоритетом |

## Деплой

### Hugging Face Space

```bash
# Настроить remote (один раз):
make deploy-setup
# → git remote add hf https://huggingface.co/spaces/<username>/<spacename>

# Деплой:
make deploy
# → git push hf main
```

### GitHub Pages

```bash
make frontend    # сборка статики в frontend/dist
# залить dist/ на GitHub Pages
```

Переменные окружения для LSST Kafka (задаются через Secrets в HF Space):
- `KAFKA_BROKER`
- `KAFKA_TOPIC`
- `KAFKA_USER`
- `KAFKA_PASS`

## Технологии

| Слой | Технология |
|---|---|
| Фронтенд | Vue 3 + Vite + TypeScript |
| Стили | Tailwind CSS 4 |
| Карта неба | D3.js (Aitoff) |
| Аудио | Web Audio API |
| Бэкенд | Bun + TypeScript |
| Kafka | KafkaJS |
| WebSocket | ws |
| Хостинг | GitHub Pages + HF Spaces |
| CI/CD | Docker + Makefile |
