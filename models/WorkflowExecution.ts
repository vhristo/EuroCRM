import mongoose, { Schema, Document, Types } from 'mongoose'
import type { IWorkflowExecution, WorkflowTrigger } from '@/types/workflow'

export interface IWorkflowExecutionResult {
  action: string
  success: boolean
  error?: string
}

export interface IWorkflowExecutionDocument
  extends Omit<
      IWorkflowExecution,
      | 'id'
      | 'workflowId'
      | 'organizationId'
      | 'executedAt'
    >,
    Document {
  workflowId: Types.ObjectId
  organizationId: Types.ObjectId
  executedAt: Date
}

const executionResultSchema = new Schema<IWorkflowExecutionResult>(
  {
    action: { type: String, required: true },
    success: { type: Boolean, required: true },
    error: { type: String },
  },
  { _id: false }
)

const workflowExecutionSchema = new Schema<IWorkflowExecutionDocument>(
  {
    workflowId: {
      type: Schema.Types.ObjectId,
      ref: 'Workflow',
      required: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    trigger: {
      type: String,
      required: true,
      enum: [
        'deal_created',
        'deal_stage_changed',
        'deal_won',
        'deal_lost',
        'contact_created',
        'lead_created',
        'lead_converted',
        'activity_completed',
        'form_submitted',
      ] satisfies WorkflowTrigger[],
    },
    entityType: {
      type: String,
      required: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['success', 'partial_failure', 'failure'],
    },
    results: {
      type: [executionResultSchema],
      default: [],
    },
    executedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    // No timestamps needed — executedAt is explicit
    timestamps: false,
  }
)

// TTL: auto-delete execution logs after 90 days
workflowExecutionSchema.index({ executedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })
workflowExecutionSchema.index({ workflowId: 1, organizationId: 1 })
workflowExecutionSchema.index({ organizationId: 1, executedAt: -1 })

const WorkflowExecution =
  mongoose.models.WorkflowExecution ??
  mongoose.model<IWorkflowExecutionDocument>('WorkflowExecution', workflowExecutionSchema)

export default WorkflowExecution
