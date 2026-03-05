import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import { requireAuth, unauthorizedResponse } from '@/lib/auth'
import WebForm from '@/models/WebForm'
import type { IWebFormDocument } from '@/models/WebForm'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, context: RouteContext) {
  const auth = await requireAuth(req)
  if (!auth) return unauthorizedResponse()

  const { id } = await context.params

  await connectDB()

  const doc = await WebForm.findOne({
    _id: id,
    organizationId: auth.organizationId,
  }).lean<IWebFormDocument>()

  if (!doc) {
    return NextResponse.json({ error: 'Web form not found' }, { status: 404 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const slug = doc.slug

  const iframeCode = `<iframe
  src="${appUrl}/embed/forms/${slug}"
  width="100%"
  height="600"
  frameborder="0"
  style="border:none;max-width:640px;width:100%;"
  title="${doc.name}"
></iframe>`

  const jsSnippetCode = `<div id="eurocrm-form-${slug}"></div>
<script>
(function() {
  var script = document.createElement('script');
  script.src = '${appUrl}/api/public/forms/${slug}/embed.js';
  script.async = true;
  document.head.appendChild(script);
})();
</script>`

  return NextResponse.json({
    slug,
    iframeCode,
    jsSnippetCode,
    directUrl: `${appUrl}/embed/forms/${slug}`,
  })
}
