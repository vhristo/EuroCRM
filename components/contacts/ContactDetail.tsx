'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  ArrowBack,
  Business,
  CloudDownload,
  Delete,
  DeleteForever,
  Edit,
  Email,
  Handshake,
  Language,
  LocationOn,
  Phone,
  WorkOutline,
} from '@mui/icons-material'
import { useDeleteContactMutation } from '@/store/api/contactsApi'
import { useGetDealsQuery } from '@/store/api/dealsApi'
import {
  useCreateDataRequestMutation,
  useLazyDownloadExportQuery,
} from '@/store/api/gdprApi'
import { ContactForm } from './ContactForm'
import ActivityTimeline from '@/components/activities/ActivityTimeline'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { LoadingOverlay } from '@/components/shared/LoadingOverlay'
import { ErasureConfirmDialog } from '@/components/settings/ErasureConfirmDialog'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useAppSelector } from '@/store/hooks'
import Link from 'next/link'
import type { IContact } from '@/types/contact'

interface ContactDetailProps {
  contact: IContact
}

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value?: string
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  if (!value) return null
  return (
    <Box display="flex" alignItems="flex-start" gap={1.5} py={0.75}>
      <Box color="text.secondary" mt={0.25} flexShrink={0}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  )
}

export function ContactDetail({ contact }: ContactDetailProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [gdprSuccessMsg, setGdprSuccessMsg] = useState<string | null>(null)
  const [erasureDialogOpen, setErasureDialogOpen] = useState(false)
  const [erasureRequestId, setErasureRequestId] = useState<string | null>(null)

  const currentUser = useAppSelector((state) => state.auth.user)
  const isAdmin = currentUser?.role === 'admin'
  const isAdminOrManager = isAdmin || currentUser?.role === 'manager'

  const [deleteContact, { isLoading: isDeleting }] = useDeleteContactMutation()
  const { data: contactDeals } = useGetDealsQuery({ contactId: contact.id })
  const [createRequest, { isLoading: isCreatingRequest }] = useCreateDataRequestMutation()
  const [triggerDownload] = useLazyDownloadExportQuery()

  const handleEditSuccess = () => {
    setEditOpen(false)
  }

  const handleDelete = async () => {
    try {
      await deleteContact(contact.id).unwrap()
      router.push('/contacts')
    } finally {
      setDeleteOpen(false)
    }
  }

  const handleGdprExport = useCallback(async () => {
    setGdprSuccessMsg(null)
    const result = await createRequest({ type: 'export', contactId: contact.id })
    if ('data' in result && result.data) {
      const downloadResult = await triggerDownload(result.data.id)
      if ('data' in downloadResult && downloadResult.data instanceof Blob) {
        const url = URL.createObjectURL(downloadResult.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `gdpr-export-${contact.id}-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setGdprSuccessMsg('Data export downloaded successfully.')
      }
    }
  }, [createRequest, triggerDownload, contact.id])

  const handleInitiateErasure = useCallback(async () => {
    setGdprSuccessMsg(null)
    const result = await createRequest({ type: 'erasure', contactId: contact.id })
    if ('data' in result && result.data) {
      setErasureRequestId(result.data.id)
      setErasureDialogOpen(true)
    }
  }, [createRequest, contact.id])

  const handleErasureSuccess = useCallback((anonymizedFields: string[]) => {
    setErasureDialogOpen(false)
    setErasureRequestId(null)
    setGdprSuccessMsg(
      `Erasure completed. ${anonymizedFields.length} field groups have been anonymized.`
    )
  }, [])

  const initials =
    `${contact.firstName[0] ?? ''}${contact.lastName[0] ?? ''}`.toUpperCase()
  const fullName = `${contact.firstName} ${contact.lastName}`
  const fullLocation = [contact.city, contact.country].filter(Boolean).join(', ')

  return (
    <Box>
      <LoadingOverlay open={isDeleting} message="Deleting contact..." />

      {gdprSuccessMsg && (
        <Alert severity="success" onClose={() => setGdprSuccessMsg(null)} sx={{ mb: 2 }}>
          {gdprSuccessMsg}
        </Alert>
      )}

      {/* Header toolbar */}
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <Tooltip title="Back to Contacts">
          <IconButton onClick={() => router.push('/contacts')} size="small">
            <ArrowBack />
          </IconButton>
        </Tooltip>
        <Typography variant="h5" fontWeight={600} flex={1}>
          {fullName}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={() => setEditOpen(true)}
          size="small"
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={() => setDeleteOpen(true)}
          size="small"
        >
          Delete
        </Button>

        {isAdminOrManager && (
          <Tooltip title="Export all personal data for this contact (GDPR Art. 15)">
            <Button
              variant="outlined"
              startIcon={<CloudDownload />}
              onClick={handleGdprExport}
              size="small"
              disabled={isCreatingRequest}
            >
              Export Data
            </Button>
          </Tooltip>
        )}

        {isAdmin && (
          <Tooltip title="Anonymize this contact's personal data (GDPR Art. 17 — Right to Erasure)">
            <Button
              variant="outlined"
              color="warning"
              startIcon={<DeleteForever />}
              onClick={handleInitiateErasure}
              size="small"
              disabled={isCreatingRequest}
            >
              Right to Erasure
            </Button>
          </Tooltip>
        )}
      </Stack>

      <Grid container spacing={3}>
        {/* Left column — avatar + core info */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
              <Avatar sx={{ width: 72, height: 72, fontSize: 28, mb: 1.5 }}>
                {initials}
              </Avatar>
              <Typography variant="h6" fontWeight={600}>
                {fullName}
              </Typography>
              {contact.jobTitle && (
                <Typography variant="body2" color="text.secondary">
                  {contact.jobTitle}
                </Typography>
              )}
              {contact.company && (
                <Typography variant="body2" color="text.secondary">
                  {contact.company}
                </Typography>
              )}
            </Box>

            <Divider sx={{ mb: 2 }} />

            <InfoRow
              icon={<Email fontSize="small" />}
              label="Email"
              value={contact.email}
            />
            <InfoRow
              icon={<Phone fontSize="small" />}
              label="Phone"
              value={contact.phone}
            />
            <InfoRow
              icon={<Business fontSize="small" />}
              label="Company"
              value={contact.company}
            />
            <InfoRow
              icon={<WorkOutline fontSize="small" />}
              label="Job Title"
              value={contact.jobTitle}
            />
            <InfoRow
              icon={<LocationOn fontSize="small" />}
              label="Location"
              value={fullLocation || undefined}
            />
            <InfoRow
              icon={<Language fontSize="small" />}
              label="Currency"
              value={contact.currency}
            />
          </Box>
        </Grid>

        {/* Right column — tags, notes, address, meta */}
        <Grid item xs={12} md={8}>
          {contact.tags.length > 0 && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                Tags
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {contact.tags.map((tag) => (
                  <Chip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          {contact.notes && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                Notes
              </Typography>
              <Typography variant="body2" whiteSpace="pre-wrap">
                {contact.notes}
              </Typography>
            </Box>
          )}

          {contact.address && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                mb: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                Address
              </Typography>
              <Typography variant="body2">{contact.address}</Typography>
            </Box>
          )}

          {/* Record metadata */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Record Details
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Created
                </Typography>
                <Typography variant="body2">{formatDate(contact.createdAt)}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary" display="block">
                  Last Updated
                </Typography>
                <Typography variant="body2">{formatDate(contact.updatedAt)}</Typography>
              </Grid>
            </Grid>
          </Box>

          {/* Linked Deals */}
          {contactDeals && contactDeals.items.length > 0 && (
            <Box
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                p: 3,
                mt: 3,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
                Deals ({contactDeals.items.length})
              </Typography>
              <Stack spacing={1}>
                {contactDeals.items.map((deal) => (
                  <Box
                    key={deal.id}
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: 'grey.50',
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Handshake fontSize="small" color="action" />
                      <Typography
                        variant="body2"
                        fontWeight={500}
                        component={Link}
                        href={`/deals/${deal.id}`}
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {deal.title}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={deal.status} size="small" color={deal.status === 'won' ? 'success' : deal.status === 'lost' ? 'error' : 'info'} />
                      <Typography variant="body2" fontWeight={600}>
                        {formatCurrency(deal.value, deal.currency)}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Activities */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 3,
              mt: 3,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Activities
            </Typography>
            <ActivityTimeline contactId={contact.id} />
          </Box>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { p: 1 } }}
      >
        <DialogContent>
          <ContactForm
            contact={contact}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        title="Delete Contact"
        message={`Are you sure you want to delete ${fullName}? This action cannot be undone.`}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      {/* GDPR Erasure Confirmation Dialog */}
      {erasureRequestId && (
        <ErasureConfirmDialog
          open={erasureDialogOpen}
          requestId={erasureRequestId}
          contactName={fullName}
          contactEmail={contact.email ?? 'unknown'}
          onClose={() => {
            setErasureDialogOpen(false)
            setErasureRequestId(null)
          }}
          onSuccess={handleErasureSuccess}
        />
      )}
    </Box>
  )
}
