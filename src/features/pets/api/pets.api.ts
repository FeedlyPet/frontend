import api from '@/shared/api/api.client.ts'
import type {PaginatedResponse} from '@/shared/api/paginated-response.ts'
import type {PaginationParams} from "@/shared/api/pagination-params.ts";
import type {CreatePetDto} from "@/features/pets/api/create-pet.dto.ts";
import type {Pet} from "@/features/pets/api/pet.ts";

export interface UpdatePetDto extends Partial<CreatePetDto> {
}

export const petsApi = {
    getAll: (params?: PaginationParams) =>
        api.get<PaginatedResponse<Pet>>('/pets', {params}).then((r) => r.data),

    getOne: (id: string) =>
        api.get<Pet>(`/pets/${id}`).then((r) => r.data),

    create: (dto: CreatePetDto) =>
        api.post<Pet>('/pets', dto).then((r) => r.data),

    update: (id: string, dto: UpdatePetDto) =>
        api.patch<Pet>(`/pets/${id}`, dto).then((r) => r.data),

    remove: (id: string) =>
        api.delete(`/pets/${id}`).then((r) => r.data),
}
