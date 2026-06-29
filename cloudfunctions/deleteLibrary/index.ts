import { DeleteLibraryRequest, DeleteLibraryResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { getDatabase } from '../_shared/db';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: DeleteLibraryRequest): Promise<ReturnType<typeof ok<DeleteLibraryResponse>> | ReturnType<typeof fail>> {
  try {
    if (!event.libraryId) {
      return fail('INVALID_REQUEST', '分类不能为空');
    }

    const db = getDatabase();
    const library = (await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId }).get()).data[0];
    if (!library) {
      return fail('NOT_FOUND', '分类不存在');
    }

    if (library.kind !== 'user') {
      return fail('FORBIDDEN', '系统分类不能删除');
    }

    const materials = await db.collection<Material>(COLLECTIONS.materials).where({
      libraryId: event.libraryId,
      status: 'ready'
    }).get();
    if (materials.data.length > 0) {
      return fail('LIBRARY_NOT_EMPTY', '分类内还有材料，不能删除');
    }

    await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).where({ id: event.libraryId }).remove();

    return ok({ libraryId: event.libraryId });
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
