# EuroCRM Documentation

EuroCRM is a PipeDrive-inspired CRM SaaS built for European SMBs and sales teams. It provides pipeline management, contact and deal tracking, a lead inbox, activity logging, email marketing, workflow automation, and reporting — all within a multi-tenant, role-based architecture.

---

## Key Features

| Feature | Description |
|---|---|
| **Pipeline Management** | Kanban board with drag-and-drop deal cards, configurable stages, probability tracking, and deal rotting alerts |
| **Contacts** | Full contact records with custom fields, tags, owner assignment, search, and pagination |
| **Deals** | Deal lifecycle management (open → won/lost), value tracking in cents, pipeline association, and contact linking |
| **Leads** | Incoming lead inbox with source tracking, status workflow, and one-click conversion to Contact + Deal |
| **Activities** | Schedule and log calls, emails, meetings, tasks, and notes against contacts or deals |
| **Email** | SMTP-based sending with open tracking (pixel) and click tracking (redirect), linked to contacts and deals |
| **Campaigns** | Bulk email campaigns with recipient filtering, merge tags, batch processing, and send statistics |
| **Web Forms** | Embeddable public forms that create leads on submission, with custom field mapping |
| **Automations** | Trigger-based workflows (deal events, contact events, form submissions) that execute actions automatically |
| **Custom Fields** | Organization-defined fields for contacts, deals, and leads — text, number, date, select, and more |
| **Reports** | Pipeline summary, revenue forecast, sales leaderboard, and dashboard KPIs |
| **REST API** | External API (v1) with API key authentication for integrations |
| **Webhooks** | Real-time event delivery with HMAC-SHA256 signatures and auto-disable on repeated failures |
| **GDPR Tools** | Data export and right-to-erasure (anonymization) for contacts |
| **Role-Based Access** | Three roles — admin, manager, sales_rep — with fine-grained permission enforcement |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode, no `any`) |
| State Management | Redux Toolkit + RTK Query |
| UI | Material UI v5 + Tailwind CSS |
| Database | MongoDB 7 via Mongoose ODM |
| Authentication | JWT (access token in memory, refresh token as HttpOnly cookie) |
| Validation | Zod on all API inputs |
| Forms | react-hook-form + zodResolver |
| Drag and Drop | @hello-pangea/dnd |
| Charts | recharts |
| Date Utilities | date-fns |
| Email | Nodemailer (SMTP) |
| Containerization | Docker + Docker Compose |
| Package Manager | pnpm |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker and Docker Compose (for containerized development)

### Install and run locally

```bash
# Clone the repository
git clone <repo-url>
cd eurocrm

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env — set JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY, and MONGODB_URI

# Start MongoDB locally (or use Docker)
# Then start the dev server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Run with Docker (recommended)

```bash
# Development — hot reload, local MongoDB
docker compose -f docker-compose.dev.yml up --build

# Production build
docker compose up --build -d
```

See [deployment.md](./deployment.md) for full environment variable reference and production setup.

---

## Environment Variables

The minimum required variables to run:

```env
MONGODB_URI=mongodb://localhost:27017/eurocrm
JWT_SECRET=<at least 32 characters>
JWT_REFRESH_SECRET=<at least 32 characters>
ENCRYPTION_KEY=<exactly 32 characters>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

See [deployment.md](./deployment.md) for the complete reference.

---

## Common Commands

```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm tsc --noEmit # TypeScript type check
```

---

## Documentation Index

### Features
- [Pipeline Management](./features/pipeline-management.md)
- [Contacts](./features/contacts.md)
- [Deals](./features/deals.md)
- [Leads](./features/leads.md)
- [Activities](./features/activities.md)
- [Email](./features/email.md)
- [Campaigns](./features/campaigns.md)
- [Web Forms](./features/web-forms.md)
- [Automations](./features/automations.md)
- [Custom Fields](./features/custom-fields.md)
- [Reports](./features/reports.md)
- [Settings](./features/settings.md)

### API and Integrations
- [REST API v1](./api/rest-api.md)
- [Webhooks](./api/webhooks.md)
- [Web Forms API](./api/web-forms-api.md)

### Reference
- [Authentication and Authorization](./auth.md)
- [GDPR Compliance](./gdpr.md)
- [Deployment Guide](./deployment.md)
