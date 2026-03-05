export interface IEmailOpen {
  timestamp: string
  ip?: string
  userAgent?: string
}

export interface IEmailClick {
  timestamp: string
  url: string
  ip?: string
  userAgent?: string
}

export interface IEmailMessage {
  id: string
  organizationId: string
  to: string
  from: string
  subject: string
  htmlBody: string
  textBody?: string
  contactId?: string
  dealId?: string
  trackingId: string
  status: 'queued' | 'sent' | 'failed'
  errorMessage?: string
  opens: IEmailOpen[]
  clicks: IEmailClick[]
  sentAt?: string
  senderId: string
  createdAt: string
  updatedAt: string
}

export interface IEmailConfig {
  id: string
  organizationId: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromName: string
  fromEmail: string
  createdAt: string
  updatedAt: string
}

export interface ISendEmailPayload {
  to: string
  subject: string
  htmlBody: string
  textBody?: string
  contactId?: string
  dealId?: string
}

export interface IEmailListResponse {
  items: IEmailMessage[]
  total: number
  page: number
  limit: number
}
