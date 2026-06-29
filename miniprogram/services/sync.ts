export { loadSnapshotByMode, syncCloudData as syncData } from './runtimeData';
export type { AppSnapshot } from './runtimeData';

import { loadSnapshotByMode } from './runtimeData';

export async function loadAppSnapshot() {
  return loadSnapshotByMode('cloud');
}
