import { ApiError, ApiResponse } from '../../miniprogram/types/api';

export function ok<T>(data: T): ApiResponse<T> {
  return { ok: true, data };
}

export function fail<T = never>(code: string, message: string): ApiResponse<T> {
  return {
    ok: false,
    error: { code, message }
  };
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    return { code: 'INTERNAL_ERROR', message: error.message };
  }

  return { code: 'INTERNAL_ERROR', message: '未知错误' };
}
