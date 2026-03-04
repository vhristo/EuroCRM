# EuroCRM — CLAUDE.md

> This file is the authoritative context document for Claude Code.
> Read it fully at the start of every session before writing any code.

---

## Project Identity

**Name**: EuroCRM  
**Type**: PipeDrive-inspired CRM SaaS — pipeline management, contact/deal tracking, lead inbox, activity logging, email marketing, and reporting  
**Target Market**: European SMBs and sales teams  
**Status**: MVP in active development

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 14+ (App Router) | Server + Client Components |
| Language | TypeScript (strict) | No `any` — use `unknown` + narrowing |
| State | Redux + Redux Toolkit | RTK Query for all API calls |
| UI Library | MUI v5 (Material UI) | DataGrid, Dialog, Drawer, DatePicker |
| Styling | Tailwind CSS | Layout, spacing, custom cards |
| Database | MongoDB via Mongoose ODM | Always scope by `organizationId` |
| Auth | JWT (access + refresh tokens) | Access in memory; refresh as HttpOnly cookie |
| Containerization | Docker + Docker Compose | Dev and prod configs |
| Package Manager | pnpm | Always use pnpm, never npm/yarn |
| Validation | Zod | All API input validation |
| Forms | react-hook-form + zodResolver | All forms |
| Drag & Drop | @hello-pangea/dnd | Pipeline Kanban board |
| Charts | recharts | Reports & analytics |
| Date utils | date-fns | All date formatting |

---

## Project Structure

```
eurocrm/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx               # Sidebar + TopBar shell
│   │   ├── dashboard/page.tsx
│   │   ├── pipeline/page.tsx
│   │   ├── contacts/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── deals/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── activities/page.tsx
│   │   ├── reports/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   ├── refresh/route.ts
│   │   │   └── logout/route.ts
│   │   ├── contacts/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── deals/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/stage/route.ts
│   │   ├── leads/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/convert/route.ts
│   │   ├── activities/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/done/route.ts
│   │   ├── pipeline/route.ts
│   │   └── reports/
│   │       ├── pipeline-summary/route.ts
│   │       ├── revenue-forecast/route.ts
│   │       └── leaderboard/route.ts
│   ├── layout.tsx                   # Root layout — StoreProvider + MUI ThemeProvider
│   └── providers.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── PageHeader.tsx
│   ├── pipeline/
│   │   ├── PipelineBoard.tsx
│   │   ├── PipelineColumn.tsx
│   │   └── DealCard.tsx
│   ├── contacts/
│   │   ├── ContactTable.tsx
│   │   ├── ContactForm.tsx
│   │   └── ContactDetail.tsx
│   ├── deals/
│   │   ├── DealForm.tsx
│   │   └── DealDetail.tsx
│   ├── activities/
│   │   └── ActivityTimeline.tsx
│   ├── reports/
│   │   └── SalesChart.tsx
│   └── shared/
│       ├── DataTable.tsx
│       ├── ConfirmDialog.tsx
│       ├── StatusChip.tsx
│       └── LoadingOverlay.tsx
├── store/
│   ├── index.ts
│   ├── hooks.ts                     # useAppDispatch / useAppSelector
│   ├── slices/
│   │   ├── authSlice.ts
│   │   └── uiSlice.ts
│   └── api/
│       ├── baseApi.ts               # RTK Query base + JWT re-auth interceptor
│       ├── contactsApi.ts
│       ├── dealsApi.ts
│       ├── leadsApi.ts
│       ├── activitiesApi.ts
│       └── reportsApi.ts
├── lib/
│   ├── db.ts                        # MongoDB singleton connection
│   ├── auth.ts                      # JWT sign/verify + requireAuth()
│   └── validators/
│       ├── contactSchema.ts
│       ├── dealSchema.ts
│       └── authSchema.ts
├── models/
│   ├── User.ts
│   ├── Contact.ts
│   ├── Deal.ts
│   ├── Lead.ts
│   ├── Activity.ts
│   ├── Pipeline.ts
│   └── Organization.ts
├── types/
│   ├── auth.ts
│   ├── contact.ts
│   ├── deal.ts
│   ├── pipeline.ts
│   └── api.ts
├── hooks/
│   ├── useAuth.ts
│   └── useDebounce.ts
├── utils/
│   ├── formatters.ts                # formatCurrency, formatDate
│   └── constants.ts
├── middleware.ts                    # Next.js route protection
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── nginx.conf
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

---

## Skills

Install and use these Claude Code skills for EuroCRM development:

| Skill File | Use When |
|---|---|
| `eurocrm-api.skill` | Writing or editing any `app/api/` route handler |
| `eurocrm-auth.skill` | Working on auth routes, JWT helpers, middleware, authSlice |
| `eurocrm-models.skill` | Creating or editing any `models/` Mongoose schema |
| `eurocrm-store.skill` | Building Redux slices or RTK Query API endpoints in `store/` |
| `eurocrm-components.skill` | Creating React components, pages, forms, or UI in `components/` or `app/(dashboard)/` |

---

## Non-Negotiable Rules

### 1. Multi-Tenant Scoping
**Every** MongoDB query must include `organizationId: auth.organizationId`.
No exceptions. Missing this is a critical security bug.

```ts
// ✅ Correct
await Contact.find({ organizationId: auth.organizationId, ownerId: userId })

// ❌ WRONG — never query without org scope
await Contact.find({ ownerId: userId })
```

### 2. Money as Integer Cents
Store all monetary values as **integers in cents** in MongoDB.
Format in the UI using `formatCurrency()` from `utils/formatters.ts`.

```ts
// ✅ Store: 10000 = €100.00
// ✅ Display: formatCurrency(10000, 'EUR') → "€100,00"
// ❌ Never store: 100.00
```

### 3. Auth Token Storage
- **Access token**: Redux state ONLY (`auth.accessToken`). Never localStorage, never a cookie.
- **Refresh token**: HttpOnly cookie ONLY. JS cannot read it.

### 4. TypeScript Strictness
- No `any` — use `unknown` with type narrowing, or proper generics.
- Export plain `IModelName` interface separately from `IModelNameDocument` so store types don't import Mongoose.

### 5. API Route Guards
Every protected route must start with:
```ts
const auth = await requireAuth(req)
if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### 6. Mongoose Singleton
Always use the singleton pattern to avoid hot-reload model errors:
```ts
const Model = mongoose.models.ModelName ?? mongoose.model('ModelName', schema)
```

### 7. Zod Validation on All POST/PUT
Parse every request body with Zod before touching the DB:
```ts
const parsed = Schema.safeParse(await req.json())
if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
```

### 8. Client vs Server Components
Add `'use client'` to any component using React hooks, Redux hooks, or event handlers.
Server Components cannot use Redux — pass data as props or fetch directly.

---

## Data Models (Summary)

| Model | Key Fields |
|---|---|
| **User** | `organizationId`, `email` (unique), `passwordHash`, `role`, `refreshTokens[]` |
| **Contact** | `organizationId`, `firstName`, `lastName`, `email`, `company`, `country`, `currency`, `tags[]`, `ownerId` |
| **Deal** | `organizationId`, `title`, `value` (cents), `currency`, `stage`, `pipelineId`, `contactId`, `status`, `probability`, `rottenSince`, `stageEnteredAt`, `ownerId` |
| **Pipeline** | `organizationId`, `name`, `stages[]` (id, name, order, probability, rotDays), `isDefault` |
| **Lead** | `organizationId`, `name`, `email`, `source`, `status`, `ownerId`, `convertedToDealId` |
| **Activity** | `organizationId`, `type` (call/email/meeting/task/note), `subject`, `dueDate`, `done`, `contactId`, `dealId`, `ownerId` |
| **Organization** | `name`, `plan`, `settings` |

---

## Authentication Flow

```
1. POST /api/auth/login
   → returns { accessToken, user } + sets refreshToken HttpOnly cookie

2. Client stores accessToken in Redux (memory only)

3. RTK Query baseApi prepareHeaders attaches: Authorization: Bearer <accessToken>

4. On 401 response → baseApi auto-calls POST /api/auth/refresh
   → gets new accessToken → dispatches updateAccessToken → retries original request

5. POST /api/auth/logout
   → removes refreshToken from DB + clears cookie + dispatches clearCredentials
```

---

## API Conventions

### Response Shapes

```ts
// List endpoints
{ items: T[], total: number, page: number, limit: number }

// Single item
T

// Error
{ error: string, code?: string }

// Success (delete/action)
{ success: true }
```

### Pagination Defaults
- `page=1`, `limit=20`, max `limit=100`
- Query params: `?page=1&limit=20&search=...&ownerId=...`

### HTTP Status Codes
| Status | When |
|---|---|
| 200 | Successful GET / PUT |
| 201 | Successful POST (created) |
| 400 | Validation error (Zod) |
| 401 | Missing or invalid token |
| 403 | Valid token, wrong org |
| 404 | Resource not found (scoped to org) |
| 500 | Unexpected server error |

---

## Redux Store Shape

```ts
{
  auth: {
    user: { id, email, firstName, lastName, role } | null,
    accessToken: string | null,
    isAuthenticated: boolean,
  },
  ui: {
    sidebarOpen: boolean,
    activeModal: string | null,
    notifications: { id, type, message }[],
  },
  api: { /* RTK Query cache — auto-managed */ }
}
```

### RTK Query Tag Types
`'Contact' | 'Deal' | 'Lead' | 'Activity' | 'Pipeline' | 'Report'`

Cache invalidation pattern:
- List cache: `{ type: 'Contact', id: 'LIST' }`
- Item cache: `{ type: 'Contact', id: itemId }`

---

## MUI + Tailwind Coexistence

`tailwind.config.ts` uses `important: '#__next'` to prevent reset conflicts.

**Use MUI for**: DataGrid, Dialog, Drawer, DatePicker, Select, Autocomplete, Avatar, Chip, Menu, Snackbar  
**Use Tailwind for**: flex/grid layouts, padding/margin, custom card styles, responsive breakpoints, color utilities

```tsx
// ✅ Correct — MUI component inside Tailwind layout
<div className="flex flex-col gap-4 p-6">
  <DataGrid rows={rows} columns={cols} />
</div>
```

---

## Docker Setup

```bash
# Development (hot reload, local mongo)
docker compose -f docker-compose.dev.yml up

# Production build
docker compose up --build
```

Services: `app` (Next.js), `mongo` (MongoDB 7), `nginx` (reverse proxy + SSL)

---

## Environment Variables

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=EuroCRM

# MongoDB
MONGODB_URI=mongodb://mongo:27017/eurocrm
MONGO_USER=admin
MONGO_PASS=changeme

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

---

## MVP Checklist (Phase 1)

- [ ] Project scaffolding (Next.js + TS + Tailwind + MUI + Redux)
- [ ] Docker Compose — dev + prod
- [ ] MongoDB connection singleton (`lib/db.ts`)
- [ ] All Mongoose models with indexes
- [ ] JWT auth — login, register, refresh, logout
- [ ] Next.js middleware route protection
- [ ] RTK Query base API with re-auth interceptor
- [ ] App shell — Sidebar, TopBar, dashboard layout
- [ ] Contacts — CRUD, search, MUI DataGrid, pagination
- [ ] Pipeline — 1 default pipeline, configurable stages
- [ ] Deals — CRUD, Kanban drag-and-drop, deal rotting
- [ ] Leads — inbox, convert to deal + contact
- [ ] Activities — create, complete, link to deal/contact
- [ ] Reports — pipeline summary, won/lost bar chart
- [ ] Role-based access: admin, manager, sales_rep

## Phase 2 (Post-MVP)

- [ ] Email sending & open/click tracking
- [ ] Email campaign module (Campaigns)
- [ ] Workflow automations (trigger → action)
- [ ] Multi-pipeline support
- [ ] Custom fields UI builder
- [ ] Public web forms / lead capture
- [ ] REST API + Webhooks
- [ ] GDPR data export / right-to-erasure

---

## Common Commands

```bash
# Install dependencies
pnpm install

# Dev server
pnpm dev

# Type check
pnpm tsc --noEmit

# Lint
pnpm lint

# Build
pnpm build

# Docker dev
docker compose -f docker-compose.dev.yml up --build

# Docker prod
docker compose up --build -d
```

---

## Key Utilities

```ts
// utils/formatters.ts

// Money (always use this — never raw numbers)
formatCurrency(10000, 'EUR')        // "€100,00"
formatCurrency(10000, 'GBP', 'en-GB') // "£100.00"

// Dates
formatDate('2025-03-04')            // "04 Mar 2025"
formatDate(new Date(), 'de-DE')     // "04.03.2025"
```

---

*Last updated: March 2026*