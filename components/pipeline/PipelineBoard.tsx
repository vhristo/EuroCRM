'use client'

import { useCallback, useEffect } from 'react'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Box, CircularProgress, Typography, Alert } from '@mui/material'
import { useGetPipelinesQuery } from '@/store/api/pipelineApi'
import { useGetDealsQuery, useMoveDealStageMutation, useCheckRottingMutation } from '@/store/api/dealsApi'
import type { IDeal } from '@/types/deal'
import PipelineColumn from './PipelineColumn'

interface PipelineBoardProps {
  onDealClick?: (deal: IDeal) => void
}

export default function PipelineBoard({ onDealClick }: PipelineBoardProps) {
  const { data: pipelines, isLoading: pipelinesLoading, isError: pipelinesError } = useGetPipelinesQuery()
  const defaultPipeline = pipelines?.[0]

  const {
    data: dealsData,
    isLoading: dealsLoading,
    isError: dealsError,
  } = useGetDealsQuery(
    defaultPipeline ? { pipelineId: defaultPipeline.id, status: 'open' } : undefined,
    { skip: !defaultPipeline }
  )

  const [moveDealStage] = useMoveDealStageMutation()
  const [checkRotting] = useCheckRottingMutation()

  // Check deal rotting on board load
  useEffect(() => {
    if (defaultPipeline) {
      checkRotting()
    }
  }, [defaultPipeline, checkRotting])

  const onDragEnd = useCallback(
    async (result: DropResult) => {
      const { destination, source, draggableId } = result

      // Dropped outside a column or same position
      if (!destination) return
      if (destination.droppableId === source.droppableId && destination.index === source.index) return

      const targetStageId = destination.droppableId
      const targetStage = defaultPipeline?.stages.find((s) => s.id === targetStageId)
      if (!targetStage) return

      await moveDealStage({
        id: draggableId,
        data: {
          stage: targetStageId,
          probability: targetStage.probability,
        },
      })
    },
    [defaultPipeline, moveDealStage]
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

  if (isError || !defaultPipeline) {
    return (
      <Alert severity="error">
        Failed to load pipeline. Please refresh the page.
      </Alert>
    )
  }

  const deals = dealsData?.items ?? []

  // Group deals by stage id
  const dealsByStage: Record<string, IDeal[]> = {}
  for (const stage of defaultPipeline.stages) {
    dealsByStage[stage.id] = []
  }
  for (const deal of deals) {
    // stage field on a deal stores the stage id
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
          // Make scrollbar subtle
          '&::-webkit-scrollbar': { height: 6 },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.300',
            borderRadius: 3,
          },
        }}
      >
        {defaultPipeline.stages
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

        {defaultPipeline.stages.length === 0 && (
          <Typography color="text.secondary">
            No stages configured for this pipeline.
          </Typography>
        )}
      </Box>
    </DragDropContext>
  )
}
