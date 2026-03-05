import { connectDB } from '@/lib/db'
import Contact from '@/models/Contact'
import Deal from '@/models/Deal'
import Activity from '@/models/Activity'
import Lead from '@/models/Lead'

export async function exportContactData(
  organizationId: string,
  contactId: string
): Promise<Record<string, unknown>> {
  await connectDB()

  // Fetch contact record — must be scoped to organizationId
  const contact = await Contact.findOne({
    _id: contactId,
    organizationId,
  }).lean<Record<string, unknown>>()

  if (!contact) {
    throw new Error('Contact not found')
  }

  // Fetch all deals linked to this contact within the same org
  const deals = await Deal.find({
    organizationId,
    contactId,
  })
    .lean<Record<string, unknown>[]>()
    .exec()

  // Fetch all activities linked to this contact within the same org
  const activities = await Activity.find({
    organizationId,
    contactId,
  })
    .lean<Record<string, unknown>[]>()
    .exec()

  // Fetch leads that converted to this contact within the same org
  const leads = await Lead.find({
    organizationId,
    convertedToContactId: contactId,
  })
    .lean<Record<string, unknown>[]>()
    .exec()

  const sanitize = (doc: Record<string, unknown>): Record<string, unknown> => {
    const { __v, ...rest } = doc
    void __v
    return rest
  }

  return {
    exportedAt: new Date().toISOString(),
    contact: sanitize(contact),
    deals: deals.map(sanitize),
    activities: activities.map(sanitize),
    leads: leads.map(sanitize),
  }
}
