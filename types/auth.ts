export interface IAuthPayload {
  userId: string
  organizationId: string
  email: string
  role: string
}

export interface ILoginRequest {
  email: string
  password: string
}

export interface IRegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName: string
}

export interface IAuthResponse {
  accessToken: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
    organizationId: string
  }
}
