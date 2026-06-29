import {
  ListeningAudio,
  Material,
  MaterialImage,
  SourceLibrary
} from './domain';

export interface ApiError {
  code: string;
  message: string;
}

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface LoginResponse {
  openid: string;
  isAdmin: boolean;
}

export interface SyncDataRequest {
  since?: number;
}

export interface SyncDataResponse {
  serverTime: number;
  libraries: SourceLibrary[];
  materials: Material[];
  listeningAudios: ListeningAudio[];
}

export interface SaveMaterialRequest {
  libraryId: string;
  title?: string;
  content: string;
  imageFileIds?: string[];
}

export interface SaveMaterialResponse {
  material: Material;
}

export interface SaveLibraryRequest {
  name: string;
}

export interface SaveLibraryResponse {
  library: SourceLibrary;
}

export interface MoveMaterialRequest {
  materialId: string;
  libraryId: string;
}

export interface MoveMaterialResponse {
  material: Material;
}

export interface UpdateMaterialRequest {
  materialId: string;
  title?: string;
  content: string;
}

export interface UpdateMaterialResponse {
  material: Material;
}

export interface DeleteLibraryRequest {
  libraryId: string;
}

export interface DeleteLibraryResponse {
  libraryId: string;
}

export type ReorderDirection = 'up' | 'down';

export interface ReorderMaterialRequest {
  materialId: string;
  direction: ReorderDirection;
}

export interface ReorderMaterialResponse {
  materials: Material[];
}

export interface SaveListeningAudioRequest {
  materialId: string;
  cloudFileId: string;
  format: 'mp3' | 'm4a' | 'wav';
  durationMs?: number;
}

export interface SaveListeningAudioResponse {
  listeningAudio: ListeningAudio;
}

export interface ReplaceListeningAudioRequest {
  materialId: string;
  cloudFileId: string;
  format: ListeningAudio['format'];
  durationMs?: number;
}

export interface ReplaceListeningAudioResponse {
  listeningAudio: ListeningAudio;
}

export interface GenerateAudioRequest {
  materialId: string;
  text: string;
}

export interface GenerateAudioResponse {
  listeningAudio: ListeningAudio;
}

export interface DeleteMaterialRequest {
  materialId: string;
}

export interface DeleteMaterialResponse {
  materialId: string;
  deletedAudioCount: number;
}

export interface AdminUpdateRequest {
  library?: Partial<SourceLibrary> & { id?: string; name: string; kind: SourceLibrary['kind'] };
  material?: Partial<Material> & { id?: string; libraryId: string; title: string; content: string };
}

export interface AdminUpdateResponse {
  library?: SourceLibrary;
  material?: Material;
  images?: MaterialImage[];
}
