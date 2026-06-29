import { SaveListeningAudioRequest, SaveListeningAudioResponse } from '../../miniprogram/types/api';
import { ListeningAudio } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: SaveListeningAudioRequest): Promise<ReturnType<typeof ok<SaveListeningAudioResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.materialId || !event.cloudFileId) {
      return fail('INVALID_REQUEST', '材料和音频文件不能为空');
    }

    const db = getDatabase();
    const now = Date.now();
    const listeningAudio: ListeningAudio = {
      id: createId('audio', now),
      materialId: event.materialId,
      sourceKind: 'upload',
      format: event.format,
      cloudFileId: event.cloudFileId,
      durationMs: event.durationMs,
      createdAt: now,
      updatedAt: now
    };

    await db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).where({ materialId: event.materialId }).remove();
    await db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).add({ data: listeningAudio });
    await db.collection(COLLECTIONS.materials).where({ id: event.materialId }).update({ data: { audioCount: 1, updatedAt: now } });

    return ok({ listeningAudio });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
