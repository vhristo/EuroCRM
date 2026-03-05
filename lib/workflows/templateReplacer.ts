/**
 * Replaces {{variable}} patterns in a template string with values from the entity.
 * Supports dot-notation for nested fields, e.g. {{contact.firstName}}.
 * Unmatched variables are left as empty strings.
 */
export function replaceTemplateVars(
  template: string,
  entity: Record<string, unknown>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const trimmed = key.trim()
    const value = getNestedValue(entity, trimmed)
    if (value === null || value === undefined) return ''
    return String(value)
  })
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}
