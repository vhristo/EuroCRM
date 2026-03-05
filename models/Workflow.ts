import mongoose, { Schema, Document, Types } from 'mongoose'
import type {
  IWorkflow,
  WorkflowTrigger,
  WorkflowConditionOperator,
  WorkflowActionType,
} from '@/types/workflow'

export interface IWorkflowConditionDoc {
  field: string
  operator: WorkflowConditionOperator
  value?: string | number | boolean
}

export interface IWorkflowActionDoc {
  type: WorkflowActionType
  config: Map<string, unknown>
}

export interface IWorkflowDocument
  extends Omit<
      IWorkflow,
      | 'id'
      | 'organizationId'
      | 'createdBy'
      | 'lastExecutedAt'
      | 'createdAt'
      | 'updatedAt'
      | 'conditions'
      | 'actions'
    >,
    Document {
  organizationId: Types.ObjectId
  createdBy: Types.ObjectId
  lastExecutedAt?: Date
  conditions: IWorkflowConditionDoc[]
  actions: IWorkflowActionDoc[]
}

const conditionSchema = new Schema<IWorkflowConditionDoc>(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      required: true,
      enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'is_set', 'is_not_set'],
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
)

const actionSchema = new Schema<IWorkflowActionDoc>(
  {
    type: {
      type: String,
      required: true,
      enum: ['create_activity', 'send_email', 'update_field', 'assign_owner', 'add_tag', 'send_webhook'],
    },
    config: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
  },
  { _id: false }
)

const workflowSchema = new Schema<IWorkflowDocument>(
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
    description: {
      type: String,
      trim: true,
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
    conditions: {
      type: [conditionSchema],
      default: [],
    },
    actions: {
      type: [actionSchema],
      default: [],
    },
    active: {
      type: Boolean,
      default: true,
    },
    executionCount: {
      type: Number,
      default: 0,
    },
    lastExecutedAt: {
      type: Date,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
)

workflowSchema.index({ organizationId: 1, trigger: 1, active: 1 })
workflowSchema.index({ organizationId: 1, createdBy: 1 })

const Workflow =
  mongoose.models.Workflow ?? mongoose.model<IWorkflowDocument>('Workflow', workflowSchema)

export default Workflow
