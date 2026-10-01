# fuse-hub

One command, all the apps. fuse-hub spawns every sibling project's
`server.js` as a child process (with auto-restart) and reverse-proxies
them under a single port.

```bash
cd fuse-hub
npm start            # → http://localhost:4000
```

| Mount | App |
|---|---|
| `/growth` | zero-growth-app — money growth tracker |
| `/casper` | casperinc6-source — booking + Stripe |
| `/cobra`  | beige-cobras-scream — scaffold |
| `/conway` | automaton-conway — Game of Life |
| `/bots`   | conway-automoton-survivalbots — bot ecology |
| `/clips`  | paperclip-maximizer — idle game |
| `/jarvis` | jarvis-landing — voice OS assistant landing page |
| `/claims` | claim-finder — official unclaimed-money directory + tracker |

The landing page shows live health (probed 🟢/🟡/🔴). `Ctrl-C` stops
everything cleanly.

## Deploy on Render (free, 24/7)

The whole fleet runs as **one free web service** — `render.yaml` in this
repo is a Blueprint.

1. Push this repo to GitHub (done: `casperinc6-source/fuse-hub`).
2. On [render.com](https://render.com): **New + → Blueprint** → connect
   this repo → **Apply**. Render builds nothing (zero deps) and runs
   `node server.js` on one port.
3. Copy your service URL (`https://fuse-hub-xxxx.onrender.com`).
4. In GitHub → this repo → **Settings → Secrets and variables → Actions**:
   add secret `RENDER_URL` with that URL. The included
   `keepalive.yml` workflow then pings `/healthz` every 10 minutes, so
   the free tier's 15-minute idle sleep never triggers.

**Free-tier honest limits:**

- Cold start is ~50s if the service ever does sleep (e.g. GitHub
  Actions disabled after 60 days without a push — any push resets it).
- **Disk is ephemeral**: SQLite data (paperclip saves, claims tracker,
  growth entries) resets on redeploys/restarts. Demo-grade persistence;
  a paid disk or external DB fixes it later.
- `GET /healthz` returns JSON liveness for the hub (used by keepalive
  and Render health checks).
