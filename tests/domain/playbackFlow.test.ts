import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AUTO_PLAY_NEXT_DELAY_MS, resolvePlaybackEndAction } from '../../miniprogram/lib/playbackFlow';

test('resolvePlaybackEndAction gives single loop priority', () => {
  assert.equal(
    resolvePlaybackEndAction({
      settings: { playbackRate: 1, singleLoopEnabled: true, autoPlayNextEnabled: true },
      hasNextPlayable: true
    }),
    'loop-current'
  );
});

test('resolvePlaybackEndAction auto plays next only when enabled and available', () => {
  assert.equal(
    resolvePlaybackEndAction({
      settings: { playbackRate: 1, singleLoopEnabled: false, autoPlayNextEnabled: true },
      hasNextPlayable: true
    }),
    'auto-next'
  );
  assert.equal(
    resolvePlaybackEndAction({
      settings: { playbackRate: 1, singleLoopEnabled: false, autoPlayNextEnabled: true },
      hasNextPlayable: false
    }),
    'stop'
  );
});

test('auto play next delay is fixed at three seconds', () => {
  assert.equal(AUTO_PLAY_NEXT_DELAY_MS, 3000);
});
