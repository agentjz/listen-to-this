import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_PLAYBACK_SETTINGS,
  getNextPlaybackRate,
  normalizePlaybackSettings,
  readPlaybackSettings,
  updatePlaybackSettings,
  writePlaybackSettings
} from '../../miniprogram/services/playbackSettings';

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

test('normalizePlaybackSettings keeps only current supported settings', () => {
  assert.deepEqual(normalizePlaybackSettings(null), DEFAULT_PLAYBACK_SETTINGS);
  assert.deepEqual(
    normalizePlaybackSettings({
      playbackRate: 2 as never,
      singleLoopEnabled: true,
      autoPlayNextEnabled: true
    }),
    {
      playbackRate: 1,
      singleLoopEnabled: true,
      autoPlayNextEnabled: true
    }
  );
});

test('playback settings read write and update storage', () => {
  storage.clear();

  assert.deepEqual(readPlaybackSettings(), DEFAULT_PLAYBACK_SETTINGS);
  assert.deepEqual(writePlaybackSettings({ playbackRate: 1.25, singleLoopEnabled: true, autoPlayNextEnabled: false }), {
    playbackRate: 1.25,
    singleLoopEnabled: true,
    autoPlayNextEnabled: false
  });
  assert.deepEqual(updatePlaybackSettings({ autoPlayNextEnabled: true }), {
    playbackRate: 1.25,
    singleLoopEnabled: true,
    autoPlayNextEnabled: true
  });
});

test('getNextPlaybackRate cycles through supported rates', () => {
  assert.equal(getNextPlaybackRate(0.75), 1);
  assert.equal(getNextPlaybackRate(1), 1.25);
  assert.equal(getNextPlaybackRate(1.25), 1.5);
  assert.equal(getNextPlaybackRate(1.5), 0.75);
});
