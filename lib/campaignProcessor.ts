import { connectDB } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import Campaign from '@/models/Campaign'
import CampaignRecipient from '@/models/CampaignRecipient'
import Contact from '@/models/Contact'
import EmailConfig from '@/models/EmailConfig'
import type { IContactDocument } from '@/models/Contact'
import type { Types } from 'mongoose'

// ---------------------------------------------------------------------------
// Merge tag replacement
// ---------------------------------------------------------------------------

interface MergeContact {
  firstName?: string
  lastName?: string
  email?: string
  company?: string
}

/**
 * Replaces {{firstName}}, {{lastName}}, {{email}}, {{company}} merge tags
 * with actual contact values. Falls back to empty string when undefined.
 */
export function replaceMergeTags(html: string, contact: MergeContact): string {
  return html
    .replace(/\{\{firstName\}\}/g, contact.firstName ?? '')
    .replace(/\{\{lastName\}\}/g, contact.lastName ?? '')
    .replace(/\{\{email\}\}/g, contact.email ?? '')
    .replace(/\{\{company\}\}/g, contact.company ?? '')
}

// ---------------------------------------------------------------------------
// Batch processor
// ---------------------------------------------------------------------------

/**
 * Fetches up to `batchSize` pending recipients for a campaign and attempts to
 * send each one via the org's configured SMTP.  Updates recipient statuses and
 * campaign stats in place.  Sets campaign status to 'sent' when all recipients
 * have been processed.
 */
export async function processCampaignBatch(
  campaignId: string,
  orgId: string,
  batchSize = 50
): Promise<{ sent: number; failed: number }> {
  await connectDB()

  // Load campaign
  const campaign = await Campaign.findOne({
    _id: campaignId,
    organizationId: orgId,
  })

  if (!campaign) {
    throw new Error(`Campaign not found: ${campaignId}`)
  }

  if (campaign.status !== 'sending') {
    return { sent: 0, failed: 0 }
  }

  // Load SMTP config for this org
  const emailConfig = await EmailConfig.findOne({ organizationId: orgId })
  if (!emailConfig) {
    throw new Error('No email configuration found for organisation')
  }

  // Fetch a batch of pending recipients
  const pendingRecipients = await CampaignRecipient.find({
    campaignId,
    organizationId: orgId,
    status: 'pending',
  }).limit(batchSize)

  if (pendingRecipients.length === 0) {
    // All recipients processed — mark campaign as sent
    await Campaign.updateOne(
      { _id: campaignId, organizationId: orgId },
      { $set: { status: 'sent' } }
    )
    return { sent: 0, failed: 0 }
  }

  let sentCount = 0
  let failedCount = 0

  for (const recipient of pendingRecipients) {
    // Load contact for merge tags
    const contact = await Contact.findOne({
      _id: recipient.contactId,
      organizationId: orgId,
    }).lean<Record<string, unknown>>()

    const mergeContact: MergeContact = contact
      ? {
          firstName: contact.firstName as string | undefined,
          lastName: contact.lastName as string | undefined,
          email: contact.email as string | undefined,
          company: contact.company as string | undefined,
        }
      : { email: recipient.email }

    const personalizedHtml = replaceMergeTags(campaign.htmlBody, mergeContact)
    const personalizedText = campaign.textBody
      ? replaceMergeTags(campaign.textBody, mergeContact)
      : undefined

    try {
      await sendEmail(emailConfig, {
        to: recipient.email,
        subject: campaign.subject,
        htmlBody: personalizedHtml,
        textBody: personalizedText,
        trackingId: recipient._id.toString(),
      })

      await CampaignRecipient.updateOne(
        { _id: recipient._id },
        { $set: { status: 'sent', sentAt: new Date() } }
      )

      sentCount++
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown send error'
      await CampaignRecipient.updateOne(
        { _id: recipient._id },
        { $set: { status: 'failed', errorMessage: message } }
      )
      failedCount++
    }
  }

  // Update campaign stats atomically
  await Campaign.updateOne(
    { _id: campaignId, organizationId: orgId },
    {
      $inc: {
        'stats.sent': sentCount,
        'stats.failed': failedCount,
      },
    }
  )

  // Check whether all recipients are now processed
  const remainingPending = await CampaignRecipient.countDocuments({
    campaignId,
    organizationId: orgId,
    status: 'pending',
  })

  if (remainingPending === 0 && campaign.status === 'sending') {
    await Campaign.updateOne(
      { _id: campaignId, organizationId: orgId },
      { $set: { status: 'sent' } }
    )
  }

  return { sent: sentCount, failed: failedCount }
}

// ---------------------------------------------------------------------------
// Helper: build recipient list from contact filter
// ---------------------------------------------------------------------------

interface RecipientFilter {
  tags?: string[]
  ownerId?: string
  country?: string
}

/**
 * Queries contacts matching the campaign recipient filter (scoped to orgId),
 * creates CampaignRecipient documents for those with an email address, and
 * returns the total count created.
 */
export async function buildRecipientList(
  campaignId: string,
  orgId: string,
  filter: RecipientFilter
): Promise<number> {
  await connectDB()

  const contactFilter: Record<string, unknown> = {
    organizationId: orgId,
    email: { $exists: true, $ne: '' },
  }

  if (filter.tags && filter.tags.length > 0) {
    contactFilter.tags = { $in: filter.tags }
  }
  if (filter.ownerId) {
    contactFilter.ownerId = filter.ownerId
  }
  if (filter.country) {
    contactFilter.country = filter.country
  }

  const contacts = await Contact.find(contactFilter)
    .select('_id email')
    .lean<Array<Pick<IContactDocument, 'email'> & { _id: Types.ObjectId }>>()

  const emailedContacts = contacts.filter(
    (c): c is typeof c & { email: string } => Boolean(c.email)
  )

  if (emailedContacts.length === 0) return 0

  const recipients = emailedContacts.map((c) => ({
    campaignId,
    organizationId: orgId,
    contactId: c._id.toString(),
    email: c.email,
    status: 'pending' as const,
  }))

  await CampaignRecipient.insertMany(recipients, { ordered: false })

  await Campaign.updateOne(
    { _id: campaignId, organizationId: orgId },
    { $set: { 'stats.totalRecipients': emailedContacts.length } }
  )

  return emailedContacts.length
}
