import { AdminUpdateRequest, AdminUpdateResponse } from '../../miniprogram/types/api';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { COLLECTIONS } from '../_shared/collections';
import { requireAdmin } from '../_shared/auth';
import { getDatabase } from '../_shared/db';
import { createId } from '../_shared/id';
import { fail, ok, toApiError } from '../_shared/response';

export async function main(event: AdminUpdateRequest): Promise<ReturnType<typeof ok<AdminUpdateResponse>> | ReturnType<typeof fail>> {
  try {
    requireAdmin();
    const db = getDatabase();
    const now = Date.now();
    const response: AdminUpdateResponse = {};

    if (event.library) {
      const library: SourceLibrary = {
        id: event.library.id ?? createId('library', now),
        name: event.library.name,
        kind: event.library.kind,
        ownerOpenid: event.library.ownerOpenid,
        description: event.library.description,
        sortOrder: event.library.sortOrder ?? 0,
        createdAt: event.library.createdAt ?? now,
        updatedAt: now
      };
      await db.collection<SourceLibrary>(COLLECTIONS.sourceLibraries).add({ data: library });
      response.library = library;
    }

    if (event.material) {
      const material: Material = {
        id: event.material.id ?? createId('material', now),
        libraryId: event.material.libraryId,
        ownerOpenid: event.material.ownerOpenid ?? 'system',
        title: event.material.title,
        content: event.material.content,
        status: event.material.status ?? 'ready',
        audioCount: event.material.audioCount ?? 0,
        images: event.material.images ?? [],
        sortOrder: event.material.sortOrder ?? now,
        createdAt: event.material.createdAt ?? now,
        updatedAt: now
      };
      await db.collection<Material>(COLLECTIONS.materials).add({ data: material });
      response.material = material;
    }

    return ok(response);
  } catch (error) {
    const apiError = toApiError(error);
    return fail(apiError.code, apiError.message);
  }
}
