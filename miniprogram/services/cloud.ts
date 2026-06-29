import { ApiResponse, LoginResponse } from '../types/api';

export async function callCloudFunction<TData>(
  name: string,
  data: object = {}
): Promise<TData> {
  if (!wx.cloud) {
    throw new Error('当前环境未启用微信云开发');
  }

  const response = await wx.cloud.callFunction<ApiResponse<TData>>({ name, data });
  const result = response.result;

  if (!result) {
    throw new Error(`云函数 ${name} 未返回结果`);
  }

  if (!result.ok) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function login(): Promise<LoginResponse> {
  return callCloudFunction<LoginResponse>('login');
}
