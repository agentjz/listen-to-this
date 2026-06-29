import { MoveMaterialRequest, MoveMaterialResponse } from '../../miniprogram/types/api';
import { Material } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: MoveMaterialRequest): Promise<ReturnType<typeof ok<MoveMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || !event.libraryId) {
      return fail('INVALID_REQUEST', '材料和分类不能为空');
    }

    const db = getDatabase();
    const now = Date.now();
    const material = (await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId }).get()).data[0];
    if (!material) {
      return fail('NOT_FOUND', '材料不存在');
    }

    const updated: Material = {
      ...material,
      libraryId: event.libraryId,
      sortOrder: now,
      updatedAt: now
    };

    await db.collection<Material>(COLLECTIONS.materials).where({ id: event.materialId }).update({
      data: {
        libraryId: updated.libraryId,
        sortOrder: updated.sortOrder,
        updatedAt: updated.updatedAt
      }
    });

    return ok({ material: updated });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
