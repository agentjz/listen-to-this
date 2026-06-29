export type LibraryKind = 'system' | 'general' | 'user';

export type MaterialStatus = 'draft' | 'ready' | 'archived';

export type AudioSourceKind = 'upload' | 'tts';

export type AudioFormat = 'mp3' | 'm4a' | 'wav';

export interface SourceLibrary {
  id: string;
  name: string;
  kind: LibraryKind;
  ownerOpenid?: string;
  description?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface MaterialImage {
  id: string;
  cloudFileId: string;
  width?: number;
  height?: number;
  createdAt: number;
}

export interface Material {
  id: string;
  libraryId: string;
  ownerOpenid: string;
  title: string;
  content: string;
  status: MaterialStatus;
  audioCount: number;
  images: MaterialImage[];
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface ListeningAudio {
  id: string;
  materialId: string;
  sourceKind: AudioSourceKind;
  format: AudioFormat;
  cloudFileId: string;
  durationMs?: number;
  createdAt: number;
  updatedAt: number;
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  definitions: string[];
  updatedAt: number;
}

export interface MaterialWithAudios {
  material: Material;
  audios: ListeningAudio[];
}
