import api from '@/shared/api/api.client.ts'
import type {LoginDto} from "@/features/auth/api/login.dto.ts";
import type {RegisterDto} from "@/features/auth/api/register.dto.ts";
import type {AuthResponse} from "@/features/auth/api/auth-response.ts";

export const authApi = {
    login: (dto: LoginDto) =>
        api.post<AuthResponse>('/auth/login', dto).then((r) => r.data),

    register: (dto: RegisterDto) =>
        api.post<AuthResponse>('/auth/register', dto).then((r) => r.data),

    logout: (refreshToken: string) =>
        api.post('/auth/logout', {refreshToken}).then((r) => r.data),

    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', {email}).then((r) => r.data),

    resetPassword: (token: string, newPassword: string) =>
        api.post('/auth/reset-password', {token, newPassword}).then((r) => r.data),

    verifyEmail: (token: string) =>
        api.post('/auth/verify-email', {token}).then((r) => r.data),

    resendVerification: (email: string) =>
        api.post('/auth/resend-verification', {email}).then((r) => r.data),
}
