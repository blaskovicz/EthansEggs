# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Ethan's Eggs is a household app for tracking daily egg-collection chores and the money owed for them. Three kids (Ethan, Benedict, Maxine) and two parents (Xixu, Zach) each log in by picking their profile and entering a password. Kids mark that they collected/helped collect eggs each day; parents see collection counts, running balances, and record payments ("true-ups") against what's owed. It's LAN-only — the server binds `0.0.0.0` on the household's home network, with no auth layer beyond the app's own profile+password login. See `README.md` for the full feature list, default seeded logins, and the iPad "Add to Home Screen" setup — don't duplicate that here.

## Commands

Run from the repo root unless noted.

```
npm run install:all          # installs root, server, and client deps
npm run dev                  # concurrently runs server (tsx watch, :4000) + client (vite, :5173)
npm run build                # vue-tsc + vite build (client), then tsc (server)
npm run start                # prisma migrate deploy, then serves the built SPA from Express on :4000
```

Server and client have independent test suites (vitest), run from their own directories:

```
cd server && npm test                              # full server suite
cd server && npx vitest run tests/routes/eggs.test.ts   # single file
cd server && npx vitest run -t "some test name"         # by test name

cd client && npm test                               # full client suite
cd client && npx vitest run src/components/BalanceCard.test.ts
```

Type-checking without emitting:

```
cd server && npx tsc -p tsconfig.json --noEmit
cd client && npx vue-tsc -b
```

Prisma (run from `server/`): `npx prisma migrate dev --name <name>` to add a migration, `npx prisma studio` to browse `dev.db`. **Never run `prisma migrate reset` or any destructive Prisma command against `dev.db`** — it's the live household data, not disposable. Use `server/.env.test` (`DATABASE_URL=file:./test.db`) for anything exploratory.

## Architecture

**Monorepo, two independently-run apps that combine into one process in production.** `client/` (Vue 3 + Vite + TypeScript + Tailwind + Pinia + Vue Router) and `server/` (Express + TypeScript + Prisma/SQLite) are separate npm projects. In dev they run on separate ports with Vite proxying `/api` to Express (see `client/vite.config.ts`). In production, `server/src/app.ts`'s `createApp()` serves `client/dist` as static files and falls back to `index.html` for any non-`/api` route — `server/src/index.ts` just calls `createApp().listen()`. The app/index split exists specifically so tests can import `createApp()` without binding a port.

**Auth is a signed JWT in an httpOnly cookie, not a session store.** `POST /api/auth/login` verifies a bcrypt password and calls `issueSessionCookie` (`server/src/middleware/auth.ts`), which signs `{ userId, role, name }` and sets it as a cookie — no server-side session state, so restarts don't log anyone out. `requireAuth` verifies the cookie on every request; `requireParent` gates parent-only routes. The Vue side mirrors this in `client/src/router/index.ts`'s `beforeEach` guard, which calls `GET /api/auth/me` once (`auth.initialized`) and redirects based on `route.meta.role` vs. the logged-in user's role.

**The egg-collection domain model is a single append-only table, not per-day-per-household state.** `EggCollection` has a `(userId, date)` unique constraint — one row per person per calendar day, holding an optional `eggCount` and an `isHelper` flag. There's no separate "day" or "event" entity. This drives several rules enforced in `server/src/routes/eggs.ts`'s `POST /collect`:
- Only one person can *start* a given day: before creating a row, it checks whether *any* `EggCollection` already exists for `today` (any user, any role) and rejects with 403 if so. This makes "today's collection" a single coordinated event instead of independent per-kid claims.
- A child marking themselves can pass `helperIds` in the same request to auto-create rows for siblings (`isHelper: true`) — this is the only sanctioned way multiple people get credited for one day.
- Parent-recorded rows use the parent's own `userId` and are functionally identical rows, but since balance calculations only ever query a specific *child's* `userId`, a parent's own row never contributes to anyone's payout — no special-casing needed. Parents mark collection purely so the household can coordinate ("someone already got it today"), not to get paid.
- Undo (`DELETE /collect/today`) is self-only, except: if the caller's own row for today has `isHelper: false` (they were the one who started the day), undo also deletes every row for that date — otherwise helper rows they created would be orphaned with no initiator.

**Money is derived, not stored as a running balance.** `computeChildBalance` (`server/src/lib/balance.ts`) recomputes a child's owed amount on every read: `collectionsCount × rateCents − sum(payments)`. `rateCents` and `chickenCount` (used to cap `eggCount` in the collect dialog) live in a singleton `Settings` row (`id: 1`), read via `getRateCents()` / `getChickenCount()`.

**Test isolation has a hard-coded safety net, not just config.** `server/tests/globalSetup.ts` and `setupEnv.ts` both throw immediately if `DATABASE_URL` doesn't contain `test.db` after loading `.env.test` — this exists because a missing `dotenv.config({ override: true })` once let an already-set `DATABASE_URL` win over the test config, and every test's `resetDb()` (`server/tests/helpers.ts`) does an unconditional `deleteMany()` across all tables. `resetDb()` itself re-checks the same guard as a third layer. Don't remove these checks when touching test setup.

## Deploying as a system service (pm2)

The app runs under pm2, configured via `ecosystem.config.js` at the repo root (`cwd: server`, script `dist/index.js`, `NODE_ENV: production`). It auto-restarts on crash and relaunches when the Windows user logs in, via a registry Run-key entry that `pm2-windows-startup` installed (not a true pre-login service — see README's caveat).

After code changes:

```
npm run build
pm2 restart ethans-eggs
pm2 save
```

`pm2 list` / `pm2 logs ethans-eggs` / `pm2 stop ethans-eggs` for status, logs, and stopping. If you need to regenerate the Prisma client or run `prisma migrate dev` while pm2 is running, `pm2 stop ethans-eggs` first — the running process holds a lock on `node_modules/.prisma/client/query_engine-windows.dll.node` that causes `EPERM` on Windows otherwise.
