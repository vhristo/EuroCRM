# Authentication and Authorization

EuroCRM uses a dual-token JWT authentication system for the web application, and API key authentication for external integrations. All data is strictly scoped to an organization.

One account can belong to several organizations. A session is always scoped to exactly one of them — the *active* organization — and switching reissues both tokens. See [Organization membership](#organization-membership).

---

## Registration

New accounts are created via:

```
POST /api/auth/register
```

Request body:

| Field | Type | Constraints |
|---|---|---|
| `email` | string | Required, valid email, lowercased |
| `password` | string | 8–128 characters |
| `firstName` | string | Required, max 100, trimmed |
| `lastName` | string | Required, max 100, trimmed |
| `organizationName` | string | Required, max 200, trimmed |

Registration creates a new `User`, a new `Organization`, and a `Membership` joining them with the `admin` role. The new organization is seeded with a default pipeline.

Email addresses are globally unique, so the same address cannot register twice. To run a second organization, create it from inside the application rather than registering again — see [Organization membership](#organization-membership).

---

## JWT Token Flow

### Access token

- Short-lived (default 15 minutes, configurable via `JWT_ACCESS_EXPIRY`)
- Signed with `JWT_SECRET`
- Stored in Redux state **in memory only** — never in localStorage or a cookie
- Attached to every API request as: `Authorization: Bearer <accessToken>`

### Refresh token

- Long-lived (default 7 days, configurable via `JWT_REFRESH_EXPIRY`)
- Signed with `JWT_REFRESH_SECRET`
- Stored as an `HttpOnly`, `SameSite=Lax` cookie, `Secure` in production
- Scoped to `path=/api/auth`
- Carries a unique `jti`, so no two issued tokens are ever identical and rotation genuinely invalidates the previous one
- The cookie name is `refreshToken`
- JavaScript cannot read it — it is sent automatically by the browser on requests to the same origin

### Token payload (both tokens)

```json
{
  "userId": "65f3a1b2c3d4e5f6a7b8c9d2",
  "organizationId": "65f3a1b2c3d4e5f6a7b8c9d1",
  "email": "anna@acme.de",
  "role": "manager"
}
```

`organizationId` is the organization **active in this session**, and `role` is the role the user holds **in that organization** — not a global property of the account. The payload shape is identical for single- and multi-organization accounts, which is why every scoped query in the codebase reads `auth.organizationId` without caring how many organizations the user belongs to.

---

## Authentication Flow

```
1. POST /api/auth/login
   → Validates email + password
   → Resolves the active organization: the last one used, else the oldest
     membership; 403 NO_MEMBERSHIP if the account belongs to none
   → Returns { accessToken, user, organizations } in the response body
   → Sets refreshToken as an HttpOnly cookie

2. Client stores accessToken in Redux auth.accessToken (memory only)

3. RTK Query baseApi prepareHeaders attaches:
   Authorization: Bearer <accessToken>
   to every API request

4. On 401 response:
   → RTK Query re-auth interceptor calls POST /api/auth/refresh
   → Server reads refreshToken cookie, validates it, consumes it, and
     revalidates the membership for the organization named in the token
   → Returns { accessToken, user, organizations }
   → Client dispatches setSession(...) to Redux
   → Original request is retried with the new token

   The active organization is taken from the incoming refresh token, not from
   the user document. Reading it from the document would silently revert a
   switch on every refresh.

5. POST /api/auth/logout
   → Removes the refreshToken from the user's refreshTokens[] in the database
   → Clears the refreshToken cookie
   → Client dispatches clearCredentials() and resets the RTK Query cache
```

### Refresh token storage in database

Refresh tokens are hashed (SHA-256) before being stored in the user's `refreshTokens` array. This means if the database is compromised, raw refresh tokens are not exposed. Each token has an `expiresAt` date.

Rotation is single-use: the refresh route matches the incoming hash and removes it in the same atomic operation, so a token cannot be redeemed twice. Expired hashes are pruned whenever a session is issued.

---

## Logout

```
POST /api/auth/logout
```

No request body needed. The refresh token cookie is read, the corresponding token hash is removed from the user's database record, and the cookie is cleared.

This route is behind the middleware's `Bearer` check, so the request must carry
an `Authorization` header as well as the cookie. Without it the request is
rejected by middleware before it reaches the handler and the refresh token is
never revoked.

The client also resets the RTK Query cache on logout. Cache keys carry no
identity, so without the reset the next account to sign in on the same tab is
served the previous one's cached records.

---

## Organization membership

A user's organizations live in the `Membership` collection — one document per
(user, organization) pair, carrying the role held in that organization. A
membership document exists if and only if the user is an active member; there is
no pending or invited state.

```
POST /api/organizations    create a company and switch into it
GET  /api/organizations    the caller's companies
POST /api/auth/switch-org  make a different company active
```

`POST /api/organizations` accepts a `name` and nothing else. `plan` and
`settings` are deliberately not settable from the request body, since this is
the only route where client input reaches a fresh `Organization.create()` with
no spread-then-override to protect it.

`POST /api/auth/switch-org` verifies the caller holds a membership for the
target, then reissues both tokens scoped to it. It returns the same `403` body
whether the organization does not exist or the caller is simply not a member —
a `404` for the first case would confirm which organization ids are real. Do not
"fix" this into a `404`.

After a successful switch the client must reset the RTK Query cache. Its cache
keys are endpoint plus arguments with no identity component, so without the
reset the new session is served the previous organization's rows until each
query refetches. `hooks/useOrganizationSwitch.ts` is the single place this is
done; route every switch through it.

### When a membership is revoked

Removing a membership does not end the user's other sessions. On the next
refresh the server notices the membership is gone and reissues the session
scoped to another organization the user still belongs to, falling back to a
`401` only when none remain. A hard `401` would let one organization's admin
sign a user out of every other organization they belong to.

### The stale access token window

`requireAuth` is stateless and does not touch the database, so a revoked member
keeps access to an organization until their access token expires — up to
`JWT_ACCESS_EXPIRY`, 15 minutes by default. This is a deliberate trade-off: it
keeps a database round trip off all 67 scoped routes, and revocation is an
explicit administrative act against someone who was trusted moments earlier.
Role changes have always had the same lag. Lower `JWT_ACCESS_EXPIRY` to narrow
the window; closing it entirely needs a token version on the user document,
checked on every request.

### Users created before memberships existed

`resolveActiveMembership` creates a membership from the legacy
`User.organizationId` for any user that has none, then sets
`membershipsBackfilledAt` so it never runs again for that user. Without that
marker, revoking someone's last membership would simply be undone the next time
they authenticated. `User.organizationId` and `User.role` are retained and still
written at registration so that a rollback to a pre-membership build works
against a migrated database; nothing reads them.

---

## Multi-Tenant Scoping

Every MongoDB query in EuroCRM is scoped to `organizationId`. Users can only see and modify data belonging to their own organization.

```typescript
// Every query follows this pattern:
await Contact.find({ organizationId: auth.organizationId, ... })
```

The `organizationId` is read from the authenticated JWT payload — it cannot be spoofed by passing a different value in the request body. No route accepts an organization id from a client, and no validator declares the field.

---

## Roles

Roles are held per organization, on the membership rather than on the user, so the same account can be an `admin` of one organization and a `sales_rep` in another. The role in the JWT is always the role in the active organization.

Three roles are available:

| Role | Description |
|---|---|
| `admin` | Full access to all features including settings, user management, and GDPR |
| `manager` | Sales operations access — can see all org data, manage pipelines, view reports, create API keys (read only), use GDPR export |
| `sales_rep` | Individual contributor — can only see and edit their own contacts, deals, leads, and activities |

---

## Permission Matrix

| Permission | admin | manager | sales_rep |
|---|---|---|---|
| `contacts:read` | Yes | Yes | Yes (own only) |
| `contacts:write` | Yes | Yes | Yes (own only) |
| `contacts:delete` | Yes | Yes | No |
| `deals:read` | Yes | Yes | Yes (own only) |
| `deals:write` | Yes | Yes | Yes (own only) |
| `deals:delete` | Yes | Yes | No |
| `leads:read` | Yes | Yes | Yes (own only) |
| `leads:write` | Yes | Yes | Yes (own only) |
| `leads:delete` | Yes | Yes | No |
| `activities:read` | Yes | Yes | Yes (own only) |
| `activities:write` | Yes | Yes | Yes (own only) |
| `activities:delete` | Yes | Yes | No |
| `reports:read` | Yes | Yes | Yes |
| `pipeline:read` | Yes | Yes | Yes |
| `pipeline:write` | Yes | Yes | No |
| `settings:read` | Yes | Yes | No |
| `settings:write` | Yes | No | No |
| `users:read` | Yes | Yes | No |
| `users:write` | Yes | No | No |
| `workflows:read` | Yes | Yes | Yes |
| `workflows:write` | Yes | Yes | No |
| `gdpr:export` | Yes | Yes | No |
| `gdpr:erasure` | Yes | No | No |
| `api_keys:read` | Yes | Yes | No |
| `api_keys:write` | Yes | No | No |
| `webhooks:read` | Yes | Yes | No |
| `webhooks:write` | Yes | No | No |

**"own only"** means sales reps automatically have an `ownerId` filter applied to all queries — they see only records they own.

---

## Route Protection

Next.js middleware (`middleware.ts`) enforces authentication at the edge:

- `/login` and `/register` are public (no auth required)
- `/api/auth/*` routes are public
- `/api/public/*` routes are public (web forms)
- `/api/email/track/*` routes are public (tracking pixels and redirects)
- `/api/v1/*` routes require an `X-API-Key` header (checked at edge, validated in route handlers)
- All other `/api/*` routes require an `Authorization: Bearer <token>` header
- Dashboard pages redirect to `/login` if not authenticated

---

## API Key Authentication

External integrations use API keys instead of JWTs. See [REST API](./api/rest-api.md) and [Settings — API Keys](./features/settings.md#api-keys).

API keys are authenticated via the `X-API-Key` header. The full key is hashed with SHA-256 before being looked up in the database.

Each API key has:
- A set of explicit permissions (scoped to the operations allowed)
- An optional expiry date
- A `lastUsedAt` timestamp (updated asynchronously on each use)

---

## Security Notes

- Passwords are hashed with bcrypt before storage
- Refresh tokens are hashed with SHA-256 before storage
- SMTP passwords are encrypted with AES-256-GCM (`ENCRYPTION_KEY` environment variable)
- API keys are hashed with SHA-256 before storage
- The webhook signing secret is shown only at creation and never stored in plaintext in API responses
- All cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`
- HMAC-SHA256 is used to sign webhook payloads

---

## Related

- [Deployment](./deployment.md) — JWT secrets and encryption key configuration
- [REST API](./api/rest-api.md) — API key authentication for external access
- [Webhooks](./api/webhooks.md) — HMAC-SHA256 signature verification
- [GDPR](./gdpr.md) — role requirements for GDPR operations
