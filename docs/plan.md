# Alert Data → Sound Mapping

Браузерный сонификатор «живых» алертов Обсерватории им. Веры Рубин (LSST).
Web Audio API + Vue/Nuxt + D3.js + Kafka.

---

## 1. Архитектура системы

```
┌─────────────────────────────────────────────────────────────────────┐
│              GitHub Pages (Vue + Nuxt + Tailwind)                    │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────────────────┐              │
│  │    UI Layer       │  │       Audio Engine           │              │
│  │                   │  │  ┌───────────────────────┐  │              │
│  │  TransportControls│──│─│  Web Audio API         │  │              │
│  │  StrategySelector │  │  │  - OscillatorNode     │  │              │
│  │  ClassFilter      │  │  │  - GainNode            │  │              │
│  │  ConnectionStatus │  │  │  - PannerNode          │  │              │
│  │                   │  │  │  - BiquadFilterNode    │  │              │
│  └────────┬──────────┘  │  │  - AudioParam.ramp     │  │              │
│           │             │  └───────────────────────┘  │              │
│  ┌────────┴──────────┐  │                             │              │
│  │    StarMap         │  │  ┌───────────────────────┐  │              │
│  │  (D3.js Aitoff)    │  │  │  useSonification      │  │              │
│  │  + tooltip/hover   │  │  │  (mapping + strategy) │  │              │
│  └────────┬──────────┘  │  └───────────────────────┘  │              │
│           │             │                             │              │
│  ┌────────┴──────────┐  └─────────────────────────────┘              │
│  │    EventLog        │                                              │
│  │  (last 100,       │                                              │
│  │   auto-scroll)    │                                              │
│  └────────┬──────────┘                                              │
│           │                                                          │
│  ┌────────┴──────────┐                                              │
│  │  useAlertStore    │  (reactive state, 60s fade)                  │
│  │  + useWebSocket   │  (live WS / demo auto-fallback)              │
│  └───────────────────┘                                              │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ wss://evgenykon-xxx.hf.space
                               │ JSON (Avro deserialized)
┌──────────────────────────────▼───────────────────────────────────────┐
│              Hugging Face Space (Docker)                              │
│                                                                       │
│  ┌──────────────────┐  ┌─────────────────────────────┐               │
│  │  WebSocket       │  │  KafkaJS Consumer            │               │
│  │  Server (ws)     │◄─│  (Avro → JSON)              │               │
│  │  broadcast       │  │                              │               │
│  └──────────────────┘  └──────────────┬──────────────┘               │
│                                        │                              │
│                              ┌─────────┴─────────┐                    │
│                              │  LSST Kafka        │                    │
│                              │  (alert-stream)    │                    │
│                              └───────────────────┘                    │
│                                        │                              │
│                              ┌─────────┴─────────┐                    │
│                              │  Generator         │                    │
│                              │  (fallback demo    │                    │
│                              │   если Kafka off)  │                    │
│                              └───────────────────┘                    │
└───────────────────────────────────────────────────────────────────────┘
```

## 2. Взаимодействие Frontend ↔ Backend

```
GitHub Pages                          Hugging Face Space
─────────────────                     ─────────────────
                                          │
  │  ── wss://connection ───────────────►│
  │                                       │
  │  ◄── JSON: {alertId, ra, dec, ...} ──│  broadcast всем клиентам
  │                                       │
  │  Если таймаут 5s / ошибка:            │
  │  ┌─ reconnect ×3 (exponential backoff)│
  │  ├─ всё ещё offline →                  │
  │  └─ switch to Demo (local генератор)  │
```

**Формат сообщения:**
```json
{
  "alertId": "lsst2024abc123",
  "ra": 12.345,
  "dec": -45.678,
  "magnitude": 18.5,
  "type": "SN Ia",
  "redshift": 0.35,
  "riseTime": 2.3,
  "score": 0.92,
  "timestamp": 1718000000
}
```

## 3. Data-to-Sound Mapping

| Астро-параметр | Audio-параметр | Преобразование | Обоснование |
|---|---|---|---|
| RA / Dec | `PannerNode.positionX/Y/Z` | `x = cos(dec)·sin(ra)` `y = sin(dec)` `z = cos(dec)·cos(ra)` | Пространственная сцена неба. Учёный слышит, в какой части неба вспышка |
| Magnitude | `GainNode.gain` | `gain = 10^((magRef - mag)/20)` | Логарифм шкалы звёздных величин → линейная громкость |
| Класс объекта | `OscillatorNode.type` | `SN → sawtooth`, `RRL → sine`, `AGN → square`, `Mira → triangle`, `Kilonova → sawtooth+noise` | Форма волны = тембр, различный на слух |
| Redshift (z) | `OscillatorNode.frequency` | `f = 220 × 2^(z + 1)` | Эффект Доплера: смещение частоты по z |
| Время нарастания | `gain.linearRampToValueAtTime` | `attack = clamp(riseTime, 0, 0.3)s` | Резкий взрыв → мгновенная атака; медленная переменная → плавное нарастание |
| Длительность | Фиксированная | 300ms (кроме режима Grains: 30ms) | — |

### Карта типов → формы волны

```
RR Lyrae, Cepheid ──── sine       (плавные пульсации)
Mira, LPV ──────────── triangle   (медленные пульсации)
AGN, QSO ───────────── square     (агрессивное активное ядро)
SN Ia, SN II ───────── sawtooth   (резкий взрыв)
Kilonova, TDE ──────── saw+noise  (специальное аномальное звучание)
Unknown ────────────── sine       (умолчание)
```

## 4. Стратегии сонификации

Пользователь выбирает в UI, как справляться с плотным потоком алертов (пик ~1000/сек).

```
┌─────────────────────────────────────────────────────┐
│  Стратегия: [Aggregate ▼]                          │
│  Дополнительно: [Score≥ 0.5 ───●──] [N= └─┴─┘]    │
└─────────────────────────────────────────────────────┘
```

### Aggregate
Группировка событий по угловому расстоянию (< 5°) + временному окну (500ms). Композитный звук: средняя позиция, максимальная mag, доминирующий тип.

### Score filter
Только алерты с `score > threshold`. Ползунок 0–1 с шагом 0.1.

### Sampling
Озвучивать каждый N-й алерт. Ползунок N = 1–100.

### Grains
Каждый алерт = короткий гран (30ms). В массиве создаёт звуковую текстуру. Аномалии выделяются как резкие перепады.

### Rate-limit
Максимум K звуков/сек. Priority queue: редкие события (Kilonova, TDE) имеют приоритет перед массовыми (RR Lyrae).

## 5. Состояние алертов (useAlertStore)

```
Map<alertId, AlertState> {
  alertId: string
  ra: number
  dec: number
  magnitude: number
  type: AlertType
  redshift: number
  score: number
  timestamp: number
  status: 'sounding' | 'decaying'
  opacity: number   // для StarMap: 1.0 → 0.0 за 60+ секунд
}
```

**Жизненный цикл точки на карте:**
1. Приход алерта → `status='sounding'`, `opacity=1.0`, звук 300ms
2. Звук окончен → `status='decaying'`, opacity начинает уменьшаться
3. Через 60+ секунд после прихода → удалить из store / `opacity=0`

## 6. Demo-режим

Авто-активация при недоступности WebSocket (5s timeout + 3 retries).

Генератор псевдо-алертов (на клиенте):

- **RA**: uniform 0–360°
- **Dec**: `acos(2·random - 1) - 90` (равномерное распределение по небесной сфере)
- **Type**: взвешенное распределение
  - RR Lyrae: 30%
  - Cepheid: 20%
  - Mira/LPV: 20%
  - AGN: 10%
  - SN Ia/Ib/Ic: 10%
  - SN II: 5%
  - Kilonova: 1%
  - TDE: 1%
  - Unknown: 3%
- **Magnitude**: 12–22 (нормальное распределение, μ=16, σ=2)
- **Redshift**: 0.0–1.0
- **riseTime**: нормальное (μ=0.5, σ=0.3)
- **score**: beta-распределение (α=2, β=5) — большинство низкие
- **Интервал**: пуассоновский процесс, λ = 2s + случайные burst'ы (5–15 алертов за 1s)

## 7. UI—Компоненты (Vue + Nuxt + Tailwind)

```
┌─────────────────────────────────────────────────────────────┐
│  🎛 [▶ Play] [🔊 ──────] [Live ▼] [Strategy: Aggregate ▼]   │
│  Фильтр: [☑ SN] [☑ RRL] [☐ Mira] [☐ AGN] [☐ Kilonova]     │
│  Статус: 🟢 Live · Кол-во: 1,247 · Score: [━━●━━]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           ✦  Star Map (D3.js Aitoff projection)  ✦         │
│                                                             │
│     · ·  ·  🔴 · ·    ·  🟡 ·    ·  · · · ·               │
│     ·  ⭐ ·   ·  ·  🔵 ·  ·    ·    🔴 ·  ·               │
│                                                             │
│                   ╔═══════════════════╗                     │
│                   ║  SN 2024abc       ║  ← тултип при      │
│                   ║  RA 12.34         ║    наведении        │
│                   ║  Dec -45.67       ║                     │
│                   ║  mag 18.5  z 0.35 ║                     │
│                   ╚═══════════════════╝                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Event Log (последние 50):                                  │
│  12:34:05  🔴 SN 2024abc   12.3  -45.2  18.5  0.35  30s    │
│  12:34:03  🟡 RRL 1234     56.7  +12.0  15.2  0.00  28s    │
│  12:34:01  🔵 AGN 5678    178.2  +23.5  14.1  0.82  26s    │
│  12:33:58  ⭐ Kilonova 9   342.1  -12.8  19.2  0.55  23s    │
└─────────────────────────────────────────────────────────────┘
```

### StarMap (D3.js)
- Проекция: **Aitoff** (вся небесная сфера, RA 0–360° → X, Dec -90–+90° → Y)
- Цвет точки = класс объекта
- Размер точки = magnitude (инвертировано: яркие → крупнее)
- Пульсирующий маркер для звучащего алерта (CSS keyframe animation)
- После звука: точка тускнеет за 60s (opacity 1 → 0)
- Hover: тултип с данными
- Click: (задел на будущее) развёрнутая карточка алерта

### EventLog
- Последние 100 алертов
- Авто-scroll к новым
- Иконка + время + тип + координаты + mag + z + время назад
- Click → подсветить точку на карте (задел)

## 8. Структура проекта

```
alert-data-to-sound-mapping/
├── frontend/                        # Vue + Nuxt + Tailwind
│   ├── app.vue
│   ├── nuxt.config.ts
│   ├── tailwind.config.js
│   ├── composables/
│   │   ├── useAudioEngine.ts        # Web Audio API core
│   │   ├── useWebSocket.ts          # WS + auto-demo fallback
│   │   ├── useSonification.ts       # Mapping + strategy logic
│   │   └── useAlertStore.ts         # Reactive state (60s fade)
│   ├── components/
│   │   ├── TransportControls.vue
│   │   ├── StrategySelector.vue
│   │   ├── ClassFilter.vue
│   │   ├── ConnectionStatus.vue
│   │   ├── StarMap.vue              # D3.js Aitoff
│   │   └── EventLog.vue
│   ├── pages/
│   │   └── index.vue
│   ├── utils/
│   │   ├── mapping.ts               # astro → audio params
│   │   ├── projections.ts           # RA/Dec → canvas XY
│   │   └── demoGenerator.ts         # псевдо-алерты
│   └── types/
│       └── alert.ts                 # TypeScript types
├── backend/                         # Node.js + TypeScript
│   ├── Dockerfile                   # multistage alpine
│   ├── docker-compose.yml           # backend + ZK + Kafka
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                 # entry: Kafka → ws broadcast
│       ├── consumer.ts              # KafkaJS + Avro → JSON
│       ├── server.ts                # ws server
│       ├── generator.ts             # demo-алерты (если Kafka off)
│       └── types.ts
├── Makefile
├── docs/
│   └── plan.md                     # ← this file
└── README.md
```

## 9. Makefile

```makefile
.PHONY: dev build run stop logs deploy lint frontend

dev:        docker compose up -d              # Local Kafka + backend
build:      docker build -t alert-backend backend/  # Prod image
run:        docker run -p 3000:3000 alert-backend
stop:       docker compose down
logs:       docker compose logs -f
deploy:     git push space main               # HF Spaces deploy
lint:       cd frontend && npx eslint . && npx tsc --noEmit
            cd backend && npx eslint . && npx tsc --noEmit
frontend:   cd frontend && npm run generate   # Static for GH Pages
```

## 10. Docker (backend)

```dockerfile
# Dockerfile (multistage)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```yaml
# docker-compose.yml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:latest
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
  kafka:
    image: confluentinc/cp-kafka:latest
    depends_on: [zookeeper]
    ports: [9092:9092]
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
  backend:
    build: .
    ports: [3000:3000]
    depends_on: [kafka]
    environment:
      KAFKA_BROKER: kafka:9092
```

## 11. Технический стек (сводка)

| Слой | Технология |
|---|---|
| Фронтенд-фреймворк | Vue 3 + Nuxt 3 |
| Стили | Tailwind CSS 4 |
| Карта неба | D3.js (Aitoff projection) |
| Аудио | Web Audio API (нативный) |
| Сборка фронтенда | Vite (через Nuxt) |
| Хостинг фронтенда | GitHub Pages |
| Бэкенд | Node.js 20 TypeScript |
| Kafka клиент | KafkaJS |
| WebSocket | ws |
| Avro | avsc |
| Хостинг бэкенда | Hugging Face Spaces (Docker) |
| Локальная разработка | Docker Compose |
| CI/CD | Makefile + HF git push |

## 12. Поток данных (end-to-end)

```
LSST Kafka
    │
    ▼
KafkaJS Consumer (Avro deserialization)
    │
    │  {ra, dec, mag, type, z, riseTime, score}
    ▼
WebSocket Broadcast (JSON)
    │
    ▼
GitHub Pages SPA (useWebSocket.ts)
    │
    ├── useAlertStore.ts (сохранение, 60s fade)
    │   ├── StarMap.vue (рендер на canvas)
    │   └── EventLog.vue (лог-таблица)
    │
    └── useSonification.ts (mapping)
        │
        ├── выбор стратегии (aggregate/score/sample/grain/ratelimit)
        ├── queue менеджмент (приоритеты, rate limit)
        │
        └── useAudioEngine.ts
            ├── OscillatorNode (type + frequency)
            ├── GainNode (magnitude → gain)
            ├── PannerNode (RA/Dec → XYZ)
            └── AudioParam.ramp (riseTime → attack)
                │
                ▼
            AudioContext.destination
                │
                ▼
            🔊 наушники / динамики
```

## 13. Этапы реализации

| Этап | Что делаем | Результат |
|---|---|---|
| 1 | Инициализация Nuxt + Tailwind проекта, каркас страниц | `npm run dev` показывает пустую страницу |
| 2 | `useAudioEngine.ts` — Web Audio API, sound() утилита, разные типы волн | Тестовый звук по кнопке |
| 3 | `useAlertStore.ts` — реактивное состояние, Map с таймером затухания | Точки живут 60с |
| 4 | `StarMap.vue` — D3.js Aitoff, рендер точек по store | Звёздная карта с точками |
| 5 | `useSonification.ts` — mapping, стратегии, очередь | Звук при появлении алерта |
| 6 | `TransportControls.vue`, `StrategySelector.vue`, `ClassFilter.vue` | Полный UI |
| 7 | `EventLog.vue` | Лог событий |
| 8 | `useWebSocket.ts` — WS клиент, автопереключение live/demo | Работает с бэкендом |
| 9 | Backend: KafkaJS + ws server + Dockerfile + docker-compose | Работает локально |
| 10 | CI/CD: Makefile, деплой на HF Space + GH Pages | Продакшн |
