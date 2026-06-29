import { SaveLibraryRequest, SaveLibraryResponse } from '../../miniprogram/types/api';
import { SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase, getOpenid } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: SaveLibraryRequest): Promise<ReturnType<typeof ok<SaveLibraryResponse>> | ReturnType<typeof fail>> {
  try {
    const name = event.name?.trim();
    if (!name) {
      return fail('INVALID_REQUEST', '分类名称不能为空');
    }

    const db = getDatabase();
    const openid = getOpenid();
    const now = Date.now();
    const library: SourceLibrary = {
      id: createId('library', now),
      name,
      kind: 'user',
      ownerOpenid: openid,
      sortOrder: now,
      createdAt: now,
      updatedAt: now
    };

    await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).add({ data: library });

    return ok({ library });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
