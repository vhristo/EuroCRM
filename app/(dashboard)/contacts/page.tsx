'use client'

import { useState } from 'react'
import { Dialog, DialogContent } from '@mui/material'
import PageHeader from '@/components/layout/PageHeader'
import { ContactTable } from '@/components/contacts/ContactTable'
import { ContactForm } from '@/components/contacts/ContactForm'
import type { IContact } from '@/types/contact'

export default function ContactsPage() {
  const [addOpen, setAddOpen] = useState(false)

  const handleSuccess = (_contact: IContact) => {
    setAddOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title="Contacts"
        actionLabel="Add Contact"
        onAction={() => setAddOpen(true)}
      />

      <ContactTable />

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { p: 1 } }}
      >
        <DialogContent>
          <ContactForm onSuccess={handleSuccess} onCancel={() => setAddOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
