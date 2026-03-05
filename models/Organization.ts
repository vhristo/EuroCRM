import mongoose, { Schema, Document } from 'mongoose'
import type { CustomFieldType, CustomFieldEntityType } from '@/types/customField'

// ─── Custom Field Definition (stored inside Organization) ────────────────────

export interface ICustomFieldDefinitionDoc {
  id: string
  name: string
  label: string
  type: CustomFieldType
  entityType: CustomFieldEntityType
  required: boolean
  options: string[]
  order: number
}

const CustomFieldDefinitionSchema = new Schema<ICustomFieldDefinitionDoc>(
  {
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'email', 'phone'],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['contacts', 'deals', 'leads'],
      required: true,
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { _id: true }
)

// ─── Organization ────────────────────────────────────────────────────────────

export interface IOrganization {
  id: string
  name: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  settings: {
    defaultCurrency: string
    timezone: string
  }
  customFields: {
    contacts: ICustomFieldDefinitionDoc[]
    deals: ICustomFieldDefinitionDoc[]
    leads: ICustomFieldDefinitionDoc[]
  }
  createdAt: string
  updatedAt: string
}

export interface IOrganizationDocument
  extends Omit<IOrganization, 'id' | 'createdAt' | 'updatedAt'>,
    Document {}

const organizationSchema = new Schema<IOrganizationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
      default: 'free',
    },
    settings: {
      defaultCurrency: {
        type: String,
        default: 'EUR',
      },
      timezone: {
        type: String,
        default: 'Europe/Berlin',
      },
    },
    customFields: {
      contacts: { type: [CustomFieldDefinitionSchema], default: [] },
      deals: { type: [CustomFieldDefinitionSchema], default: [] },
      leads: { type: [CustomFieldDefinitionSchema], default: [] },
    },
  },
  {
    timestamps: true,
  }
)

const Organization =
  mongoose.models.Organization ??
  mongoose.model<IOrganizationDocument>('Organization', organizationSchema)

export default Organization
