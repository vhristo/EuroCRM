export interface ICampaignRecipientFilter {
  tags?: string[]
  ownerId?: string
  country?: string
}

export interface ICampaignStats {
  totalRecipients: number
  sent: number
  opened: number
  clicked: number
  failed: number
}

export interface ICampaign {
  id: string
  organizationId: string
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  recipientFilter: ICampaignRecipientFilter
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused'
  scheduledAt?: string
  stats: ICampaignStats
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ICampaignRecipient {
  id: string
  campaignId: string
  organizationId: string
  contactId: string
  email: string
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked'
  sentAt?: string
  openedAt?: string
  clickedAt?: string
  errorMessage?: string
}
