import mongoose, { Schema, Document, Types } from 'mongoose'

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

export interface IPipelineDocument
  extends Omit<IPipeline, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>,
    Document {
  organizationId: Types.ObjectId
}

const pipelineStageSchema = new Schema<IPipelineStage>(
  {
    id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    rotDays: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
)

const pipelineSchema = new Schema<IPipelineDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    stages: {
      type: [pipelineStageSchema],
      default: [],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

pipelineSchema.index({ organizationId: 1, isDefault: 1 })

const Pipeline = mongoose.models.Pipeline ?? mongoose.model<IPipelineDocument>('Pipeline', pipelineSchema)

export default Pipeline
