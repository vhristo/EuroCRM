import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import { CreateWebFormSchema } from '@/lib/validators/webFormSchema'
import WebForm from '@/models/WebForm'
import { PAGINATION } from '@/utils/constants'

function serializeWebForm(doc: Record<string, unknown>): Record<string, unknown> {
  return {
    ...doc,
    id: String(doc._id),
    organizationId: String(doc.organizationId),
    _id: undefined,
    __v: undefined,
  }
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
  return `${base}-${nanoid(6)}`
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  await connectDB()

  const { searchParams } = req.nextUrl
  const page = Math.max(1, Number(searchParams.get('page')) || PAGINATION.DEFAULT_PAGE)
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Number(searchParams.get('limit')) || PAGINATION.DEFAULT_LIMIT)
  )
  const search = searchParams.get('search') || ''

  const filter: Record<string, unknown> = { organizationId: auth.organizationId }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ]
  }

  const [rawItems, total] = await Promise.all([
    WebForm.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<Record<string, unknown>[]>(),
    WebForm.countDocuments(filter),
  ])

  const items = rawItems.map(serializeWebForm)

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const parsed = CreateWebFormSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()

  const slug = generateSlug(parsed.data.name)

  const webForm = await WebForm.create({
    ...parsed.data,
    slug,
    organizationId: auth.organizationId,
  })

  const result = webForm.toObject() as Record<string, unknown>
  return NextResponse.json(serializeWebForm(result), { status: 201 })
}
