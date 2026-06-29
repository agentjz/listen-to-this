import { LoginResponse } from '../../miniprogram/types/api';
import { getOpenid } from '../_shared/db';
import { isAdmin } from '../_shared/auth';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(): Promise<ReturnType<typeof ok<LoginResponse>> | ReturnType<typeof fail>> {
  try {
    const openid = getOpenid();
    return ok({ openid, isAdmin: isAdmin(openid) });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
