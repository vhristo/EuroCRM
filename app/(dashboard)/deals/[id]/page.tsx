'use client'

import { useParams, useRouter } from 'next/navigation'
import { Box, Button, CircularProgress, Alert, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useGetDealQuery } from '@/store/api/dealsApi'
import DealDetail from '@/components/deals/DealDetail'

export default function DealPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: deal, isLoading, isError } = useGetDealQuery(id)

  return (
    <div className="flex flex-col gap-4">
      {/* Back button */}
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/deals')}
          variant="text"
          size="small"
          sx={{ color: 'text.secondary' }}
        >
          Back to Deals
        </Button>
      </Box>

      {isLoading && (
        <Box display="flex" alignItems="center" justifyContent="center" height={300}>
          <CircularProgress />
        </Box>
      )}

      {isError && (
        <Alert severity="error">
          <Typography fontWeight={600}>Deal not found</Typography>
          <Typography variant="body2">
            This deal may have been deleted or you may not have access to it.
          </Typography>
        </Alert>
      )}

      {deal && <DealDetail deal={deal} />}
    </div>
  )
}
