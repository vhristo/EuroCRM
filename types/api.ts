export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: string
  code?: string
}

export interface SuccessResponse {
  success: true
}
