# Reports

EuroCRM provides several built-in reports for understanding pipeline health, forecasting revenue, measuring team performance, and tracking daily KPIs.

---

## Dashboard Overview

**Endpoint:** `GET /api/reports/dashboard`

Returns four headline KPIs for the authenticated user's organization:

| Field | Description |
|---|---|
| `totalContacts` | Total number of contacts in the organization |
| `openDeals` | Number of deals with `status: 'open'` |
| `pipelineValue` | Sum of `value` (in cents) for all open deals |
| `activitiesDue` | Number of incomplete activities with `dueDate <= now` |

All figures are scoped to the authenticated user's organization. The dashboard page displays these alongside a summary of recent activities and a quick-access panel.

---

## Pipeline Summary

**Endpoint:** `GET /api/reports/pipeline-summary`

**Query Parameters:**

| Parameter | Description |
|---|---|
| `pipelineId` | Optional. Filter to a specific pipeline. If omitted, shows all open deals across all pipelines. |

Returns a breakdown of open deals grouped by stage:

```json
{
  "stages": [
    {
      "stage": "lead",
      "count": 12,
      "totalValue": 1200000,
      "avgProbability": 20,
      "weightedValue": 240000
    }
  ],
  "totals": {
    "totalDeals": 45,
    "totalValue": 4500000,
    "totalWeightedValue": 1350000
  }
}
```

| Field | Description |
|---|---|
| `stage` | Stage ID/name |
| `count` | Number of deals in this stage |
| `totalValue` | Sum of deal values in cents |
| `avgProbability` | Average win probability (%) across deals in this stage |
| `weightedValue` | Probability-weighted value: `sum(value * probability / 100)`, rounded to integer |
| `totals.totalDeals` | Total open deals |
| `totals.totalValue` | Total pipeline value in cents |
| `totals.totalWeightedValue` | Total weighted forecast value in cents |

Values are always in cents — use `formatCurrency()` to display them.

---

## Revenue Forecast

**Endpoint:** `GET /api/reports/revenue-forecast`

Projects expected revenue by month based on `expectedCloseDate` and `probability` of open deals.

The response groups open deals by their expected close month and calculates:
- Total deal value per month
- Probability-weighted forecast per month

This is the data source for the revenue forecast bar chart on the Reports page (rendered by `SalesChart`).

---

## Sales Leaderboard

**Endpoint:** `GET /api/reports/leaderboard`

Ranks users in the organization by their sales performance. Returns a list ordered by won deal value descending.

For each user:

| Field | Description |
|---|---|
| `userId` | User ID |
| `firstName` | User's first name |
| `lastName` | User's last name |
| `wonDeals` | Number of deals marked won in the period |
| `totalWonValue` | Sum of won deal values in cents |
| `openDeals` | Number of currently open deals |
| `openPipelineValue` | Sum of open deal values in cents |

---

## Display Utilities

All monetary values from reports are in cents. Use the `formatCurrency` utility:

```ts
import { formatCurrency } from '@/utils/formatters'

formatCurrency(1350000, 'EUR')   // "€13.500,00" (German locale)
formatCurrency(1350000, 'GBP', 'en-GB') // "£13,500.00"
```

The default locale is `de-DE` for EUR values (European formatting convention).

---

## RBAC Notes

All report endpoints require authentication. Results are always scoped to the authenticated user's organization. Sales reps see organization-wide reports (not just their own data) but cannot see users or settings.

---

## API Routes (Internal)

| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/dashboard` | Dashboard KPI metrics |
| GET | `/api/reports/pipeline-summary` | Pipeline breakdown by stage |
| GET | `/api/reports/revenue-forecast` | Monthly revenue forecast |
| GET | `/api/reports/leaderboard` | Sales leaderboard |

---

## Related

- [Deals](./deals.md) — the primary data source for all deal-based reports
- [Activities](./activities.md) — contributes to `activitiesDue` KPI
- [Contacts](./contacts.md) — contributes to `totalContacts` KPI
- [Pipeline Management](./pipeline-management.md) — filter pipeline-summary by pipeline
