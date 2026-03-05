import { z } from 'zod'

export const SendEmailSchema = z.object({
  to: z.string().email('Must be a valid email address').toLowerCase().trim(),
  subject: z.string().min(1, 'Subject is required').max(998, 'Subject too long').trim(),
  htmlBody: z.string().min(1, 'Email body is required'),
  textBody: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
})

export type SendEmailInput = z.infer<typeof SendEmailSchema>

export const EmailConfigSchema = z.object({
  host: z.string().min(1, 'SMTP host is required').trim(),
  port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(587),
  secure: z.boolean().default(false),
  username: z.string().min(1, 'SMTP username is required').trim(),
  password: z.string().min(1, 'SMTP password is required'),
  fromName: z.string().min(1, 'From name is required').trim(),
  fromEmail: z
    .string()
    .email('Must be a valid email address')
    .toLowerCase()
    .trim(),
})

export type EmailConfigInput = z.infer<typeof EmailConfigSchema>
