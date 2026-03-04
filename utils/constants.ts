export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALES_REP: 'sales_rep',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const DEAL_STATUSES = {
  OPEN: 'open',
  WON: 'won',
  LOST: 'lost',
} as const

export type DealStatus = (typeof DEAL_STATUSES)[keyof typeof DEAL_STATUSES]

export const LEAD_STATUSES = {
  NEW: 'new',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  UNQUALIFIED: 'unqualified',
  CONVERTED: 'converted',
} as const

export type LeadStatus = (typeof LEAD_STATUSES)[keyof typeof LEAD_STATUSES]

export const ACTIVITY_TYPES = {
  CALL: 'call',
  EMAIL: 'email',
  MEETING: 'meeting',
  TASK: 'task',
  NOTE: 'note',
} as const

export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES]

export const LEAD_SOURCES = [
  'website',
  'referral',
  'cold_call',
  'email_campaign',
  'social_media',
  'trade_show',
  'other',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const CURRENCIES = [
  'EUR', 'GBP', 'USD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'RON', 'BGN', 'HUF',
] as const

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'Lead In', order: 0, probability: 10, rotDays: 14 },
  { name: 'Contact Made', order: 1, probability: 20, rotDays: 10 },
  { name: 'Proposal', order: 2, probability: 50, rotDays: 14 },
  { name: 'Negotiation', order: 3, probability: 75, rotDays: 7 },
  { name: 'Closed Won', order: 4, probability: 100, rotDays: 0 },
  { name: 'Closed Lost', order: 5, probability: 0, rotDays: 0 },
] as const
