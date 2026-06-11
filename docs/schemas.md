# Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│              GitHub Pages (Vue + Tailwind)                           │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────────────────┐              │
│  │    UI Layer       │  │       Audio Engine           │              │
│  │  TransportControls│──│─│  Web Audio API            │              │
│  │  StrategySelector │  │  │  - OscillatorNode        │              │
│  │  ClassFilter      │  │  │  - GainNode              │              │
│  │  ConnectionStatus │  │  │  - PannerNode            │              │
│  │                   │  │  │  - BiquadFilterNode      │              │
│  └────────┬──────────┘  │  │  - AudioParam.ramp       │              │
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
                               │ JSON
┌──────────────────────────────▼───────────────────────────────────────┐
│              Hugging Face Space (Docker)                              │
│                                                                       │
│  ┌──────────────────┐  ┌─────────────────────────────┐               │
│  │  WebSocket       │  │  Source Manager              │               │
│  │  Server (ws)     │◄─│  Lasair / LSST / Demo / Fink │               │
│  │  broadcast       │  │                              │               │
│  └──────────────────┘  └──────────────┬──────────────┘               │
│                                        │                              │
│                              ┌─────────┴─────────┐                    │
│                              │  Lasair / LSST     │                    │
│                              │  Kafka (live)      │                    │
│                              └───────────────────┘                    │
│                                        │                              │
│                              ┌─────────┴─────────┐                    │
│                              │  Demo Generator    │                    │
│                              │  (fallback)        │                    │
│                              └───────────────────┘                    │
└───────────────────────────────────────────────────────────────────────┘
```

# Frontend ↔ Backend Interaction

```
GitHub Pages                          Hugging Face Space
─────────────────                     ─────────────────
                                          │
  │  ── wss://connection ───────────────►│
  │                                       │
  │  ◄── JSON: {alertId, ra, dec, ...} ──│  broadcast to all clients
  │                                       │
  │  On 5s timeout / error:               │
  │  ┌─ reconnect ×3 (exponential backoff)│
  │  ├─ still offline →                    │
  │  └─ switch to Demo (local generator)  │
```

**Message format:**
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

# Data-to-Sound Mapping

| Astro param | Audio param | Transform |
|---|---|---|
| RA / Dec | `PannerNode.positionX/Y/Z` | `x = cos(dec)·sin(ra)` `y = sin(dec)` `z = cos(dec)·cos(ra)` |
| Magnitude | `GainNode.gain` | `gain = 10^((magRef - mag)/20)` |
| Object class | `OscillatorNode.type` | `SN → sawtooth`, `RRL → sine`, `AGN → square`, `Mira → triangle`, `Kilonova → sawtooth+noise` |
| Redshift (z) | `OscillatorNode.frequency` | `f = 220 × 2^(z + 1)` |
| Rise time | `gain.linearRampToValueAtTime` | `attack = clamp(riseTime, 0, 0.3)s` |
| Duration | Fixed | 300ms (Grains: 30ms) |

**Type → waveform mapping:**
```
RR Lyrae, Cepheid ──── sine       (smooth pulsations)
Mira, LPV ──────────── triangle   (slow pulsations)
AGN, QSO ───────────── square     (aggressive active nucleus)
SN Ia, SN II ───────── sawtooth   (sharp explosion)
Kilonova, TDE ──────── saw+noise  (anomalous signature)
Unknown ────────────── sine       (default)
```

# Sonification Strategies

```
┌─────────────────────────────────────────────────────┐
│  Strategy: [Aggregate ▼]                           │
│  Extra: [Score≥ 0.5 ───●──] [N= └─┴─┘]            │
└─────────────────────────────────────────────────────┘
```

- **Aggregate** — group by angular distance (< 5°) + time window (500ms)
- **Score filter** — only alerts with `score > threshold` (0–1)
- **Sampling** — every N-th alert (N = 1–100)
- **Grains** — each alert = short grain (30ms), sound texture
- **Rate-limit** — max K sounds/sec, priority queue (rare events first)

# Alert State (useAlertStore)

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
  opacity: number
}
```

**Lifecycle:**
1. Alert arrives → `status='sounding'`, `opacity=1.0`, sound 300ms
2. Sound ends → `status='decaying'`, opacity → 0
3. After 60s → remove

# UI Components

```
┌─────────────────────────────────────────────────────────────┐
│  🎛 [▶ Play] [🔊 ──────] [Live ▼] [Strategy: Aggregate ▼]   │
│  Filter: [☑ SN] [☑ RRL] [☐ Mira] [☐ AGN] [☐ Kilonova]     │
│  Status: 🟢 Live · Count: 1,247 · Score: [━━●━━]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│           ✦  Star Map (D3.js Aitoff projection)  ✦         │
│                                                             │
│     · ·  ·  🔴 · ·    ·  🟡 ·    ·  · · · ·               │
│     ·  ⭐ ·   ·  ·  🔵 ·  ·    ·    🔴 ·  ·               │
│                                                             │
│                   ╔═══════════════════╗                     │
│                   ║  SN 2024abc       ║  ← tooltip on      │
│                   ║  RA 12.34         ║    hover           │
│                   ║  Dec -45.67       ║                     │
│                   ║  mag 18.5  z 0.35 ║                     │
│                   ╚═══════════════════╝                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Event Log (last 50):                                       │
│  12:34:05  🔴 SN 2024abc   12.3  -45.2  18.5  0.35  30s    │
│  12:34:03  🟡 RRL 1234     56.7  +12.0  15.2  0.00  28s    │
│  12:34:01  🔵 AGN 5678    178.2  +23.5  14.1  0.82  26s    │
│  12:33:58  ⭐ Kilonova 9   342.1  -12.8  19.2  0.55  23s    │
└─────────────────────────────────────────────────────────────┘
```

# Data Flow (end-to-end)

```
Lasair / LSST Kafka
    │
    ▼
KafkaJS Consumer
    │
    │  {ra, dec, mag, type, z, riseTime, score}
    ▼
WebSocket Broadcast (JSON)
    │
    ▼
SPA (useWebSocket.ts)
    │
    ├── useAlertStore.ts (60s fade)
    │   ├── StarMap.vue
    │   └── EventLog.vue
    │
    └── useSonification.ts
        │
        ├── strategy (aggregate/score/sample/grain/ratelimit)
        ├── queue manager (priority, rate limit)
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
            🔊 speakers / headphones
```

# Demo Generator (type distribution)

| Type | Weight |
|---|---|
| RR Lyrae | 300 |
| AGN | 200 |
| Mira / LPV | 200 |
| SN Ia | 60 |
| Cepheid | 50 |
| SN II | 45 |
| SN Ib/Ic | 20 |
| TDE | 1 |
| Kilonova | 0.5 |
| Bogus / artifact | 73.5 |

- **RA**: uniform 0–360°
- **Dec**: `acos(2·random - 1) - 90`
- **Magnitude**: 12–22 (normal, μ=16, σ=2)
- **Redshift**: 0.0–1.0
- **riseTime**: normal (μ=0.5, σ=0.3)
- **score**: beta distribution (α=2, β=5)
- **Interval**: Poisson process, λ = 2s + random bursts

# Implementation Stages

| Stage | Result |
|---|---|
| 1 | Vue + Tailwind scaffold |
| 2 | Web Audio API, sound() utility |
| 3 | Alert Store with decay timer |
| 4 | StarMap D3.js Aitoff |
| 5 | Mapping + strategies + queue |
| 6 | Full UI (Transport, Strategy, Filter) |
| 7 | EventLog |
| 8 | WebSocket client + auto-fallback |
| 9 | Backend: source manager + ws server + Docker |
| 10 | CI/CD: Makefile, HF Space, GH Pages |
