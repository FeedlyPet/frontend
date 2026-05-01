export interface CreatePetDto {
    name: string
    species: string
    breed?: string
    weight?: number
    birthDate?: string
}