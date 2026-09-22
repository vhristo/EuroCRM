# Verification suites

Integration checks for multi-company support and the tenant isolation boundary.
They run against a live app and a real MongoDB — these are not unit tests, and
what they guard (cross-company reads, refresh-token rotation, membership
revocation) only means anything against a real database.

| Command | What it covers |
|---|---|
| `pnpm verify` | 70 assertions over the HTTP API |
| `pnpm verify:ui` | 18 assertions through a real browser |

## Running them

Start MongoDB and the app:

```bash
docker compose -f docker-compose.dev.yml up -d mongo
pnpm build
PORT=3005 pnpm start
```

Port 3005 rather than 3000 only because the default often collides with another
dev server; override with `BASE_URL` if you use a different one.

```bash
pnpm verify
```

Configure through the environment — the defaults match the dev stack:

| Variable | Default |
|---|---|
| `BASE_URL` | `http://127.0.0.1:3005` |
| `MONGO_CONTAINER` | `eurocrm-mongo-dev` — the `docker exec` target. Set it empty to use a local `mongosh` against `MONGO_URI` instead. |
| `MONGO_URI` | `mongodb://admin:changeme@localhost:27017/eurocrm?authSource=admin` |
| `MONGO_DB` | `eurocrm` |
| `RUN_ID` | a per-run id, derived from the PID and the clock |

Every account the suite creates is namespaced with the run id and removed on
exit, along with any organization left without members. Nothing it touches
outlives the run.

The browser suite needs playwright, which is deliberately not a dependency of
this project:

```bash
npm i -D playwright && npx playwright install chromium
pnpm verify:ui
```

It writes a screenshot per step to `/tmp/uishots` (override with `SHOTS`), and
leaves its account behind — it has no database access to clean up with.

## Two traps

Both of these silently produced false results while the suites were being
written, so they are worth knowing before editing them.

**`mongosh` must take a script through `--eval`, never on stdin.** Piped in with
`< script.js` it is read as REPL input one line at a time, so every multi-line
statement fails to parse — while the exit status stays 0 and the run looks fine.
Use `--eval "$(cat script.js)"`.

**JSON request bodies go through a file.** Written inline, the braces in
`"$(curl ... -d "{\"a\":1}")"` undergo brace expansion. That mangles the request
body *and* the argument list of whatever is being asserted, which is how an
assertion came to report PASS against an empty value. The `body`/`req` helpers
exist to make this the path of least resistance.

The assertion helper is otherwise straightforward, but it is worth keeping it
that way: a helper that can report success for a value it never received
invalidates every result in the file.

## The one to preserve

Step 6 of the browser suite. RTK Query keys its cache on endpoint plus arguments
with no identity component, so without an explicit `resetApiState()` a switched
session is served the previous company's rows until each query refetches. The
server never returns another company's data, so this is a display-only leak —
but it is indistinguishable from a real one to anyone looking at the screen, and
it is the single easiest part of this feature to regress.
