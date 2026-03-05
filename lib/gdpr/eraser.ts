import { connectDB } from '@/lib/db'
import Contact from '@/models/Contact'
import Deal from '@/models/Deal'
import Activity from '@/models/Activity'

export async function anonymizeContact(
  organizationId: string,
  contactId: string
): Promise<string[]> {
  await connectDB()

  const anonymizedFields: string[] = []

  // Verify contact exists and belongs to the organization
  const contact = await Contact.findOne({ _id: contactId, organizationId })
  if (!contact) {
    throw new Error('Contact not found')
  }

  // Anonymize PII fields on the contact record
  // Business-relevant fields (currency, ownerId, organizationId) are preserved
  const contactUpdates: Record<string, unknown> = {
    firstName: 'REDACTED',
    lastName: 'REDACTED',
    email: `redacted-${contactId}@deleted.invalid`,
    phone: null,
    address: null,
    notes: null,
    tags: [],
  }

  // Conditionally null out optional PII fields that may be set
  if (contact.company !== undefined) {
    contactUpdates.company = null
    anonymizedFields.push('contact.company')
  }
  if (contact.jobTitle !== undefined) {
    contactUpdates.jobTitle = null
    anonymizedFields.push('contact.jobTitle')
  }
  if (contact.city !== undefined) {
    contactUpdates.city = null
    anonymizedFields.push('contact.city')
  }
  if (contact.country !== undefined) {
    contactUpdates.country = null
    anonymizedFields.push('contact.country')
  }
  if (contact.customFields !== undefined) {
    contactUpdates.customFields = {}
    anonymizedFields.push('contact.customFields')
  }

  anonymizedFields.push(
    'contact.firstName',
    'contact.lastName',
    'contact.email',
    'contact.phone',
    'contact.address',
    'contact.notes',
    'contact.tags'
  )

  await Contact.updateOne(
    { _id: contactId, organizationId },
    { $set: contactUpdates }
  )

  // Clear contactId reference from deals (preserves deal business data)
  const dealsResult = await Deal.updateMany(
    { organizationId, contactId },
    { $unset: { contactId: '' } }
  )

  if (dealsResult.modifiedCount > 0) {
    anonymizedFields.push(`deals.contactId (${dealsResult.modifiedCount} deals unlinked)`)
  }

  // Remove personal references from activity descriptions linked to this contact
  // Keep activity records intact for business audit purposes but clear contactId
  const activitiesResult = await Activity.updateMany(
    { organizationId, contactId },
    {
      $unset: { contactId: '' },
      $set: { description: '[Redacted - contact data erased per GDPR request]' },
    }
  )

  if (activitiesResult.modifiedCount > 0) {
    anonymizedFields.push(
      `activities.contactId (${activitiesResult.modifiedCount} activities unlinked)`,
      `activities.description (${activitiesResult.modifiedCount} activities redacted)`
    )
  }

  return anonymizedFields
}
