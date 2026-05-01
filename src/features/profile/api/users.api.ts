import api from '@/shared/api/api.client.ts'
import type {UserProfile} from "@/features/profile/api/user-profile.ts";
import type {UpdateProfileDto} from "@/features/profile/api/update-profile.dto.ts";
import type {ChangePasswordDto} from "@/features/profile/api/change-password.dto.ts";

export const usersApi = {
    getProfile: () =>
        api.get<UserProfile>('/users/profile').then((r) => r.data),

    updateProfile: (dto: UpdateProfileDto) =>
        api.patch<UserProfile>('/users/profile', dto).then((r) => r.data),

    changePassword: (dto: ChangePasswordDto) =>
        api.patch('/users/password', dto).then((r) => r.data),
}
