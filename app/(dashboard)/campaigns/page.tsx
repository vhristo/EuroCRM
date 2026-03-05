'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import { CampaignList } from '@/components/campaigns/CampaignList'
import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { useRouter } from 'next/navigation'
import type { ICampaign } from '@/types/campaign'

export default function CampaignsPage() {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  const handleSuccess = (campaign: ICampaign) => {
    setCreateOpen(false)
    // Navigate to the new campaign's detail page
    router.push(`/campaigns/${campaign.id}`)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Email Campaigns"
        actionLabel="New Campaign"
        onAction={() => setCreateOpen(true)}
      />

      <CampaignList />

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { p: 1 } }}
      >
        <DialogContent>
          <CampaignForm
            onSuccess={handleSuccess}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
