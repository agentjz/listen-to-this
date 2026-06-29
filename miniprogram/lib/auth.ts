export function isAdminOpenid(openid: string, adminOpenids: string[]): boolean {
  return adminOpenids.includes(openid);
}
