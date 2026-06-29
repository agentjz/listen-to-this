import { DeleteMaterialRequest, DeleteMaterialResponse } from '../../miniprogram/types/api';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: DeleteMaterialRequest): Promise<ReturnType<typeof ok<DeleteMaterialResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId) {
      return fail('INVALID_REQUEST', '材料不能为空');
    }

    const db = getDatabase();
    const audios = await db.collection(COLLECTIONS.listeningAudios).where({ materialId: event.materialId }).get();

    await db.collection(COLLECTIONS.materials).where({ id: event.materialId }).update({ data: { status: 'archived', updatedAt: Date.now() } });

    return ok({
      materialId: event.materialId,
      deletedAudioCount: audios.data.length
    });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
