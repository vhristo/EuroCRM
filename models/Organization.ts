import mongoose, { Schema, Document } from 'mongoose'

export interface IOrganization {
  id: string
  name: string
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  settings: {
    defaultCurrency: string
    timezone: string
  }
  createdAt: string
  updatedAt: string
}

export interface IOrganizationDocument extends Omit<IOrganization, 'id' | 'createdAt' | 'updatedAt'>, Document {}

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
  },
  {
    timestamps: true,
  }
)

const Organization =
  mongoose.models.Organization ??
  mongoose.model<IOrganizationDocument>('Organization', organizationSchema)

export default Organization
