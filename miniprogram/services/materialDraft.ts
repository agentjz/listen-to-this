import { buildDefaultMaterialTitle } from '../lib/materialTitle';
import { SaveMaterialRequest, SaveMaterialResponse } from '../types/api';
import { callCloudFunction } from './cloud';

export interface MaterialDraftInput {
  libraryId?: string;
  title?: string;
  content: string;
  imageFileIds?: string[];
  now?: number;
}

export function buildSaveMaterialRequest(input: MaterialDraftInput): SaveMaterialRequest {
  const now = input.now ?? Date.now();
  const content = input.content.trim();

  if (!input.libraryId) {
    throw new Error('请选择资料库');
  }

  if (!content) {
    throw new Error('请填写英文内容');
  }

  return {
    libraryId: input.libraryId,
    title: input.title?.trim() || buildDefaultMaterialTitle(content, now),
    content,
    imageFileIds: input.imageFileIds ?? []
  };
}

export async function saveDraftMaterial(input: MaterialDraftInput): Promise<SaveMaterialResponse> {
  return callCloudFunction<SaveMaterialResponse>('saveMaterial', buildSaveMaterialRequest(input));
}
