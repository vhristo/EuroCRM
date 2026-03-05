import mongoose, { Schema, Document, Types } from 'mongoose'
import type { IDataRequest } from '@/types/gdpr'

export interface IDataRequestDocument
  extends Omit<
      IDataRequest,
      'id' | 'organizationId' | 'contactId' | 'requestedBy' | 'completedAt' | 'createdAt' | 'updatedAt'
    >,
    Document {
  organizationId: Types.ObjectId
  contactId: Types.ObjectId
  requestedBy: Types.ObjectId
  completedAt?: Date
}

const dataRequestResultSchema = new Schema(
  {
    downloadUrl: { type: String },
    exportData: { type: Schema.Types.Mixed },
    anonymizedFields: { type: [String], default: [] },
  },
  { _id: false }
)

const dataRequestSchema = new Schema<IDataRequestDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['export', 'erasure'],
      required: true,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    contactEmail: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    result: {
      type: dataRequestResultSchema,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
)

dataRequestSchema.index({ organizationId: 1, contactId: 1 })
dataRequestSchema.index({ organizationId: 1, status: 1 })
dataRequestSchema.index({ organizationId: 1, createdAt: -1 })

const DataRequest =
  mongoose.models.DataRequest ??
  mongoose.model<IDataRequestDocument>('DataRequest', dataRequestSchema)

export default DataRequest
