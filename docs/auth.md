# Authentication and Authorization

EuroCRM uses a dual-token JWT authentication system for the web application, and API key authentication for external integrations. All data is strictly scoped to an organization.

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

Registration creates both a new `User` and a new `Organization` in a single operation. The first user of an organization is assigned the `admin` role.

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
- Stored as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie
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

---

## Authentication Flow

```
1. POST /api/auth/login
   → Validates email + password
   → Returns { accessToken, user } in the response body
   → Sets refreshToken as an HttpOnly cookie

2. Client stores accessToken in Redux auth.accessToken (memory only)

3. RTK Query baseApi prepareHeaders attaches:
   Authorization: Bearer <accessToken>
   to every API request

4. On 401 response:
   → RTK Query re-auth interceptor calls POST /api/auth/refresh
   → Server reads refreshToken cookie, validates it, issues a new accessToken
   → Client dispatches updateAccessToken(newAccessToken) to Redux
   → Original request is retried with the new token

5. POST /api/auth/logout
   → Removes the refreshToken from the user's refreshTokens[] in the database
   → Clears the refreshToken cookie
   → Client dispatches clearCredentials() to Redux
```

### Refresh token storage in database

Refresh tokens are hashed (SHA-256) before being stored in the user's `refreshTokens` array. This means if the database is compromised, raw refresh tokens are not exposed. Each token has an `expiresAt` date.

On login, any expired refresh tokens are cleaned up from the array.

---

## Logout

```
POST /api/auth/logout
```

No request body needed. The refresh token cookie is read, the corresponding token hash is removed from the user's database record, and the cookie is cleared.

---

## Multi-Tenant Scoping

Every MongoDB query in EuroCRM is scoped to `organizationId`. Users can only see and modify data belonging to their own organization.

```typescript
// Every query follows this pattern:
await Contact.find({ organizationId: auth.organizationId, ... })
```

The `organizationId` is read from the authenticated JWT payload — it cannot be spoofed by passing a different value in the request body.

---

## Roles

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
