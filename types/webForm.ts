export interface IWebFormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select'
  required: boolean
  options?: string[] // for select type
  order: number
  mapTo?: 'name' | 'email' | 'phone' | 'company' | 'notes' // maps to Lead fields
}

export interface IWebForm {
  id: string
  organizationId: string
  name: string
  slug: string // unique, URL-friendly
  description?: string
  fields: IWebFormField[]
  styling: {
    primaryColor: string
    backgroundColor: string
    buttonText: string
  }
  successMessage: string
  active: boolean
  submissions: number
  createdAt: string
  updatedAt: string
}

export interface IWebFormPublic {
  id: string
  name: string
  slug: string
  description?: string
  fields: IWebFormField[]
  styling: {
    primaryColor: string
    backgroundColor: string
    buttonText: string
  }
  successMessage: string
}
