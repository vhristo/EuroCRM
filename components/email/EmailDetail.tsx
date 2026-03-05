'use client'

import {
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import {
  Email as EmailIcon,
  OpenInBrowser as OpenIcon,
  Link as LinkIcon,
  CheckCircle as SentIcon,
  Error as ErrorIcon,
  HourglassEmpty as QueuedIcon,
} from '@mui/icons-material'
import { useGetEmailMessageQuery } from '@/store/api/emailApi'
import type { IEmailMessage } from '@/types/email'
import { format } from 'date-fns'

const STATUS_META: Record<
  IEmailMessage['status'],
  { label: string; color: 'default' | 'success' | 'error' | 'warning'; Icon: React.ElementType }
> = {
  queued: { label: 'Queued', color: 'warning', Icon: QueuedIcon },
  sent: { label: 'Sent', color: 'success', Icon: SentIcon },
  failed: { label: 'Failed', color: 'error', Icon: ErrorIcon },
}

interface EmailDetailProps {
  messageId: string
}

export default function EmailDetail({ messageId }: EmailDetailProps) {
  const { data: message, isLoading, error } = useGetEmailMessageQuery(messageId)

  if (isLoading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rectangular" height={120} />
        <Skeleton variant="rectangular" height={80} />
        <Skeleton variant="rectangular" height={200} />
      </Stack>
    )
  }

  if (error || !message) {
    return (
      <Typography color="error">
        {error ? 'Failed to load email details.' : 'Message not found.'}
      </Typography>
    )
  }

  const meta = STATUS_META[message.status]
  const StatusIcon = meta.Icon

  return (
    <Stack spacing={3}>
      {/* Header card */}
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EmailIcon color="action" />
              <Typography variant="h6" flex={1}>
                {message.subject}
              </Typography>
              <Chip
                icon={<StatusIcon fontSize="small" />}
                label={meta.label}
                color={meta.color}
                size="small"
              />
            </Stack>

            <Divider />

            <Stack direction="row" spacing={4} flexWrap="wrap">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  From
                </Typography>
                <Typography variant="body2">{message.from}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  To
                </Typography>
                <Typography variant="body2">{message.to}</Typography>
              </Box>
              {message.sentAt && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Sent At
                  </Typography>
                  <Typography variant="body2">
                    {format(new Date(message.sentAt), 'dd MMM yyyy HH:mm:ss')}
                  </Typography>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tracking ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                  {message.trackingId}
                </Typography>
              </Box>
            </Stack>

            {message.errorMessage && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'error.50', borderColor: 'error.200' }}>
                <Typography variant="body2" color="error.main">
                  Error: {message.errorMessage}
                </Typography>
              </Paper>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Tracking stats */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
          <CardContent>
            <OpenIcon color="primary" sx={{ mb: 1 }} />
            <Typography variant="h4">{message.opens.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Opens
            </Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ flex: 1, textAlign: 'center' }}>
          <CardContent>
            <LinkIcon color="secondary" sx={{ mb: 1 }} />
            <Typography variant="h4">{message.clicks.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              Clicks
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Opens table */}
      {message.opens.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Opens ({message.opens.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>User Agent</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {message.opens.map((open, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {format(new Date(open.timestamp), 'dd MMM yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>{open.ip ?? '—'}</TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 300,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={open.userAgent}
                    >
                      {open.userAgent ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clicks table */}
      {message.clicks.length > 0 && (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
              Clicks ({message.clicks.length})
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {message.clicks.map((click, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      {format(new Date(click.timestamp), 'dd MMM yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell
                      sx={{
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={click.url}
                    >
                      <a
                        href={click.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit' }}
                      >
                        {click.url}
                      </a>
                    </TableCell>
                    <TableCell>{click.ip ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Email body preview */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom fontWeight={600}>
            Email Body (HTML Source)
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              maxHeight: 400,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {message.htmlBody}
          </Paper>
        </CardContent>
      </Card>
    </Stack>
  )
}
