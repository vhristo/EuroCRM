import nodemailer, { Transporter } from 'nodemailer'
import { decrypt } from '@/lib/encryption'
import type { IEmailConfigDocument } from '@/models/EmailConfig'

export interface SendEmailOptions {
  to: string
  subject: string
  htmlBody: string
  textBody?: string
  trackingId: string
}

/**
 * Creates a Nodemailer transporter from a stored EmailConfig document.
 * Decrypts the password before use.
 */
export function createTransporter(config: IEmailConfigDocument): Transporter {
  const password = decrypt(config.encryptedPassword)

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: password,
    },
  })
}

/**
 * Sends an email and returns the message info from Nodemailer.
 * Throws on SMTP error — the caller is responsible for recording failure.
 */
export async function sendEmail(
  config: IEmailConfigDocument,
  options: SendEmailOptions
): Promise<nodemailer.SentMessageInfo> {
  const transporter = createTransporter(config)

  const from = `${config.fromName} <${config.fromEmail}>`
  const html = injectTrackingPixel(rewriteLinks(options.htmlBody, options.trackingId), options.trackingId)

  const info = await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html,
    text: options.textBody,
  })

  return info
}

/**
 * Tests an SMTP connection by creating a transporter and calling verify().
 */
export async function testSmtpConnection(config: IEmailConfigDocument): Promise<void> {
  const transporter = createTransporter(config)
  await transporter.verify()
}

/**
 * Appends a 1x1 transparent tracking pixel to the HTML body.
 * The pixel hits /api/email/track/open?tid=<trackingId>.
 */
export function injectTrackingPixel(html: string, trackingId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const pixelUrl = `${appUrl}/api/email/track/open?tid=${encodeURIComponent(trackingId)}`
  const pixel = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none;" />`

  // Inject before </body> if it exists, otherwise append
  if (html.toLowerCase().includes('</body>')) {
    return html.replace(/<\/body>/i, `${pixel}</body>`)
  }
  return html + pixel
}

/**
 * Rewrites all <a href="..."> links to go through the click tracker.
 * Pattern: /api/email/track/click?tid=<trackingId>&url=<encodedUrl>
 */
export function rewriteLinks(html: string, trackingId: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return html.replace(/<a\s+([^>]*?)href=["']([^"']+)["']/gi, (match, attrs: string, url: string) => {
    // Do not rewrite already-rewritten tracker links or mailto/tel links
    if (
      url.startsWith('mailto:') ||
      url.startsWith('tel:') ||
      url.includes('/api/email/track/')
    ) {
      return match
    }

    const trackUrl = `${appUrl}/api/email/track/click?tid=${encodeURIComponent(trackingId)}&url=${encodeURIComponent(url)}`
    return `<a ${attrs}href="${trackUrl}"`
  })
}
