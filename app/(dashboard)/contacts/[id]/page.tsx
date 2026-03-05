'use client'

import { useParams, useRouter } from 'next/navigation'
import { Box, Button, CircularProgress, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import { useGetContactQuery } from '@/store/api/contactsApi'
import { ContactDetail } from '@/components/contacts/ContactDetail'

export default function ContactPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: contact, isLoading, isError } = useGetContactQuery(id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <CircularProgress />
      </div>
    )
  }

  if (isError || !contact) {
    return (
      <Box p={6} textAlign="center">
        <Typography color="error" gutterBottom>
          Contact not found or could not be loaded.
        </Typography>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.push('/contacts')}
        >
          Back to Contacts
        </Button>
      </Box>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <ContactDetail contact={contact} />
    </div>
  )
}
