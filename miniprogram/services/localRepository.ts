import { buildDefaultMaterialTitle } from '../lib/materialTitle';
import { LOCAL_ASSET_MATERIALS } from '../generated/localAssets';
import {
  DeleteLibraryResponse,
  DeleteMaterialResponse,
  MoveMaterialResponse,
  ReorderDirection,
  ReorderMaterialResponse,
  ReplaceListeningAudioResponse,
  SaveLibraryResponse,
  SaveMaterialResponse,
  SyncDataResponse,
  UpdateMaterialResponse
} from '../types/api';
import { AudioFormat, ListeningAudio, Material, SourceLibrary } from '../types/domain';

const LOCAL_DATA_KEY = 'listen.localData';
const LOCAL_SCHEMA_VERSION = 4;
const LOCAL_LIBRARY_ID = 'local-library';
const LOCAL_OPENID = 'local-user';

interface LocalData {
  schemaVersion: number;
  libraries: SourceLibrary[];
  materials: Material[];
  listeningAudios: ListeningAudio[];
}

export interface SaveLocalMaterialInput {
  libraryId?: string;
  title?: string;
  content: string;
  imageFileIds?: string[];
  now?: number;
}

export function loadLocalSnapshot(): SyncDataResponse {
  const data = readLocalData();
  return {
    serverTime: Date.now(),
    libraries: data.libraries,
    materials: data.materials,
    listeningAudios: data.listeningAudios
  };
}

export function saveLocalMaterial(input: SaveLocalMaterialInput): SaveMaterialResponse {
  const now = input.now ?? Date.now();
  const content = input.content.trim();

  if (!content) {
    throw new Error('请填写英文内容');
  }

  const data = readLocalData();
  const materialId = createLocalId('material', now);
  const material: Material = {
    id: materialId,
    libraryId: input.libraryId || LOCAL_LIBRARY_ID,
    ownerOpenid: LOCAL_OPENID,
    title: input.title?.trim() || buildDefaultMaterialTitle(content, now),
    content,
    status: 'ready',
    audioCount: 0,
    images: (input.imageFileIds ?? []).map((cloudFileId, index) => ({
      id: createLocalId(`image-${index}`, now),
      cloudFileId,
      createdAt: now
    })),
    sortOrder: nextMaterialSortOrder(data.materials, input.libraryId || LOCAL_LIBRARY_ID),
    createdAt: now,
    updatedAt: now
  };

  data.materials.unshift(material);
  writeLocalData(data);

  return { material };
}

export function createLocalLibrary(name: string, now = Date.now()): SaveLibraryResponse {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('请填写分类名称');
  }

  const data = readLocalData();
  const library: SourceLibrary = {
    id: createLocalId('library', now),
    name: trimmedName,
    kind: 'user',
    ownerOpenid: LOCAL_OPENID,
    sortOrder: nextLibrarySortOrder(data.libraries),
    createdAt: now,
    updatedAt: now
  };

  data.libraries.push(library);
  writeLocalData(data);
  return { library };
}

export function deleteLocalLibrary(libraryId: string): DeleteLibraryResponse {
  const data = readLocalData();
  const library = data.libraries.find((item) => item.id === libraryId);
  if (!library) {
    throw new Error('分类不存在');
  }

  if (library.id === LOCAL_LIBRARY_ID) {
    throw new Error('默认本地分类不能删除');
  }

  const activeMaterialCount = data.materials.filter((material) => material.libraryId === libraryId && material.status !== 'archived').length;
  if (activeMaterialCount > 0) {
    throw new Error('分类内还有材料，不能删除');
  }

  data.libraries = data.libraries.filter((item) => item.id !== libraryId);
  writeLocalData(data);
  return { libraryId };
}

export function moveLocalMaterial(materialId: string, libraryId: string, now = Date.now()): MoveMaterialResponse {
  const data = readLocalData();
  const targetLibrary = data.libraries.find((library) => library.id === libraryId);
  if (!targetLibrary) {
    throw new Error('目标分类不存在');
  }

  const material = data.materials.find((item) => item.id === materialId);
  if (!material) {
    throw new Error('材料不存在');
  }

  material.libraryId = libraryId;
  material.sortOrder = nextMaterialSortOrder(data.materials.filter((item) => item.id !== materialId), libraryId);
  material.updatedAt = now;
  writeLocalData(data);
  return { material };
}

export function updateLocalMaterial(
  materialId: string,
  input: {
    title?: string;
    content: string;
    now?: number;
  }
): UpdateMaterialResponse {
  const content = input.content.trim();
  if (!content) {
    throw new Error('请填写英文内容');
  }

  const data = readLocalData();
  const material = data.materials.find((item) => item.id === materialId && item.status !== 'archived');
  if (!material) {
    throw new Error('材料不存在');
  }

  const now = input.now ?? Date.now();
  material.title = input.title?.trim() || buildDefaultMaterialTitle(content, now);
  material.content = content;
  material.updatedAt = now;
  writeLocalData(data);
  return { material };
}

export function replaceLocalMaterialAudio(
  materialId: string,
  input: {
    cloudFileId: string;
    format: AudioFormat;
    durationMs?: number;
    now?: number;
  }
): ReplaceListeningAudioResponse {
  if (!input.cloudFileId) {
    throw new Error('音频文件不能为空');
  }

  const data = readLocalData();
  const material = data.materials.find((item) => item.id === materialId && item.status !== 'archived');
  if (!material) {
    throw new Error('材料不存在');
  }

  const now = input.now ?? Date.now();
  const listeningAudio: ListeningAudio = {
    id: createLocalId('audio', now),
    materialId,
    sourceKind: 'upload',
    format: input.format,
    cloudFileId: input.cloudFileId,
    durationMs: input.durationMs,
    createdAt: now,
    updatedAt: now
  };

  data.listeningAudios = data.listeningAudios.filter((audio) => audio.materialId !== materialId);
  data.listeningAudios.unshift(listeningAudio);
  material.audioCount = 1;
  material.updatedAt = now;
  writeLocalData(data);
  return { listeningAudio };
}

export function reorderLocalMaterial(materialId: string, direction: ReorderDirection, now = Date.now()): ReorderMaterialResponse {
  const data = readLocalData();
  const current = data.materials.find((material) => material.id === materialId);
  if (!current) {
    throw new Error('材料不存在');
  }

  const siblings = sortMaterials(data.materials.filter((material) => material.libraryId === current.libraryId && material.status !== 'archived'));
  const currentIndex = siblings.findIndex((material) => material.id === materialId);
  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= siblings.length) {
    return { materials: siblings };
  }

  const target = siblings[targetIndex];
  const currentSortOrder = current.sortOrder;
  current.sortOrder = target.sortOrder;
  current.updatedAt = now;
  target.sortOrder = currentSortOrder;
  target.updatedAt = now;
  writeLocalData(data);

  return {
    materials: sortMaterials(data.materials.filter((material) => material.libraryId === current.libraryId && material.status !== 'archived'))
  };
}

export function deleteLocalMaterial(materialId: string): DeleteMaterialResponse {
  const data = readLocalData();
  const deletedAudioCount = data.listeningAudios.filter((audio) => audio.materialId === materialId).length;

  data.materials = data.materials.filter((material) => material.id !== materialId);
  data.listeningAudios = data.listeningAudios.filter((audio) => audio.materialId !== materialId);
  writeLocalData(data);

  return {
    materialId,
    deletedAudioCount
  };
}

export function getLocalLibraryId(): string {
  return LOCAL_LIBRARY_ID;
}

export function clearLocalRepository(): void {
  wx.removeStorageSync(LOCAL_DATA_KEY);
}

function readLocalData(): LocalData {
  const stored = wx.getStorageSync<LocalData | null>(LOCAL_DATA_KEY);
  if (stored?.schemaVersion === LOCAL_SCHEMA_VERSION && stored.libraries?.length) {
    return stored;
  }

  const initialData = createInitialLocalData();
  writeLocalData(initialData);
  return initialData;
}

function writeLocalData(data: LocalData): void {
  wx.setStorageSync(LOCAL_DATA_KEY, data);
}

function createInitialLocalData(): LocalData {
  const now = Date.now();
  const materials: Material[] = LOCAL_ASSET_MATERIALS.map((asset, index) => ({
    id: asset.id,
    libraryId: LOCAL_LIBRARY_ID,
    ownerOpenid: LOCAL_OPENID,
    title: asset.title,
    content: asset.content,
    status: 'ready',
    audioCount: asset.audio ? 1 : 0,
    images: asset.imageCloudFileId
      ? [
          {
            id: `${asset.id}-image`,
            cloudFileId: asset.imageCloudFileId,
            createdAt: now
          }
        ]
      : [],
    sortOrder: (index + 1) * 1000,
    createdAt: now,
    updatedAt: now
  }));
  const listeningAudios: ListeningAudio[] = LOCAL_ASSET_MATERIALS.flatMap((asset) =>
    asset.audio
      ? [
          {
            id: `${asset.id}-audio`,
            materialId: asset.id,
            sourceKind: 'upload',
            format: asset.audio.format,
            cloudFileId: asset.audio.cloudFileId,
            createdAt: now,
            updatedAt: now
          }
        ]
      : []
  );

  return {
    schemaVersion: LOCAL_SCHEMA_VERSION,
    libraries: [
      {
        id: LOCAL_LIBRARY_ID,
        name: '本地材料',
        kind: 'user',
        ownerOpenid: LOCAL_OPENID,
        description: '只保存在当前设备的小程序缓存中',
        sortOrder: 0,
        createdAt: now,
        updatedAt: now
      }
    ],
    materials,
    listeningAudios
  };
}

function createLocalId(prefix: string, now: number): string {
  return `local-${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortMaterials(materials: Material[]): Material[] {
  return [...materials].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.createdAt - right.createdAt;
  });
}

function nextLibrarySortOrder(libraries: SourceLibrary[]): number {
  const max = libraries.reduce((value, library) => Math.max(value, library.sortOrder), 0);
  return max + 1000;
}

function nextMaterialSortOrder(materials: Material[], libraryId: string): number {
  const sameLibrary = materials.filter((material) => material.libraryId === libraryId && material.status !== 'archived');
  const min = sameLibrary.reduce((value, material) => Math.min(value, material.sortOrder), 0);
  return min - 1000;
}
