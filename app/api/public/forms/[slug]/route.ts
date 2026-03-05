import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { buildSubmissionSchema } from '@/lib/validators/webFormSchema'
import WebForm from '@/models/WebForm'
import type { IWebFormDocument } from '@/models/WebForm'
import Lead from '@/models/Lead'
import type { IWebFormField } from '@/types/webForm'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
}

interface RouteContext {
  params: Promise<{ slug: string }>
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

// GET — return public form definition (no sensitive data)
export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  await connectDB()

  const doc = await WebForm.findOne({ slug, active: true }).lean<IWebFormDocument>()

  if (!doc) {
    return NextResponse.json(
      { error: 'Form not found or inactive' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  // Return only public-safe fields
  const publicForm = {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    fields: doc.fields,
    styling: doc.styling,
    successMessage: doc.successMessage,
  }

  return NextResponse.json(publicForm, { headers: CORS_HEADERS })
}

// POST — handle form submission, create lead
export async function POST(req: NextRequest, context: RouteContext) {
  const { slug } = await context.params

  await connectDB()

  const doc = await WebForm.findOne({ slug, active: true }).lean<IWebFormDocument>()

  if (!doc) {
    return NextResponse.json(
      { error: 'Form not found or inactive' },
      { status: 404, headers: CORS_HEADERS }
    )
  }

  // Parse submission body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  // Validate against form field definitions
  const submissionSchema = buildSubmissionSchema(doc.fields)
  const parsed = submissionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const data = parsed.data as Record<string, string | undefined>

  // Map submission values to Lead fields using mapTo
  const leadData: Record<string, string | undefined> = {}
  for (const field of doc.fields as IWebFormField[]) {
    if (field.mapTo && data[field.name]) {
      leadData[field.mapTo] = data[field.name]
    }
  }

  // Build notes from unmapped fields
  const unmappedNotes = (doc.fields as IWebFormField[])
    .filter((f) => !f.mapTo && data[f.name])
    .map((f) => `${f.label}: ${data[f.name]}`)
    .join('\n')

  const combinedNotes = [leadData.notes, unmappedNotes].filter(Boolean).join('\n')

  // Require at minimum a name
  const leadName = leadData.name ?? data['name'] ?? 'Web Form Submission'

  // Find the organization's first admin user to assign as owner
  // We use a placeholder ownerId from the org — in production this would be
  // a configured default owner on the form itself
  const User = (await import('@/models/User')).default
  const orgOwner = await User.findOne({
    organizationId: doc.organizationId,
    role: 'admin',
  })
    .select('_id')
    .lean<{ _id: unknown }>()

  const ownerId = orgOwner?._id ?? doc.organizationId

  await Lead.create({
    organizationId: doc.organizationId,
    name: leadName,
    email: leadData.email,
    phone: leadData.phone,
    company: leadData.company,
    notes: combinedNotes || undefined,
    source: 'website',
    status: 'new',
    ownerId,
  })

  // Increment submissions counter
  await WebForm.updateOne({ _id: doc._id }, { $inc: { submissions: 1 } })

  return NextResponse.json(
    { success: true, message: doc.successMessage },
    { status: 201, headers: CORS_HEADERS }
  )
}
