# Scripts

## `migrate-memberships.js`

Backfills the `memberships` collection for users created before
multi-organization support, and seeds `User.lastOrganizationId`.

**Run it with `mongosh`, not `node`.** The production image is a Next.js
standalone build (`output: 'standalone'`) — the Dockerfile copies only
`.next/standalone`, `.next/static` and `public`, so there is no source tree and
no full `node_modules` inside the container. The `mongo:7` service already ships
`mongosh`.

```bash
# Local, with mongosh on the host
mongosh "mongodb://admin:changeme@localhost:27017/eurocrm?authSource=admin" \
  scripts/migrate-memberships.js

# Against a compose stack, where the script lives on the host and mongosh
# lives in the container
docker compose exec mongo mongosh --quiet \
  -u "$MONGO_USER" -p "$MONGO_PASS" --authenticationDatabase admin eurocrm \
  --eval "$(cat scripts/migrate-memberships.js)"
```

Do **not** pipe the file into `mongosh` on stdin (`< script.js`). It is read as
REPL input, one line at a time, and every multi-line statement fails to parse.

### When to run it

The migration is purely additive: it creates a new collection and sets a new
field, and the pre-multi-org code reads neither. So **run it before deploying the
new image**, while the old one is still serving traffic. No downtime, and a
rollback to the previous image keeps working because `User.organizationId` and
`User.role` are left in place.

It is idempotent — safe to re-run.

### If you skip it

`resolveActiveMembership` in `lib/session.ts` carries a lazy backfill that
creates a missing membership from the legacy `User.organizationId` on the user's
next login or token refresh. The script is the tidy path; the lazy backfill is
the safety net that makes the rollout order-independent.
