import api from './apiClient.ts'

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  isEmailVerified: boolean
  createdAt: string
}

export interface UpdateProfileDto {
  firstName?: string
  lastName?: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export const usersApi = {
  getProfile: () =>
    api.get<UserProfile>('/users/profile').then((r) => r.data),

  updateProfile: (dto: UpdateProfileDto) =>
    api.patch<UserProfile>('/users/profile', dto).then((r) => r.data),

  changePassword: (dto: ChangePasswordDto) =>
    api.patch('/users/password', dto).then((r) => r.data),
}
