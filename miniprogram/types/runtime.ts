export type DataMode = 'local' | 'cloud';

export function parseDataMode(value: string | undefined): DataMode {
  return value === 'cloud' ? 'cloud' : 'local';
}
