# Ethan's Eggs 🥚

A little household app for tracking daily egg-collection chores and the money owed for them.

- **Kids** (Ethan, Benedict, Maxine) log in by picking their profile and entering a password, then tap one button to mark that they collected/helped collect eggs today.
- **Parents** (Xixu, Zach) log in the same way and can see every kid's collection count and running balance, record payments ("true-ups"), and edit the per-collection rate.
- Every collection and payment is a permanent row in the database — nothing is ever silently overwritten.

## Tech stack

- **Backend:** Node.js + TypeScript + Express, SQLite via Prisma (`server/prisma/dev.db`), JWT stored in an httpOnly cookie for auth.
- **Frontend:** Vue 3 + TypeScript + Vite, Tailwind CSS, Pinia, Vue Router. Built as a single-page app.
- In production the Express server serves the built Vue app itself, so it's just **one process on one port**.

## First-time setup

From the project root:

```
npm run install:all
```

This installs dependencies for the root, `server`, and `client`. The database (SQLite file, migrations, and seed users) was already created during initial setup — see **Default logins** below. If you ever need to recreate it from scratch:

```
cd server
npx prisma migrate reset
```

## Running it day-to-day

**Production mode (recommended for normal use)** — builds the frontend and runs a single server on port 4000:

```
npm run build
npm run start
```

Then, on this PC or any device on the same home network, visit:

```
http://<this-PC's-local-IP>:4000
```

To find this PC's local IP, run `ipconfig` (Windows) and look for the `IPv4 Address` under your active network adapter (something like `192.168.x.x`). On this machine right now that's:

```
http://192.168.68.184:4000
```

That address can change if the router reassigns it later — re-run `ipconfig` if the site stops loading from other devices.

**Development mode** (only needed if you're going to modify the code — runs the frontend and backend as separate hot-reloading servers):

```
npm run dev
```

Frontend: http://localhost:5173 (proxies API calls to the backend)
Backend: http://localhost:4000

## Default logins

Seeded the first time the database was created. **Anyone can change their own password** after logging in (profile menu, top right → "Change password") — you're encouraged to do that instead of leaving these defaults in place long-term.

| Name | Role | Password |
|------|------|----------|
| Ethan | Child | `1234` |
| Benedict | Child | `2345` |
| Maxine | Child | `3456` |
| Xixu | Parent | `parent1` |
| Zach | Parent | `parent2` |

## How the money works

- Parents set a **rate per collection** (defaults to $1.00) on the parent dashboard.
- Each time a kid marks a day as collected, that's +1 collection and +$rate owed to them. Kids can each mark their *own* day independently — e.g. if two kids both helped on the same day, they each get credit.
- A kid can only mark **one entry per calendar day** (prevents accidental double taps); there's an "Undo" link right after marking in case of a mistake.
- Parents record **payments** against a child (amount + optional note, e.g. "cash", "allowance"). A child's balance owed is always `(collections × rate) − (payments made)`.
- Every collection and payment is timestamped and shown in an activity feed on both the child's and parent's views — this is the persistent log.

## Project layout

```
EthansEggs/
├── server/           Express + TypeScript API
│   ├── prisma/        schema.prisma, migrations, seed.ts
│   └── src/           routes, middleware, db client
├── client/           Vue 3 + Vite SPA
│   └── src/           views, components, stores, router
└── package.json       root convenience scripts (dev/build/start)
```

## Always-on via pm2 (already set up)

The app runs under [pm2](https://pm2.keymetrics.io/), a process manager that keeps it running in the background and restarts it if it ever crashes. It's configured to relaunch automatically whenever this Windows account logs in (via a registry Run-key entry that `pm2-windows-startup` installed).

Useful commands (run from anywhere):

```
pm2 list             # see status
pm2 logs ethans-eggs  # tail logs
pm2 restart ethans-eggs
pm2 stop ethans-eggs
```

**If you change the code**, rebuild and restart so pm2 picks up the new build:

```
cd EthansEggs
npm run build
pm2 restart ethans-eggs
pm2 save
```

Caveat: this starts the app when **your Windows user logs in**, not before login / at raw power-on. If this PC is set to auto-login (or you're usually logged in), that's effectively "starts on boot." If you want it running even when nobody's logged in, that needs a real Windows Service instead (via `pm2-installer`) — ask if you want that set up.

## Add it to the iPad's Home Screen (looks like a real app)

The site already has a proper app icon and manifest, so Safari's "Add to Home Screen" gives a full-screen app-like icon (no browser address bar) instead of a bookmark:

1. On the iPad, open Safari and go to `http://192.168.68.184:4000` (or whatever this PC's current local IP is).
2. Tap the **Share** icon (square with an arrow pointing up) in Safari's toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name ("Ethan's Eggs") and tap **Add**.

It'll now show up on the Home Screen with the egg icon, and opening it launches full-screen like a native app. It still needs the PC running the server and both devices on the same Wi-Fi network.
