import api from './apiClient.ts'

export interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  weight?: number
  birthDate?: string
  createdAt: string
}

export interface CreatePetDto {
  name: string
  species: string
  breed?: string
  weight?: number
  birthDate?: string
}

export interface UpdatePetDto extends Partial<CreatePetDto> {}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}

export const petsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<PaginatedResponse<Pet>>('/pets', { params }).then((r) => r.data),

  getOne: (id: string) =>
    api.get<Pet>(`/pets/${id}`).then((r) => r.data),

  create: (dto: CreatePetDto) =>
    api.post<Pet>('/pets', dto).then((r) => r.data),

  update: (id: string, dto: UpdatePetDto) =>
    api.patch<Pet>(`/pets/${id}`, dto).then((r) => r.data),

  remove: (id: string) =>
    api.delete(`/pets/${id}`).then((r) => r.data),
}
