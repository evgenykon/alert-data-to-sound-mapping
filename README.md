# Alert Data → Sound Mapping

A browser-based sonification tool for live alerts from the Vera C. Rubin Observatory (LSST).
Web Audio API + Vue 3 + D3.js + Kafka.

Transforms a stream of astronomical alerts into real-time multi-channel spatial audio. The user hears the cosmos: frequency depends on redshift, volume on flash brightness, timbre on object type, and panning on sky coordinates.

## Architecture

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
  │   Aitoff proj.   │                    │  (or built-in       │
  │   + tooltips     │                    │   generator)        │
  └──────────────────┘                    └─────────────────────┘
```

## Data-to-Sound Mapping

| Astronomical param | Audio param | Transformation |
|---|---|---|
| RA / Dec | `PannerNode.positionX/Y/Z` | 3D sky scene, spatial audio |
| Magnitude | `GainNode.gain` | Brightness → volume (log scale) |
| Object type | `OscillatorNode.type` | Sine=pulsar, Saw=supernova, Square=AGN |
| Redshift (z) | `OscillatorNode.frequency` | `f = 220 × 2^(z+1)` (Doppler shift) |
| Rise time | `linearRampToValueAtTime` | Sound attack envelope |
| Duration | Fixed 300ms | — |

### Sound Palettes

- **Scientific** — waveform by object type, pitch by redshift
- **Musical** — pentatonic scale, all sine waves
- **Xenomorphic** — harsh square waves, alien feel
- **Minimal** — simple clicks, constant pitch
- **Cinematic** — dramatic sounds with long attacks

## Quick Start

```bash
# Everything at once (backend + frontend dev):
make dev

# Backend only:
make dev-backend

# Frontend only (dev with hot-reload):
make dev-frontend

# Production build:
make build
make run
```

### Open in browser

After `make dev`:
- **Frontend**: http://localhost:3001/alert-data-to-sound-mapping/
- **Backend WebSocket**: ws://localhost:3000

## Project Structure

```
alert-data-to-sound-mapping/
├── frontend/                    # Vue 3 + Vite + Tailwind CSS 4
│   ├── src/
│   │   ├── components/          # Vue components
│   │   │   ├── StarMap.vue           # D3.js Aitoff sky map
│   │   │   ├── TransportControls.vue # Play, mode, event counter
│   │   │   ├── StrategySelector.vue  # Sonification strategies
│   │   │   ├── PaletteSelector.vue   # Sound palette picker
│   │   │   ├── ClassFilter.vue       # Filter by object type
│   │   │   ├── EventLog.vue          # Event log panel
│   │   │   └── ConnectionStatus.vue  # Connection status indicator
│   │   ├── composables/         # Vue composables
│   │   │   ├── useAudioEngine.ts     # Web Audio API core
│   │   │   ├── useAlertStore.ts      # Alert state management
│   │   │   ├── useSonification.ts    # Mapping & strategy logic
│   │   │   └── useWebSocket.ts       # WS client + demo fallback
│   │   ├── utils/
│   │   │   ├── mapping.ts            # Astro → Audio param conversion
│   │   │   ├── projections.ts        # Aitoff projection math
│   │   │   ├── demoGenerator.ts      # Pseudo-alert generator
│   │   │   └── constellations.ts     # Constellation lookup (IAU)
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
│   │   ├── generator.ts         # Demo alert generator
│   │   └── types.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml           # Local dev stack
├── Makefile
├── AGENTS.md                    # Project rules (Russian)
└── docs/plan.md                 # Architecture document
```

## Services (Docker)

| Service | Image | Port | Depends on |
|---|---|---|---|
| `backend` | `oven/bun` | 3000 | — |
| `frontend-dev` | `node:24-alpine` | 3001 | backend |
| `frontend` | nginx:alpine | 80 | backend |

**Data flow in dev mode:**
```
backend (built-in demo generator) → WebSocket → frontend
```

## Sonification Strategies

| Strategy | Description |
|---|---|
| **Aggregate** | Groups nearby events into composite sounds |
| **Score Filter** | Only events above configurable score threshold |
| **Sampling** | Plays every Nth event |
| **Grains** | Each event = short grain (30ms), dense texture |
| **Rate Limit** | Max K sounds/sec, rare events get priority |

## Deployment

### Hugging Face Space

```bash
# Configure remote (one time):
make deploy-setup
# → git remote add hf https://huggingface.co/spaces/<username>/<spacename>

# Deploy:
make deploy
# → git push hf main
```

### GitHub Pages

```bash
make frontend    # builds static site to frontend/dist
# deploy dist/ to GitHub Pages
```

Environment variables for LSST Kafka (set via Secrets in HF Space):
- `KAFKA_BROKER`
- `KAFKA_TOPIC`
- `KAFKA_USER`
- `KAFKA_PASS`

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| Sky Map | D3.js (Aitoff projection) |
| Audio | Web Audio API |
| Backend | Bun + TypeScript |
| Kafka client | KafkaJS |
| WebSocket | ws |
| Hosting | GitHub Pages + HF Spaces |
| CI/CD | Docker + Makefile |
