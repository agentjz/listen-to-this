export function createId(prefix: string, now: number = Date.now()): string {
  return `${prefix}_${now}_${Math.random().toString(36).slice(2, 10)}`;
}
