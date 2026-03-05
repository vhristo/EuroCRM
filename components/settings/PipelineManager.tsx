'use client'

import { useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import StarIcon from '@mui/icons-material/Star'
import EditIcon from '@mui/icons-material/Edit'
import AddIcon from '@mui/icons-material/Add'
import {
  useGetPipelinesQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
  useSetDefaultPipelineMutation,
} from '@/store/api/pipelineApi'
import { useAppDispatch } from '@/store/hooks'
import { addNotification } from '@/store/slices/uiSlice'
import type { IPipeline, IPipelineStage } from '@/types/pipeline'

export default function PipelineManager() {
  const dispatch = useAppDispatch()
  const { data: pipelines = [] } = useGetPipelinesQuery()
  const [createPipeline] = useCreatePipelineMutation()
  const [updatePipeline] = useUpdatePipelineMutation()
  const [deletePipeline] = useDeletePipelineMutation()
  const [setDefault] = useSetDefaultPipelineMutation()

  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [editPipeline, setEditPipeline] = useState<IPipeline | null>(null)
  const [editStages, setEditStages] = useState<IPipelineStage[]>([])
  const [editName, setEditName] = useState('')
  const [error, setError] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await createPipeline({ name: newName.trim() }).unwrap()
      setNewName('')
      setCreateOpen(false)
      dispatch(addNotification({ type: 'success', message: 'Pipeline created.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to create pipeline.' }))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePipeline(id).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Pipeline deleted.' }))
    } catch (err: unknown) {
      const msg = (err as { data?: { error?: string } })?.data?.error ?? 'Failed to delete pipeline.'
      setError(msg)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault(id).unwrap()
      dispatch(addNotification({ type: 'success', message: 'Default pipeline updated.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to set default.' }))
    }
  }

  const openEdit = (p: IPipeline) => {
    setEditPipeline(p)
    setEditName(p.name)
    setEditStages([...p.stages].sort((a, b) => a.order - b.order))
  }

  const handleSaveEdit = async () => {
    if (!editPipeline) return
    try {
      await updatePipeline({
        id: editPipeline.id,
        data: { name: editName, stages: editStages },
      }).unwrap()
      setEditPipeline(null)
      dispatch(addNotification({ type: 'success', message: 'Pipeline updated.' }))
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update pipeline.' }))
    }
  }

  const updateStage = (index: number, field: keyof IPipelineStage, value: string | number) => {
    setEditStages((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  const addStage = () => {
    setEditStages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', order: prev.length, probability: 0, rotDays: 0 },
    ])
  }

  const removeStage = (index: number) => {
    setEditStages((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
  }

  return (
    <Card>
      <CardContent>
        <Box className="flex items-center justify-between mb-4">
          <Typography variant="h6">Pipelines</Typography>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            New Pipeline
          </Button>
        </Box>

        {error && (
          <Alert severity="error" className="mb-3" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <List>
          {pipelines.map((p) => (
            <ListItem key={p.id} divider>
              <ListItemText
                primary={
                  <Box className="flex items-center gap-2">
                    {p.name}
                    {p.isDefault && <Chip label="Default" size="small" color="primary" />}
                  </Box>
                }
                secondary={`${p.stages.length} stages`}
              />
              <ListItemSecondaryAction>
                {!p.isDefault && (
                  <IconButton size="small" onClick={() => handleSetDefault(p.id)} title="Set as default">
                    <StarIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => openEdit(p)} title="Edit">
                  <EditIcon fontSize="small" />
                </IconButton>
                {!p.isDefault && (
                  <IconButton size="small" onClick={() => handleDelete(p.id)} title="Delete">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {/* Create Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>New Pipeline</DialogTitle>
          <DialogContent>
            <TextField
              label="Pipeline Name"
              fullWidth
              size="small"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleCreate}>Create</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editPipeline} onClose={() => setEditPipeline(null)} maxWidth="md" fullWidth>
          <DialogTitle>Edit Pipeline</DialogTitle>
          <DialogContent>
            <TextField
              label="Pipeline Name"
              fullWidth
              size="small"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ mt: 1, mb: 2 }}
            />
            <Typography variant="subtitle2" className="mb-2">Stages</Typography>
            {editStages.map((stage, i) => (
              <Box key={stage.id} className="flex items-center gap-2 mb-2">
                <TextField
                  label="Name"
                  size="small"
                  value={stage.name}
                  onChange={(e) => updateStage(i, 'name', e.target.value)}
                  sx={{ flex: 2 }}
                />
                <TextField
                  label="Probability %"
                  type="number"
                  size="small"
                  value={stage.probability}
                  onChange={(e) => updateStage(i, 'probability', parseInt(e.target.value) || 0)}
                  sx={{ width: 120 }}
                />
                <TextField
                  label="Rot Days"
                  type="number"
                  size="small"
                  value={stage.rotDays}
                  onChange={(e) => updateStage(i, 'rotDays', parseInt(e.target.value) || 0)}
                  sx={{ width: 100 }}
                />
                <IconButton size="small" onClick={() => removeStage(i)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={addStage}>
              Add Stage
            </Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditPipeline(null)}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}
