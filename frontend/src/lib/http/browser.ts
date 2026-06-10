import axios from "axios";
import { ApiError } from "./api-errors";

const isServer = typeof window === 'undefined';

// На сервере Next.js можно сделать запрос к самому себе через внутренний хост или 127.0.0.1.
// Используем переменную окружения NEXT_PUBLIC_SITE_URL или http://localhost:3000 по умолчанию.
const serverBaseURL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const browserApi = axios.create({
    baseURL: isServer ? `${serverBaseURL}/api` : '/api',
    headers: {
        Accept: "application/json"
    }
});


browserApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Здесь мы конвертируем ошибку Axios в унифицированный формат
    const status = error.response?.status || 500;
    const retryAfter = error.response?.headers?.["retry-after"];
    const message = status === 429
      ? `Слишком много действий. Попробуйте снова${retryAfter ? ` через ${retryAfter} сек.` : " позже"}.`
      : error.response?.data?.message || 'Что-то пошло не так';
    const code = error.response?.data?.code || (status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR');

    if (!isServer && status === 403 && code === 'EMAIL_NOT_VERIFIED' && window.location.pathname !== '/verify-email') {
      const email = error.response?.data?.email;
      const query = email ? `?email=${encodeURIComponent(email)}` : '';
      window.location.assign(`/verify-email${query}`);
    }

    throw new ApiError(message, status, code);
  }
);