'use client'

import { Droppable } from '@hello-pangea/dnd'
import { Box, Typography, Divider, Paper } from '@mui/material'
import type { IPipelineStage } from '@/types/pipeline'
import type { IDeal } from '@/types/deal'
import DealCard from './DealCard'
import { formatCurrency } from '@/utils/formatters'

interface PipelineColumnProps {
  stage: IPipelineStage
  deals: IDeal[]
  contactNames?: Record<string, string>
  onDealClick?: (deal: IDeal) => void
}

export default function PipelineColumn({
  stage,
  deals,
  contactNames = {},
  onDealClick,
}: PipelineColumnProps) {
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)
  // Use the first deal's currency for formatting, fall back to EUR
  const currency = deals[0]?.currency ?? 'EUR'

  return (
    <Paper
      elevation={0}
      sx={{
        width: { xs: 240, sm: 260 },
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'grey.50',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        maxHeight: '100%',
      }}
    >
      {/* Column header */}
      <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
            {stage.name}
          </Typography>
          <Box
            sx={{
              ml: 1,
              px: 0.75,
              py: 0.1,
              borderRadius: 10,
              backgroundColor: 'primary.100',
              color: 'primary.800',
              fontSize: '0.7rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {deals.length}
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
          {deals.length > 0 ? formatCurrency(totalValue, currency) : '—'}
        </Typography>
      </Box>

      <Divider />

      {/* Droppable deal list */}
      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 1,
              py: 1,
              minHeight: 80,
              backgroundColor: snapshot.isDraggingOver ? 'primary.50' : 'transparent',
              transition: 'background-color 0.15s ease',
            }}
          >
            {deals.map((deal, index) => (
              <DealCard
                key={deal.id}
                deal={deal}
                index={index}
                contactName={deal.contactId ? contactNames[deal.contactId] : undefined}
                onClick={onDealClick}
              />
            ))}
            {provided.placeholder}

            {deals.length === 0 && !snapshot.isDraggingOver && (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', textAlign: 'center', mt: 2 }}
              >
                Drop deals here
              </Typography>
            )}
          </Box>
        )}
      </Droppable>
    </Paper>
  )
}
