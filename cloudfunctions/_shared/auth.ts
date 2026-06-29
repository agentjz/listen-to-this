import { getOpenid } from './db';

export function getAdminOpenids(): string[] {
  return (process.env.ADMIN_OPENIDS ?? '')
    .split(',')
    .map((openid) => openid.trim())
    .filter(Boolean);
}

export function isAdmin(openid: string): boolean {
  return getAdminOpenids().includes(openid);
}

export function requireAdmin(): string {
  const openid = getOpenid();
  if (!isAdmin(openid)) {
    throw new Error('当前用户没有管理权限');
  }

  return openid;
}
