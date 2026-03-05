/**
 * Shared serializers for V1 public API responses.
 * Converts Mongoose lean documents to plain IDs-as-strings objects.
 */

export function serializeContact(c: Record<string, unknown>): Record<string, unknown> {
  return {
    ...c,
    id: (c._id as { toString(): string }).toString(),
    _id: undefined,
    organizationId: (c.organizationId as { toString(): string }).toString(),
    ownerId: (c.ownerId as { toString(): string }).toString(),
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : c.updatedAt,
  }
}

export function serializeDeal(d: Record<string, unknown>): Record<string, unknown> {
  return {
    ...d,
    id: (d._id as { toString(): string }).toString(),
    _id: undefined,
    organizationId: (d.organizationId as { toString(): string }).toString(),
    pipelineId: (d.pipelineId as { toString(): string }).toString(),
    contactId: d.contactId
      ? (d.contactId as { toString(): string }).toString()
      : undefined,
    ownerId: (d.ownerId as { toString(): string }).toString(),
    expectedCloseDate:
      d.expectedCloseDate instanceof Date
        ? d.expectedCloseDate.toISOString()
        : d.expectedCloseDate ?? undefined,
    rottenSince:
      d.rottenSince instanceof Date ? d.rottenSince.toISOString() : d.rottenSince ?? null,
    stageEnteredAt:
      d.stageEnteredAt instanceof Date ? d.stageEnteredAt.toISOString() : d.stageEnteredAt,
    wonAt: d.wonAt instanceof Date ? d.wonAt.toISOString() : d.wonAt ?? undefined,
    lostAt: d.lostAt instanceof Date ? d.lostAt.toISOString() : d.lostAt ?? undefined,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  }
}

export function serializeLead(l: Record<string, unknown>): Record<string, unknown> {
  return {
    ...l,
    id: (l._id as { toString(): string }).toString(),
    _id: undefined,
    organizationId: (l.organizationId as { toString(): string }).toString(),
    ownerId: (l.ownerId as { toString(): string }).toString(),
    convertedToDealId: l.convertedToDealId
      ? (l.convertedToDealId as { toString(): string }).toString()
      : null,
    convertedToContactId: l.convertedToContactId
      ? (l.convertedToContactId as { toString(): string }).toString()
      : null,
    convertedAt:
      l.convertedAt instanceof Date ? l.convertedAt.toISOString() : l.convertedAt ?? undefined,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : l.createdAt,
    updatedAt: l.updatedAt instanceof Date ? l.updatedAt.toISOString() : l.updatedAt,
  }
}

export function serializeActivity(a: Record<string, unknown>): Record<string, unknown> {
  return {
    ...a,
    id: (a._id as { toString(): string }).toString(),
    _id: undefined,
    organizationId: (a.organizationId as { toString(): string }).toString(),
    ownerId: (a.ownerId as { toString(): string }).toString(),
    contactId: a.contactId
      ? (a.contactId as { toString(): string }).toString()
      : undefined,
    dealId: a.dealId
      ? (a.dealId as { toString(): string }).toString()
      : undefined,
    dueDate: a.dueDate instanceof Date ? a.dueDate.toISOString() : a.dueDate ?? undefined,
    doneAt: a.doneAt instanceof Date ? a.doneAt.toISOString() : a.doneAt ?? undefined,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    updatedAt: a.updatedAt instanceof Date ? a.updatedAt.toISOString() : a.updatedAt,
  }
}

export function serializePipeline(p: Record<string, unknown>): Record<string, unknown> {
  return {
    ...p,
    id: (p._id as { toString(): string }).toString(),
    _id: undefined,
    organizationId: (p.organizationId as { toString(): string }).toString(),
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
  }
}

/** Parse pagination params from a URLSearchParams object. */
export function parsePagination(searchParams: URLSearchParams): {
  page: number
  limit: number
  skip: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100)
  return { page, limit, skip: (page - 1) * limit }
}
