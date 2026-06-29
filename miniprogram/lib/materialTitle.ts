export function buildDefaultMaterialTitle(content: string, createdAt: number): string {
  const normalized = content.trim().replace(/\s+/g, ' ');
  const prefix = normalized ? normalized.slice(0, 12) : 'Imported';
  const date = new Date(createdAt).toISOString().slice(0, 10);
  return `${prefix} ${date}`;
}
