import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearLocalRepository,
  createLocalLibrary,
  deleteLocalLibrary,
  deleteLocalMaterial,
  loadLocalSnapshot,
  moveLocalMaterial,
  replaceLocalMaterialAudio,
  reorderLocalMaterial,
  saveLocalMaterial,
  updateLocalMaterial
} from '../miniprogram/services/localRepository';
import { LOCAL_ASSET_MATERIALS } from '../miniprogram/generated/localAssets';

const storage = new Map<string, unknown>();

Object.assign(globalThis, {
  wx: {
  getStorageSync<T>(key: string): T {
    return storage.get(key) as T;
  },
  setStorageSync<T>(key: string, data: T): void {
    storage.set(key, data);
  },
  removeStorageSync(key: string): void {
    storage.delete(key);
  }
  } as typeof wx
});

test('local repository provides a default local library', () => {
  clearLocalRepository();

  const snapshot = loadLocalSnapshot();

  assert.equal(snapshot.libraries.length, 1);
  assert.equal(snapshot.libraries[0]?.name, '本地材料');
  const firstAsset = LOCAL_ASSET_MATERIALS[0];
  assert.ok(firstAsset);
  assert.equal(snapshot.materials.length, LOCAL_ASSET_MATERIALS.length);
  assert.equal(snapshot.materials[0]?.title, firstAsset.title);
  assert.equal(snapshot.materials[0]?.audioCount, firstAsset.audio ? 1 : 0);
  assert.equal(snapshot.listeningAudios.length, LOCAL_ASSET_MATERIALS.filter((asset) => asset.audio).length);
  assert.equal(snapshot.listeningAudios[0]?.cloudFileId, firstAsset.audio?.cloudFileId);
});

test('local repository saves imported material without cloud', () => {
  clearLocalRepository();

  const saved = saveLocalMaterial({
    content: 'Hello world. Keep listening.',
    title: 'Local test',
    now: Date.UTC(2026, 5, 29)
  });
  const snapshot = loadLocalSnapshot();

  assert.equal(saved.material.title, 'Local test');
  assert.equal(snapshot.materials.length, 2);
});

test('local repository creates custom libraries', () => {
  clearLocalRepository();

  const result = createLocalLibrary('Intensive Listening', Date.UTC(2026, 5, 29));
  const snapshot = loadLocalSnapshot();

  assert.equal(result.library.name, 'Intensive Listening');
  assert.equal(snapshot.libraries.length, 2);
});

test('local repository refuses deleting the default library', () => {
  clearLocalRepository();
  const snapshot = loadLocalSnapshot();

  assert.throws(() => deleteLocalLibrary(snapshot.libraries[0]?.id ?? ''), /默认本地分类不能删除/);
});

test('local repository deletes empty custom libraries', () => {
  clearLocalRepository();
  const library = createLocalLibrary('Empty', Date.UTC(2026, 5, 29)).library;

  const result = deleteLocalLibrary(library.id);
  const snapshot = loadLocalSnapshot();

  assert.equal(result.libraryId, library.id);
  assert.equal(snapshot.libraries.some((item) => item.id === library.id), false);
});

test('local repository refuses deleting non-empty custom libraries', () => {
  clearLocalRepository();
  const library = createLocalLibrary('Not empty', Date.UTC(2026, 5, 29)).library;
  saveLocalMaterial({
    libraryId: library.id,
    content: 'Keep this material.',
    title: 'Protected',
    now: Date.UTC(2026, 5, 30)
  });

  assert.throws(() => deleteLocalLibrary(library.id), /分类内还有材料/);
});

test('local repository moves material to another library', () => {
  clearLocalRepository();
  const library = createLocalLibrary('Review', Date.UTC(2026, 5, 29)).library;
  const saved = saveLocalMaterial({
    content: 'Move me.',
    title: 'Movable',
    now: Date.UTC(2026, 5, 30)
  });

  const moved = moveLocalMaterial(saved.material.id, library.id, Date.UTC(2026, 6, 1));

  assert.equal(moved.material.libraryId, library.id);
});

test('local repository updates material title and content', () => {
  clearLocalRepository();
  const saved = saveLocalMaterial({
    content: 'Before.',
    title: 'Before',
    now: Date.UTC(2026, 5, 29)
  });

  const updated = updateLocalMaterial(saved.material.id, {
    title: 'After',
    content: 'After content.',
    now: Date.UTC(2026, 5, 30)
  });

  assert.equal(updated.material.title, 'After');
  assert.equal(updated.material.content, 'After content.');
});

test('local repository replaces material audio with one current record', () => {
  clearLocalRepository();
  const saved = saveLocalMaterial({
    content: 'Audio material.',
    title: 'Audio',
    now: Date.UTC(2026, 5, 29)
  });

  replaceLocalMaterialAudio(saved.material.id, {
    cloudFileId: 'wxfile://first.mp3',
    format: 'mp3',
    now: Date.UTC(2026, 5, 30)
  });
  const replaced = replaceLocalMaterialAudio(saved.material.id, {
    cloudFileId: 'wxfile://second.m4a',
    format: 'm4a',
    now: Date.UTC(2026, 6, 1)
  });
  const snapshot = loadLocalSnapshot();
  const audios = snapshot.listeningAudios.filter((audio) => audio.materialId === saved.material.id);
  const material = snapshot.materials.find((item) => item.id === saved.material.id);

  assert.equal(replaced.listeningAudio.cloudFileId, 'wxfile://second.m4a');
  assert.equal(audios.length, 1);
  assert.equal(audios[0]?.format, 'm4a');
  assert.equal(material?.audioCount, 1);
});

test('local repository reorders materials inside a library', () => {
  clearLocalRepository();
  const first = saveLocalMaterial({
    content: 'First.',
    title: 'First',
    now: Date.UTC(2026, 5, 29)
  }).material;
  const second = saveLocalMaterial({
    content: 'Second.',
    title: 'Second',
    now: Date.UTC(2026, 5, 30)
  }).material;

  const reordered = reorderLocalMaterial(first.id, 'down', Date.UTC(2026, 6, 1));

  assert.equal(reordered.materials.some((material) => material.id === first.id), true);
  assert.equal(reordered.materials.some((material) => material.id === second.id), true);
  assert.ok(reordered.materials.findIndex((material) => material.id === second.id) < reordered.materials.findIndex((material) => material.id === first.id));
});

test('local repository deletes material with audio records', () => {
  clearLocalRepository();
  const saved = saveLocalMaterial({
    content: 'Delete me.',
    title: 'Temporary',
    now: Date.UTC(2026, 5, 29)
  });

  const result = deleteLocalMaterial(saved.material.id);
  const snapshot = loadLocalSnapshot();

  assert.equal(result.materialId, saved.material.id);
  assert.equal(snapshot.materials.some((material) => material.id === saved.material.id), false);
});
