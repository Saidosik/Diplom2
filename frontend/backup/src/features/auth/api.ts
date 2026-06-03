import { browserApi } from '@/lib/http/browser';
import type { AuthMeResponse, LoginDto, RegisterDto, UpdateProfileDto, User } from './types';

function unwrapUser(payload: unknown): User {
  const data = payload as { data?: User; user?: User };
  return data.data ?? data.user ?? (payload as User);
}

export async function login(payload: LoginDto) {
  const response = await browserApi.post('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterDto) {
  const response = await browserApi.post('/auth/register', payload);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await browserApi.get<AuthMeResponse>('/auth/me');
  return response.data.user;
}


export async function updateProfile(payload: UpdateProfileDto): Promise<User> {
  const response = await browserApi.patch('/laravel/me', payload);
  return unwrapUser(response.data);
}

export async function updateAvatar(file: File): Promise<User> {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await browserApi.post('/laravel/me/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return unwrapUser(response.data);
}

export async function deleteAvatar(): Promise<User | null> {
  const response = await browserApi.delete('/laravel/me/avatar');
  const payload = response.data as { user?: User; data?: User };
  return payload.user ?? payload.data ?? null;
}

// export async function resendEmailVerification(): Promise<{ message: string }> {
//   const response = await browserApi.post('/laravel/email/verification-notification');
//   return response.data;
// }



export async function deleteAccount(): Promise<{ message: string }> {
  const response = await browserApi.delete('/auth/delete-account');
  return response.data;
}

export async function logout() {
  const response = await browserApi.post('/auth/logout');
  return response.data;
}
