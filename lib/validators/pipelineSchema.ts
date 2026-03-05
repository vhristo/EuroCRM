import { z } from 'zod'

const PipelineStageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Stage name is required').max(100).trim(),
  order: z.number().int().min(0),
  probability: z.number().int().min(0).max(100),
  rotDays: z.number().int().min(0).default(0),
})

export const CreatePipelineSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).trim(),
  stages: z.array(PipelineStageSchema).optional(),
})

export const UpdatePipelineSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  stages: z.array(PipelineStageSchema).optional(),
})

export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>
export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>
