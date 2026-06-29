import { AudioFormat } from '../types/domain';

export const SUPPORTED_AUDIO_FORMATS: AudioFormat[] = ['mp3', 'm4a', 'wav'];

export function detectAudioFormat(fileNameOrPath: string): AudioFormat | null {
  const match = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(fileNameOrPath);
  if (!match) {
    return null;
  }

  const extension = match[1].toLowerCase();
  return SUPPORTED_AUDIO_FORMATS.includes(extension as AudioFormat) ? (extension as AudioFormat) : null;
}

export function canPlayPreferably(format: AudioFormat): boolean {
  return format === 'mp3' || format === 'm4a';
}

export function createAudioCloudPath(openid: string, materialId: string, format: AudioFormat, now: number): string {
  return `users/${openid}/listening-audio/${materialId}-${now}.${format}`;
}
