'use client'

import { useState } from 'react'
import { Dialog, DialogTitle, DialogContent } from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import PipelineBoard from '@/components/pipeline/PipelineBoard'
import DealForm from '@/components/deals/DealForm'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import type { IDeal } from '@/types/deal'
import { useRouter } from 'next/navigation'

export default function PipelinePage() {
  const router = useRouter()
  const [addOpen, setAddOpen] = useState(false)

  const { data: pipelines } = useGetPipelinesQuery()
  const defaultPipelineId = pipelines?.[0]?.id ?? ''

  const handleDealClick = (deal: IDeal) => {
    router.push(`/deals/${deal.id}`)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Pipeline"
        actionLabel="Add Deal"
        onAction={() => setAddOpen(true)}
      />

      {/* Board fills remaining vertical space */}
      <div className="flex-1 overflow-hidden">
        <PipelineBoard onDealClick={handleDealClick} />
      </div>

      {/* Add Deal Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Deal</DialogTitle>
        <DialogContent>
          {defaultPipelineId && (
            <DealForm
              pipelineId={defaultPipelineId}
              onSuccess={() => setAddOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
