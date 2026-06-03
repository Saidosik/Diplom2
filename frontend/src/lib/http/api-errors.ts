export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number,
    public code: string // например: 'AUTH_EXPIRED', 'VALIDATION_FAILED'
  ) {
    super(message);
  }
}

export type SafeRequestResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export async function safeRequest<T>(promise: Promise<T>): Promise<SafeRequestResult<T>> {
  try {
    const data = await promise;
    return { success: true, data, error: null };
  } catch (error) {
    if (error instanceof ApiError) {
      return { success: false, data: null, error };
    }

    return {
      success: false,
      data: null,
      error: new ApiError('Неизвестная ошибка', 500, 'UNKNOWN'),
    };
  }
}
