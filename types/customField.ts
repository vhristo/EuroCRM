export type CustomFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'

export type CustomFieldEntityType = 'contacts' | 'deals' | 'leads'

export interface ICustomFieldDefinition {
  id: string
  name: string
  label: string
  type: CustomFieldType
  entityType: CustomFieldEntityType
  required: boolean
  options?: string[] // for select / multiselect
  order: number
}
