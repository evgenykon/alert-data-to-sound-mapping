# Alert Types

## Type Definition

Система оперирует 18 типами астрономических объектов, объединённых в тип `AlertType`:

```ts
export type AlertType =
  | 'RR Lyrae' | 'Cepheid' | 'Mira' | 'LPV' | 'AGN' | 'QSO'
  | 'SN Ia' | 'SN Ib' | 'SN Ic' | 'SN II' | 'Kilonova' | 'TDE'
  | 'VS' | 'ORPHAN' | 'CV' | 'EB' | 'YSO' | 'Unknown'
```

См. `frontend/src/types/alert.ts:1-4` и `backend/src/types.ts:1-4`.

## Категории

| Категория | Типы | Описание |
|---|---|---|
| Пульсирующие переменные | `RR Lyrae`, `Cepheid` | Звёзды с регулярными пульсациями |
| Долгопериодические переменные | `Mira`, `LPV` | Медленные пульсации (сотни дней) |
| Активные ядра галактик | `AGN`, `QSO` | Сверхмассивные чёрные дыры |
| Сверхновые | `SN Ia`, `SN Ib`, `SN Ic`, `SN II` | Взрывы звёзд |
| Редкие транзиенты | `Kilonova`, `TDE` | Слияния нейтронных звёзд / приливные разрушения |
| Прочие | `VS`, `ORPHAN`, `CV`, `EB`, `YSO` | Переменные звёзды, катаклизмические, затменные двойные, молодые объекты |
| Запасной | `Unknown` | Неизвестный / нераспознанный тип |

## Alert Interface

```ts
export interface Alert {
  alertId: string     // уникальный идентификатор
  ra: number          // прямое восхождение (градусы, 0–360)
  dec: number         // склонение (градусы, –90…+90)
  magnitude: number   // видимая звёздная величина
  type: AlertType     // один из 18 типов
  redshift: number    // красное смещение
  riseTime: number    // время нарастания (сек)
  score: number       // оценка приоритета (0–1)
  timestamp: number   // Unix epoch (сек)
}
```

См. `frontend/src/types/alert.ts:6-9` и `backend/src/types.ts:6-16`.

## AlertState

Расширяет `Alert` для внутреннего состояния на фронтенде:

```ts
export interface AlertState extends Alert {
  status: AlertStatus    // 'sounding' | 'decaying'
  opacity: number        // 0–1
  receivedAt: number     // когда получен (Unix ms)
}
```

См. `frontend/src/types/alert.ts:11-15`.

## Метаданные типов

| Тип | Цвет | Эмодзи | Волна (Scientific) | Вес демо | Вероятность демо |
|---|---|---|---|---|---|
| `RR Lyrae` | `#facc15` 🟡 | 🔴 | sine | 300 | 30.0% |
| `Cepheid` | `#fde047` 🟡 | 🟡 | sine | 50 | 5.0% |
| `Mira` | `#fb923c` 🟠 | 🟠 | triangle | 150 | 15.0% |
| `LPV` | `#fdba74` 🟠 | 🟠 | triangle | 50 | 5.0% |
| `AGN` | `#60a5fa` 🔵 | 🔵 | square | 200 | 20.0% |
| `QSO` | `#93c5fd` 🔵 | 🔵 | square | 50 | 5.0% |
| `SN Ia` | `#f87171` 🔴 | 💥 | sawtooth | 60 | 6.0% |
| `SN Ib` | `#f87171` 🔴 | 💥 | sawtooth | 8 | 0.8% |
| `SN Ic` | `#f87171` 🔴 | 💥 | sawtooth | 12 | 1.2% |
| `SN II` | `#fca5a5` 🔴 | 💥 | sawtooth | 45 | 4.5% |
| `Kilonova` | `#c084fc` 🟣 | ⭐ | sawtooth | 0.5 | 0.05% |
| `TDE` | `#f472b6` 🩷 | 💜 | sawtooth | 1 | 0.1% |
| `VS` | `#6ee7b7` 🟢 | 🟢 | sine (default) | — | — |
| `ORPHAN` | `#a78bfa` 🟣 | 🟣 | sine (default) | — | — |
| `CV` | `#fbbf24` 🟡 | 🟡 | sine (default) | — | — |
| `EB` | `#34d399` 🟢 | 🟢 | sine (default) | — | — |
| `YSO` | `#fb923c` 🟠 | 🟠 | sine (default) | — | — |
| `Unknown` | `#9ca3af` ⚪ | ⚪ | sine (default) | 73.5 | 7.35% |

Источники:
- Цвета: `frontend/src/components/StarMap.vue:27-33`, `frontend/src/components/AlertDetailCard.vue:44-50`
- Эмодзи: `frontend/src/components/EventLog.vue:16-21`
- Волна Scientific: `frontend/src/utils/mapping.ts:6-10`
- Веса: `backend/src/sources/demo.ts:3-17`, `frontend/src/utils/demoGenerator.ts:3-9`

### Примечания

- `VS`, `ORPHAN`, `CV`, `EB`, `YSO` не включены в демо-генератор и не появятся в демо-режиме. Они ожидаются только от реальных источников (Lasair, LSST Kafka, Fink).
- `Kilonova` и `TDE` считаются редкими (`RARE_TYPES` в `frontend/src/utils/mapping.ts:4`) — для них действует повышенный приоритет в очереди сонификации и специальные волны в палитрах `xenomorphic` и `cinematic`.
- Все нераспознанные типы нормализуются в `Unknown` при валидации (`backend/src/sources/kafka.ts:11`, `frontend/src/composables/useSonification.ts:44`).

## Sound Palette Mappings

Система поддерживает 8 звуковых палитр (см. `frontend/src/utils/mapping.ts:22-58`). Для каждой палитры определены: тип волны, функция частоты (от redshift), функция громкости (от magnitude), функция атаки (от riseTime) и опционально фильтр.

| Палитра | Волна по умолчанию | Частота | Описание |
|---|---|---|---|
| `scientific` | По типу (см. выше) | `220 × 2^(z+1)` | Научная — форма волны по типу объекта |
| `musical` | sine | Пентатоника | Музыкальная — все синусом по пентатонике |
| `xenomorphic` | square (кроме Kilonova/TDE → sawtooth) | `60 + z × 400` | Агрессивная, «чужеродная» |
| `minimal` | sine | 440 Hz | Минималистичная — щелчки |
| `cinematic` | triangle (кроме Kilonova/TDE → sawtooth) | `110 × 1.5^(z+1)` | Кинематографичная, длинные атаки |
| `ethereal` | sine | Натуральный строй | Эфирная — пентатоника с фильтром |
| `tuned` | triangle | 12-ТЕТ | Равномерно темперированная |
| `subterranean` | sine | 80–280 Hz | Глубокий низкий бас |

## Адаптеры источников

### Lasair (`backend/src/sources/lasair.ts:30`)

Тип извлекается из полей пакета в порядке приоритета:
```
predicted classification → classification → type → 'Unknown'
```

### Fink (`backend/src/sources/fink.ts:5-13`)

SIMBAD-класс маппится на внутренний тип:
```ts
SN*              → SN Ia
AGN / Blazar / QSO → AGN
RR*              → RR Lyrae
Cepheid / Cep*   → Cepheid
Mira / AGB / LPV → Mira
*                → Unknown
```

### Kafka / Валидация (`backend/src/sources/kafka.ts:4-11`)

Все входящие типы проверяются против KNOWN_TYPES. Неизвестные → `Unknown`.

## Demo Generator

В демо-режиме алерты генерируются с пуассоновским интервалом (λ = 2 с) и случайными всплесками (5% шанс, 5–15 алертов за 100 мс).

Распределение параметров:
- **RA**: uniform 0–360°
- **Dec**: `asin(2·random - 1)` (равномерно по сфере)
- **Magnitude**: normal(μ=16, σ=2), clamped 12–22
- **Redshift**: uniform 0–1
- **riseTime**: normal(μ=0.5, σ=0.3), minimum 0.01
- **score**: beta(α=2, β=5)
- **Type**: weighted random (см. таблицу выше)
