'use client'

import { Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, Typography, Chip, Box, Tooltip } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PersonIcon from '@mui/icons-material/Person'
import type { IDeal } from '@/types/deal'
import { formatCurrency } from '@/utils/formatters'

interface DealCardProps {
  deal: IDeal
  index: number
  contactName?: string
  onClick?: (deal: IDeal) => void
}

export default function DealCard({ deal, index, contactName, onClick }: DealCardProps) {
  const isRotten = !!deal.rottenSince

  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
          }}
        >
          <Card
            onClick={() => onClick?.(deal)}
            sx={{
              mb: 1,
              borderLeft: isRotten ? '3px solid' : '3px solid transparent',
              borderLeftColor: isRotten ? 'error.main' : 'transparent',
              backgroundColor: isRotten ? 'error.50' : 'background.paper',
              boxShadow: snapshot.isDragging ? 4 : 1,
              transition: 'box-shadow 0.15s ease',
              '&:hover': {
                boxShadow: 3,
              },
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              {/* Title row */}
              <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={0.5}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    flex: 1,
                  }}
                >
                  {deal.title}
                </Typography>
                {isRotten && (
                  <Tooltip title="Deal is rotten — no activity in a while">
                    <WarningAmberIcon
                      sx={{ fontSize: 16, color: 'error.main', flexShrink: 0, mt: 0.2 }}
                    />
                  </Tooltip>
                )}
              </Box>

              {/* Value */}
              <Typography
                variant="body2"
                color="primary.main"
                fontWeight={700}
                sx={{ mt: 0.5 }}
              >
                {formatCurrency(deal.value, deal.currency)}
              </Typography>

              {/* Footer row */}
              <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                {contactName ? (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <PersonIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {contactName}
                    </Typography>
                  </Box>
                ) : (
                  <span />
                )}

                <Chip
                  label={`${deal.probability}%`}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    backgroundColor:
                      deal.probability >= 75
                        ? 'success.100'
                        : deal.probability >= 40
                        ? 'warning.100'
                        : 'grey.100',
                    color:
                      deal.probability >= 75
                        ? 'success.800'
                        : deal.probability >= 40
                        ? 'warning.800'
                        : 'text.secondary',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}
