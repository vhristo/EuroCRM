'use client'

import { useCallback, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import { useGetDealsQuery, useMoveDealStageMutation, useCheckRottingMutation } from '@/store/api/dealsApi'
import type { IDeal } from '@/types/deal'
import PipelineColumn from './PipelineColumn'

interface PipelineBoardProps {
  pipelineId?: string
  onDealClick?: (deal: IDeal) => void
}

export default function PipelineBoard({ pipelineId, onDealClick }: PipelineBoardProps) {
  const { data: pipelines, isLoading: pipelinesLoading, isError: pipelinesError } = useGetPipelinesQuery()
  const activePipeline = pipelineId
    ? pipelines?.find((p) => p.id === pipelineId)
    : pipelines?.[0]

  const {
    data: dealsData,
    isLoading: dealsLoading,
    isError: dealsError,
  } = useGetDealsQuery(
    activePipeline ? { pipelineId: activePipeline.id, status: 'open' } : undefined,
    { skip: !activePipeline }
  )

  const [moveDealStage] = useMoveDealStageMutation()
  const [checkRotting] = useCheckRottingMutation()

  // Check deal rotting on board load
  useEffect(() => {
    if (activePipeline) {
      checkRotting()
    }
  }, [activePipeline, checkRotting])

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result

      // Dropped outside a column or same position
      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) return

      const targetStageId = destination.droppableId
      const targetStage = activePipeline?.stages.find((s) => s.id === targetStageId)
      if (!targetStage) return

      await moveDealStage({
        id: draggableId,
        data: {
          stage: targetStageId,
          probability: targetStage.probability,
        },
      })
    },
    [activePipeline, moveDealStage]
  )

  const isLoading = pipelinesLoading || dealsLoading
  const isError = pipelinesError || dealsError

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" height={400}>
        <CircularProgress />
      </Box>
    )
  }

  if (isError || !activePipeline) {
    return (
      <Alert severity="error">
        Failed to load pipeline. Please refresh the page.
      </Alert>
    )
  }

  const deals = dealsData?.items ?? []

  // Group deals by stage id
  const dealsByStage: Record<string, IDeal[]> = {}
  for (const stage of activePipeline.stages) {
    dealsByStage[stage.id] = []
  }
  for (const deal of deals) {
    if (dealsByStage[deal.stage]) {
      dealsByStage[deal.stage].push(deal)
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          pb: 2,
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.300',
            borderRadius: 3,
          },
        }}
      >
        {activePipeline.stages
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage[stage.id] ?? []}
              onDealClick={onDealClick}
            />
          ))}

        {activePipeline.stages.length === 0 && (
          <Typography color="text.secondary">
            No stages configured for this pipeline.
          </Typography>
        )}
      </Box>
    </DragDropContext>
  )
}
