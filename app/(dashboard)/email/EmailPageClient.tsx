'use client'

import { useState } from 'react'
import { Box, Tab, Tabs, Typography } from '@mui/material'
import EmailList from '@/components/email/EmailList'
import EmailDetail from '@/components/email/EmailDetail'

interface TabPanelProps {
  children: React.ReactNode
  value: number
  index: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box pt={3}>{children}</Box>}
    </div>
  )
}

export default function EmailPageClient() {
  const [activeTab, setActiveTab] = useState(0)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)

  const handleViewDetail = (id: string) => {
    setSelectedMessageId(id)
    setActiveTab(1)
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <Typography variant="h5" fontWeight={700}>
          Email
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Send emails to contacts, track opens and clicks.
        </Typography>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v: number) => {
            setActiveTab(v)
            if (v === 0) setSelectedMessageId(null)
          }}
        >
          <Tab label="Sent Messages" />
          {selectedMessageId && <Tab label="Message Detail" />}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <EmailList />
      </TabPanel>

      {selectedMessageId && (
        <TabPanel value={activeTab} index={1}>
          <EmailDetail messageId={selectedMessageId} />
        </TabPanel>
      )}
    </div>
  )
}
