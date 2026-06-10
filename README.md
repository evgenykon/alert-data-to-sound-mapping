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

## Demo Generator — Realistic Alert Distribution

Alert type weights are based on published LSST and ZTF rates:

| Type | Weight | Source |
|---|---|---|
| RR Lyrae | 300 | LSST Science Book §8 — ~10M detected over 10yr |
| AGN | 200 | Ivezic+2019 — ~10M variable AGN |
| Mira / LPV | 200 | LSST Science Book — dominant in Magellanic Clouds |
| SN Ia | 60 | Fremling+2020 ZTF BTS — 60% of classified SNe |
| Cepheid | 50 | LSST Science Book §8 — classical + type II |
| SN II | 45 | Perley+2020 ZTF — core-collapse rates |
| SN Ib/Ic | 20 | Fremling+2020 — stripped-envelope SNe |
| TDE | 1 | van Velzen+2021 ZTF — ~1 per 5-10 nights |
| Kilonova | 0.5 | Andreoni+2022 — <1 per month |
| Bogus / artifact | 73.5 | LSST estimate — ~7% false positives |

**References:**
- LSST Science Book v2.0 — [arXiv:0912.0201](https://arxiv.org/abs/0912.0201)
- Ivezic et al. 2019, ApJ 873, 111 — [ADS](https://ui.adsabs.harvard.edu/abs/2019ApJ...873..111I)
- Bellm et al. 2019, PASP 131, 018002 — [ADS](https://ui.adsabs.harvard.edu/abs/2019PASP..131a8002B)
- Fremling et al. 2020, ApJ 895, 32 — [ADS](https://ui.adsabs.harvard.edu/abs/2020ApJ...895...32F)
- Perley et al. 2020, MNRAS 499, 3040 — [ADS](https://ui.adsabs.harvard.edu/abs/2020MNRAS.499.3040P)
- van Velzen et al. 2021, ApJ 908, 4 — [ADS](https://ui.adsabs.harvard.edu/abs/2021ApJ...908....4V)
- Andreoni et al. 2022, ApJ 930, 128 — [ADS](https://ui.adsabs.harvard.edu/abs/2022ApJ...930..128A)

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
