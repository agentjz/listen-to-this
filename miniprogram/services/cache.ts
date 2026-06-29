import { CACHE_KEYS } from '../lib/cachePolicy';
import { LoginResponse, SyncDataResponse } from '../types/api';

export function readSession(): LoginResponse | null {
  return wx.getStorageSync<LoginResponse | null>(CACHE_KEYS.session) || null;
}

export function writeSession(session: LoginResponse): void {
  wx.setStorageSync(CACHE_KEYS.session, session);
}

export function readSyncData(): SyncDataResponse | null {
  return wx.getStorageSync<SyncDataResponse | null>(CACHE_KEYS.syncData) || null;
}

export function writeSyncData(data: SyncDataResponse): void {
  wx.setStorageSync(CACHE_KEYS.syncData, data);
}

export function clearLocalCache(): void {
  wx.removeStorageSync(CACHE_KEYS.session);
  wx.removeStorageSync(CACHE_KEYS.syncData);
}
