'use client'

import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import { useGetEmbedCodeQuery } from '@/store/api/webFormsApi'

interface EmbedCodeDialogProps {
  open: boolean
  onClose: () => void
  webFormId: string
  webFormName: string
}

export default function EmbedCodeDialog({
  open,
  onClose,
  webFormId,
  webFormName,
}: EmbedCodeDialogProps) {
  const [tab, setTab] = useState(0)
  const [copied, setCopied] = useState(false)

  const { data, isLoading, error } = useGetEmbedCodeQuery(webFormId, {
    skip: !open,
  })

  const activeCode = tab === 0 ? data?.iframeCode : data?.jsSnippetCode

  async function handleCopy() {
    if (!activeCode) return
    await navigator.clipboard.writeText(activeCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Embed &quot;{webFormName}&quot;
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Copy the code below and paste it into your website to embed this form.
        </Typography>

        <Tabs value={tab} onChange={(_e, v) => { setTab(v); setCopied(false) }} sx={{ mb: 2 }}>
          <Tab label="iFrame Embed" />
          <Tab label="JavaScript Snippet" />
        </Tabs>

        {isLoading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">Failed to load embed code. Please try again.</Alert>
        )}

        {!isLoading && !error && data && (
          <>
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'grey.900',
                borderRadius: 1,
                p: 2,
              }}
            >
              <IconButton
                size="small"
                onClick={handleCopy}
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'grey.300',
                  '&:hover': { color: 'white' },
                }}
              >
                {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
              </IconButton>
              <Box
                component="pre"
                sx={{
                  color: 'grey.100',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  m: 0,
                  pr: 4,
                }}
              >
                {activeCode}
              </Box>
            </Box>

            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Direct URL:{' '}
                <a href={data.directUrl} target="_blank" rel="noopener noreferrer">
                  {data.directUrl}
                </a>
              </Typography>
            </Box>

            {tab === 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                The iFrame approach is the simplest. Paste the code anywhere in your HTML.
                Adjust the <code>height</code> attribute as needed.
              </Alert>
            )}

            {tab === 1 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                The JavaScript snippet dynamically renders the form. Place the{' '}
                <code>{'<div>'}</code> where you want the form to appear and paste the{' '}
                <code>{'<script>'}</code> before <code>{'</body>'}</code>.
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {activeCode && (
          <Button
            onClick={handleCopy}
            variant="contained"
            startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
