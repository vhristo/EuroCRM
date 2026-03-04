export interface IPipelineStage {
  id: string
  name: string
  order: number
  probability: number
  rotDays: number
}

export interface IPipeline {
  id: string
  organizationId: string
  name: string
  stages: IPipelineStage[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
