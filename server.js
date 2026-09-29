/**
 * fuse-hub — one command, all six apps.
 *
 * Launches every app in ../ as a child process, then reverse-proxies
 * HTTP to them by path prefix. Zero dependencies.
 *
 *   http://localhost:4000/               → hub landing page (app index)
 *   http://localhost:4000/growth/        → zero-growth-app        :3002
 *   http://localhost:4000/casper/        → casperinc6-source      :3001
 *   http://localhost:4000/cobra/         → beige-cobras-scream    :3000
 *   http://localhost:4000/conway/        → automaton-conway       :3003
 *   http://localhost:4000/bots/          → conway-automoton-survivalbots :3004
 *   http://localhost:4000/clips/         → paperclip-maximizer    :3005
 *   http://localhost:4000/jarvis/        → jarvis-landing         :3006
 */
const http = require('node:http');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const PORT = process.env.PORT || 4000;
const ROOT = path.join(__dirname, '..');

const APPS = [
  { mount: 'growth', dir: 'zero-growth-app',                port: 3002, name: 'Zero → Growth',      desc: 'money growth tracker from $0' },
  { mount: 'casper', dir: 'casperinc6-source',              port: 3001, name: 'Casper Inc.',        desc: 'travel booking + real Stripe checkout' },
  { mount: 'cobra',  dir: 'beige-cobras-scream',            port: 3000, name: 'Beige Cobras Scream', desc: 'app scaffold / landing' },
  { mount: 'conway', dir: 'automaton-conway',               port: 3003, name: 'Conway Life',        desc: "Conway's Game of Life" },
  { mount: 'bots',   dir: 'conway-automoton-survivalbots',  port: 3004, name: 'Survival Bots',      desc: 'automaton predator-prey ecology' },
  { mount: 'clips',  dir: 'paperclip-maximizer',            port: 3005, name: 'Paperclip Maximizer', desc: 'the idle game about putting everything into clips' },
  { mount: 'jarvis', dir: 'jarvis-landing',                port: 3006, name: 'JARVIS',             desc: 'landing page for the voice OS assistant' },
];

const children = new Map();
const state = new Map(); // mount -> 'starting' | 'up' | 'down'

function startApp(app) {
  const entry = path.join(ROOT, app.dir, 'server.js');
  if (!fs.existsSync(entry)) { state.set(app.mount, 'down'); return; }
  const child = spawn(process.execPath, [entry], {
    cwd: path.join(ROOT, app.dir),
    env: { ...process.env, PORT: String(app.port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${app.mount}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${app.mount}] ${d}`));
  child.on('exit', (code) => {
    state.set(app.mount, 'down');
    children.delete(app.mount);
    if (!shuttingDown) { log(`↻ ${app.mount} exited (${code}) — restarting in 2s`); setTimeout(() => startApp(app), 2000); }
  });
  children.set(app.mount, child);
  state.set(app.mount, 'starting');
  // optimistic health flip after a short grace period
  setTimeout(async () => state.set(app.mount, (await probe(app.port)) ? 'up' : 'starting'), 1200);
}

let shuttingDown = false;
function log(msg) { console.log(`[hub] ${msg}`); }

async function probe(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch { return false; }
}

/** Proxy a request to an app, stripping the mount prefix and rewriting Location headers. */
function proxy(req, res, app) {
  const prefix = '/' + app.mount;
  const rest = req.url.startsWith(prefix) ? req.url.slice(prefix.length) || '/' : req.url;
  const opts = { hostname: '127.0.0.1', port: app.port, path: rest, method: req.method, headers: { ...req.headers, 'x-forwarded-prefix': prefix } };
  const upstream = http.request(opts, (ur) => {
    const headers = { ...ur.headers };
    if (headers.location && headers.location.startsWith('/')) headers.location = `/${app.mount}${headers.location}`;
    res.writeHead(ur.statusCode, headers);
    ur.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1 style="font-family:system-ui">/${app.mount} is not responding — still starting? <a href="/">retry</a></h1>`);
  });
  req.pipe(upstream);
}

function landing(res) {
  const rows = APPS.map((a) => {
    const s = state.get(a.mount) || 'down';
    const badge = s === 'up' ? '🟢' : s === 'starting' ? '🟡' : '🔴';
    return `<tr><td>${badge}</td><td><a href="/${a.mount}/">${a.name}</a></td><td>${a.desc}</td><td><code>/${a.mount}/</code></td></tr>`;
  }).join('');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`<!doctype html><html><head><meta charset="utf-8"><title>fuse-hub</title>
<style>body{font-family:system-ui,sans-serif;background:#0e1116;color:#e8edf2;max-width:760px;margin:3rem auto;padding:0 1rem}
h1 b{color:#7ee787}table{width:100%;border-collapse:collapse;margin-top:1.2rem}
td,th{padding:.6rem .7rem;border-bottom:1px solid #26303a;text-align:left;font-size:.95rem}
a{color:#79c0ff}code{background:#1b2330;padding:.1rem .4rem;border-radius:4px}
p{color:#8b98a5;font-size:.9rem}</style></head><body>
<h1>fuse-<b>hub</b> — six apps, one command</h1>
<p>All apps run as child processes with auto-restart. Refresh to update health.</p>
<table><tr><th></th><th>App</th><th>What</th><th>Mount</th></tr>${rows}</table>
<p style="margin-top:1.5rem">Health probes: 🟢 up · 🟡 starting · 🔴 down</p>
</body></html>`);
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://x').pathname;
  const seg = urlPath.split('/')[1] || '';
  const app = APPS.find((a) => a.mount === seg);
  if (app) {
    if (urlPath === `/${app.mount}`) { res.writeHead(301, { Location: `/${app.mount}/` }); return res.end(); }
    return proxy(req, res, app);
  }
  if (urlPath === '/' || urlPath === '/index.html') return landing(res);
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1 style="font-family:system-ui">404 — unknown mount</h1>');
});

for (const app of APPS) startApp(app);

process.on('SIGINT', () => {
  shuttingDown = true;
  log('shutting down all children…');
  for (const c of children.values()) c.kill('SIGTERM');
  setTimeout(() => process.exit(0), 500);
});

server.listen(PORT, () => {
  log(`fuse-hub on http://localhost:${PORT}`);
  log(APPS.map((a) => `/${a.mount} → :${a.port}`).join('  '));
});
