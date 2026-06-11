---
title: Alert Sound Mapping
emoji: 🎵
colorFrom: gray
colorTo: gray
sdk: docker
pinned: false
app_port: 3000
---

# Alert Data → Sound Mapping

Browser-based sonification of live alerts from the Vera C. Rubin Observatory (LSST).
Web Audio API + Vue 3 + D3.js + Kafka.

Transforms a stream of astronomical alerts into real-time multi-channel spatial audio.
[Full documentation](docs/plan.md) (Russian)

## Quick Start

```bash
make dev        # backend + frontend-dev (Docker)
make frontend   # build static for GitHub Pages
make deploy     # push to Hugging Face Space
```

## Architecture

```
GitHub Pages (SPA)          Hugging Face Space (Docker)
  Vue 3 + Vite               Node.js (Bun) + KafkaJS
  Web Audio API               WebSocket
  D3.js (Aitoff)
  Tailwind CSS 4
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + TypeScript |
| Styling | Tailwind CSS 4 |
| Sky Map | D3.js (Aitoff projection) |
| Audio | Web Audio API |
| Backend | Bun + TypeScript |
| Kafka | KafkaJS |
| WebSocket | ws |
| Hosting | GitHub Pages + HF Spaces |
| CI/CD | Docker + Makefile |
