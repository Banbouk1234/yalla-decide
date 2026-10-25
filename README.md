# Yalla Decide / يلا نقرر

Live group-decision party game. With a Google Maps key the verdict picks from real venues that are open right now near the group (distance, rating, Maps link). Host creates a room (subject, alcohol yes/no, optional password), shares a link, everyone joins from their own phone, answers privately, then the reveal, the GPT verdict with real venues and roasts, one veto each, and a spin wheel.

## Run locally

```bash
npm install
OPENAI_API_KEY=sk-... npm start      # key is optional; without it, built-in rules pick the venues
```

Open http://localhost:3000 on your phone and laptop; friends on the same Wi-Fi can use your laptop's IP.

## Deploy (free tiers work)

**Railway** — New Project → Deploy from GitHub repo → pick this repo. Add variable `OPENAI_API_KEY`. Done; Railway gives you a public URL.

**Render** — New → Web Service → connect repo. Build: `npm install`. Start: `npm start`. Add `OPENAI_API_KEY`. Free instance sleeps after inactivity; the first open takes ~30s.

**Fly.io** — `fly launch` then `fly secrets set OPENAI_API_KEY=...`.

Rooms live in server memory (ephemeral by design) and are forgotten after 6 idle hours. One server instance only; WebSockets need a host that keeps the process alive.

## Env

| var | default | meaning |
|---|---|---|
| `PORT` | 3000 | listen port |
| `OPENAI_API_KEY` | – | enables the GPT verdict and roasts |
| `OPENAI_MODEL` | gpt-4o-mini | any chat model with JSON mode |
| `GOOGLE_MAPS_API_KEY` | – | real open-now venues from Google Places; enable **Places API** and **Geocoding API** on the key |

## Layout

- `server.js` — Express + ws, rooms, phases, GPT call
- `game.js` — bilingual question packs per subject, rule-based fallback (shared with the browser)
- `public/index.html` — the whole client (datamosh canvas, AR/EN, RTL)
