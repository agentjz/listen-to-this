export interface CloudDatabase {
  collection<T = Record<string, unknown>>(name: string): CloudCollection<T>;
}

export interface CloudCollection<T> {
  add(options: { data: T }): Promise<{ _id: string }>;
  doc(id: string): {
    update(options: { data: Partial<T> }): Promise<unknown>;
    get(): Promise<{ data: T }>;
  };
  where(query: Record<string, unknown>): {
    get(): Promise<{ data: T[] }>;
    update(options: { data: Partial<T> }): Promise<unknown>;
    remove(): Promise<{ stats?: { removed?: number } }>;
  };
  get(): Promise<{ data: T[] }>;
}

export interface CloudRuntime {
  database(): CloudDatabase;
  getWXContext(): { OPENID?: string };
  uploadFile(options: { cloudPath: string; fileContent: Buffer }): Promise<{ fileID: string }>;
}

declare const cloud: CloudRuntime | undefined;

export function getCloudRuntime(): CloudRuntime {
  if (typeof cloud === 'undefined') {
    throw new Error('CloudBase runtime is unavailable');
  }

  return cloud;
}

export function getDatabase(): CloudDatabase {
  return getCloudRuntime().database();
}

export function getOpenid(): string {
  const openid = getCloudRuntime().getWXContext().OPENID;
  if (!openid) {
    throw new Error('无法获取 openid');
  }

  return openid;
}
