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

The landing page shows live health (probed 🟢/🟡/🔴). `Ctrl-C` stops
everything cleanly.
