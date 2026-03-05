'use client'

import { useState, useCallback } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  CloudDownload,
  DeleteForever,
  Search,
} from '@mui/icons-material'
import { useGetContactsQuery } from '@/store/api/contactsApi'
import {
  useCreateDataRequestMutation,
  useListDataRequestsQuery,
  useLazyDownloadExportQuery,
} from '@/store/api/gdprApi'
import { ErasureConfirmDialog } from './ErasureConfirmDialog'
import { formatDate } from '@/utils/formatters'
import type { IContact } from '@/types/contact'
import type { IDataRequest } from '@/types/gdpr'

type StatusColor = 'default' | 'warning' | 'info' | 'success' | 'error'

function statusChipColor(status: IDataRequest['status']): StatusColor {
  const map: Record<IDataRequest['status'], StatusColor> = {
    pending: 'default',
    processing: 'warning',
    completed: 'success',
    failed: 'error',
  }
  return map[status]
}

export function GdprManager() {
  const [search, setSearch] = useState('')
  const [selectedContact, setSelectedContact] = useState<IContact | null>(null)
  const [erasureDialogOpen, setErasureDialogOpen] = useState(false)
  const [erasurePendingRequestId, setErasurePendingRequestId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { data: contactsData, isFetching: searchingContacts } = useGetContactsQuery(
    search.length >= 2 ? { search, limit: 10 } : undefined,
    { skip: search.length < 2 }
  )

  const { data: requestsData, isFetching: loadingRequests } =
    useListDataRequestsQuery({ limit: 50 })

  const [createRequest, { isLoading: isCreating }] = useCreateDataRequestMutation()
  const [triggerDownload] = useLazyDownloadExportQuery()

  const handleExport = useCallback(
    async (contact: IContact) => {
      setSuccessMessage(null)

      const result = await createRequest({ type: 'export', contactId: contact.id })

      if ('data' in result && result.data) {
        const requestId = result.data.id
        // Trigger download immediately
        const downloadResult = await triggerDownload(requestId)

        if ('data' in downloadResult && downloadResult.data instanceof Blob) {
          const url = URL.createObjectURL(downloadResult.data)
          const a = document.createElement('a')
          a.href = url
          a.download = `gdpr-export-${contact.id}-${Date.now()}.json`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          setSuccessMessage(`Export for ${contact.firstName} ${contact.lastName} downloaded successfully.`)
        }
      }
    },
    [createRequest, triggerDownload]
  )

  const handleInitiateErasure = useCallback(
    async (contact: IContact) => {
      setSuccessMessage(null)
      setSelectedContact(contact)

      const result = await createRequest({ type: 'erasure', contactId: contact.id })

      if ('data' in result && result.data) {
        setErasurePendingRequestId(result.data.id)
        setErasureDialogOpen(true)
      }
    },
    [createRequest]
  )

  const handleErasureSuccess = useCallback(
    (anonymizedFields: string[]) => {
      setErasureDialogOpen(false)
      setErasurePendingRequestId(null)
      setSuccessMessage(
        `Erasure completed. ${anonymizedFields.length} field groups anonymized for ${selectedContact?.firstName} ${selectedContact?.lastName}.`
      )
      setSelectedContact(null)
      setSearch('')
    },
    [selectedContact]
  )

  const handleDownloadExisting = useCallback(
    async (requestId: string, contactId: string) => {
      const downloadResult = await triggerDownload(requestId)
      if ('data' in downloadResult && downloadResult.data instanceof Blob) {
        const url = URL.createObjectURL(downloadResult.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `gdpr-export-${contactId}-${Date.now()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    },
    [triggerDownload]
  )

  const contactResults = contactsData?.items ?? []

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} mb={0.5}>
        GDPR Data Management
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Search for a contact to export their data or process a right-to-erasure
        request under GDPR Article 17.
      </Typography>

      {successMessage && (
        <Alert severity="success" onClose={() => setSuccessMessage(null)} sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}

      {/* Contact search */}
      <Box
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 3,
          mb: 4,
        }}
      >
        <Typography variant="subtitle2" mb={2}>
          Search Contact
        </Typography>

        <TextField
          fullWidth
          placeholder="Search by name or email (min. 2 characters)..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelectedContact(null)
          }}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: searchingContacts ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : undefined,
          }}
          sx={{ mb: 2 }}
        />

        {contactResults.length > 0 && (
          <Stack spacing={1}>
            {contactResults.map((contact) => (
              <Box
                key={contact.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {contact.firstName} {contact.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {contact.email ?? 'No email'} {contact.company ? `· ${contact.company}` : ''}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1}>
                  <Tooltip title="Export all data for this contact as JSON">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={
                        isCreating ? (
                          <CircularProgress size={14} />
                        ) : (
                          <CloudDownload fontSize="small" />
                        )
                      }
                      onClick={() => handleExport(contact)}
                      disabled={isCreating}
                    >
                      Export Data
                    </Button>
                  </Tooltip>

                  <Tooltip title="Permanently anonymize this contact's personal data (GDPR Art. 17)">
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteForever fontSize="small" />}
                      onClick={() => handleInitiateErasure(contact)}
                      disabled={isCreating}
                    >
                      Erase Data
                    </Button>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}

        {search.length >= 2 && !searchingContacts && contactResults.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No contacts found for &ldquo;{search}&rdquo;.
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* History table */}
      <Typography variant="subtitle1" fontWeight={600} mb={2}>
        Request History
      </Typography>

      {loadingRequests ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Contact Email</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Requested</TableCell>
                <TableCell>Completed</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requestsData && requestsData.items.length > 0 ? (
                requestsData.items.map((req) => (
                  <TableRow key={req.id} hover>
                    <TableCell>
                      <Typography variant="body2">{req.contactEmail}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.type}
                        size="small"
                        color={req.type === 'erasure' ? 'error' : 'info'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={req.status}
                        size="small"
                        color={statusChipColor(req.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatDate(req.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {req.completedAt ? formatDate(req.completedAt) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {req.type === 'export' && req.status === 'completed' && (
                        <Tooltip title="Download export JSON">
                          <Button
                            size="small"
                            startIcon={<CloudDownload fontSize="small" />}
                            onClick={() =>
                              handleDownloadExisting(req.id, req.contactId)
                            }
                          >
                            Download
                          </Button>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No GDPR requests yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Erasure confirmation dialog */}
      {erasurePendingRequestId && selectedContact && (
        <ErasureConfirmDialog
          open={erasureDialogOpen}
          requestId={erasurePendingRequestId}
          contactName={`${selectedContact.firstName} ${selectedContact.lastName}`}
          contactEmail={selectedContact.email ?? 'unknown'}
          onClose={() => {
            setErasureDialogOpen(false)
            setErasurePendingRequestId(null)
            setSelectedContact(null)
          }}
          onSuccess={handleErasureSuccess}
        />
      )}
    </Box>
  )
}
