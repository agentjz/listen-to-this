import { SyncDataResponse } from '../../miniprogram/types/api';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';

export async function main(): Promise<ReturnType<typeof ok<SyncDataResponse>> | ReturnType<typeof fail>> {
  try {
    const db = getDatabase();
    const openid = getOpenid();
    const [libraries, materials, audios] = await Promise.all([
      db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).get(),
      db.collection<Material>(COLLECTIONS.materials).where({ ownerOpenid: openid }).get(),
      db.collection<ListeningAudio>(COLLECTIONS.listeningAudios).get()
    ]);

    const userMaterialIds = new Set(materials.data.map((material) => material.id));
    const visibleAudios = audios.data.filter((audio) => userMaterialIds.has(audio.materialId));

    return ok({
      serverTime: Date.now(),
      libraries: libraries.data.filter((library) => library.kind !== 'user' || library.ownerOpenid === openid),
      materials: materials.data,
      listeningAudios: visibleAudios
    });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
