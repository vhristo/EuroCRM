'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateActivitySchema } from '@/lib/validators/activitySchema'
import { useCreateActivityMutation } from '@/store/api/activitiesApi'
import PageHeader from '@/components/layout/PageHeader'
import ActivityTimeline from '@/components/activities/ActivityTimeline'
import { ACTIVITY_TYPES } from '@/utils/constants'
import type { z } from 'zod'

type CreateActivityInput = z.infer<typeof CreateActivitySchema>

export default function ActivitiesPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const [createActivity] = useCreateActivityMutation()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateActivityInput>({
    resolver: zodResolver(CreateActivitySchema),
    defaultValues: {
      type: 'task',
      subject: '',
      description: '',
      dueDate: '',
    },
  })

  const onSubmit = async (values: CreateActivityInput) => {
    await createActivity(values)
    setCreateOpen(false)
    reset()
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Activities"
        actionLabel="Add Activity"
        onAction={() => setCreateOpen(true)}
      />

      <div className="mt-4 mb-4">
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_e, val) => val && setFilter(val)}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="done">Done</ToggleButton>
        </ToggleButtonGroup>
      </div>

      <Card>
        <CardContent>
          <ActivityTimeline doneFilter={filter === 'all' ? undefined : filter === 'done' ? 'true' : 'false'} />
        </CardContent>
      </Card>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} className="mt-1">
              <Grid item xs={12}>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Type" fullWidth select>
                      {Object.values(ACTIVITY_TYPES).map((t) => (
                        <MenuItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="subject"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Subject"
                      fullWidth
                      error={!!errors.subject}
                      helperText={errors.subject?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Due Date"
                      type="datetime-local"
                      fullWidth
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Description"
                      fullWidth
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              Create
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  )
}
