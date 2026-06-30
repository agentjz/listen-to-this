import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  playListeningAudio,
  restartListeningAudio,
  seekListeningAudio,
  stopListeningAudio,
  toggleListeningAudio,
  updateActivePlaybackRate
} from '../../miniprogram/services/audioPlayer';
import { ListeningAudio } from '../../miniprogram/types/domain';

interface MockAudioContext {
  src: string;
  startTime: number;
  playbackRate: number;
  currentTime: number;
  duration: number;
  play(): void;
  pause(): void;
  seek(position: number): void;
  stop(): void;
  destroy(): void;
  onPlay(callback: () => void): void;
  onPause(callback: () => void): void;
  onTimeUpdate(callback: () => void): void;
  onEnded(callback: () => void): void;
  onError(callback: (error: { errMsg: string }) => void): void;
}

function createAudio(id: string): ListeningAudio {
  return {
    id,
    materialId: 'material-1',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: `local-assets/example/${id}.mp3`,
    createdAt: 1,
    updatedAt: 1
  };
}

function createMockContext(events: string[], options: { duration?: number; firePlayImmediately?: boolean } = {}): MockAudioContext {
  let onTimeUpdateCallback: (() => void) | null = null;

  const context: MockAudioContext & { emitTimeUpdate: () => void } = {
    src: '',
    startTime: 0,
    playbackRate: 0,
    currentTime: 0,
    duration: options.duration ?? 0,
    play() {
      if (this.currentTime === 0 && this.startTime > 0) {
        this.currentTime = this.startTime;
      }
      events.push(`play:${this.currentTime}`);
    },
    pause() {
      events.push('pause');
    },
    seek(position: number) {
      this.currentTime = position;
      events.push(`seek:${position}`);
    },
    stop() {
      events.push('stop');
    },
    destroy() {
      events.push('destroy');
    },
    onPlay(callback: () => void) {
      if (options.firePlayImmediately) {
        callback();
      }
    },
    onPause() {},
    onTimeUpdate(callback: () => void) {
      onTimeUpdateCallback = callback;
    },
    onEnded() {},
    onError() {},
    emitTimeUpdate() {
      onTimeUpdateCallback?.();
    }
  };

  return context;
}

function installAudioContext(context: MockAudioContext): void {
  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        return context;
      }
    } as unknown as typeof wx
  });
}

test('playListeningAudio sets source and starts playback', () => {
  const events: string[] = [];
  const context = createMockContext(events, { firePlayImmediately: true });
  installAudioContext(context);
  stopListeningAudio();

  const debugMessages: string[] = [];
  const result = playListeningAudio(createAudio('audio-1'), {
    onDebug(message) {
      debugMessages.push(message);
    }
  });

  assert.equal(context.src, 'local-assets/example/audio-1.mp3');
  assert.equal(context.playbackRate, 1);
  assert.deepEqual(events, ['seek:0', 'play:0']);
  assert.equal(result.src, 'local-assets/example/audio-1.mp3');
  assert.equal(result.format, 'mp3');
  assert.equal(debugMessages.includes('player.event=play'), true);
});

test('playListeningAudio applies requested playback rate', () => {
  const events: string[] = [];
  const context = createMockContext(events);
  installAudioContext(context);
  stopListeningAudio();

  playListeningAudio(createAudio('audio-rate'), {}, { playbackRate: 1.5 });

  assert.equal(context.playbackRate, 1.5);
});

test('toggleListeningAudio pauses and resumes the active audio', () => {
  const events: string[] = [];
  installAudioContext(createMockContext(events));
  stopListeningAudio();
  const audio = createAudio('audio-toggle');

  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.equal(toggleListeningAudio(audio).state, 'paused');
  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.deepEqual(events, ['seek:0', 'play:0', 'pause', 'seek:0', 'play:0']);
});

test('toggleListeningAudio reapplies playback rate before resume', () => {
  const events: string[] = [];
  const context = createMockContext(events);
  installAudioContext(context);
  stopListeningAudio();
  const audio = createAudio('audio-toggle-rate');

  toggleListeningAudio(audio, {}, { playbackRate: 0.75 });
  toggleListeningAudio(audio, {}, { playbackRate: 0.75 });
  toggleListeningAudio(audio, {}, { playbackRate: 1.25 });

  assert.equal(context.playbackRate, 1.25);
  assert.deepEqual(events, ['seek:0', 'play:0', 'pause', 'seek:0', 'play:0']);
});

test('updateActivePlaybackRate keeps the active playing context and applies rate at current position', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  stopListeningAudio();

  playListeningAudio(createAudio('audio-live-rate'), {}, { playbackRate: 1 });
  context.currentTime = 42;
  updateActivePlaybackRate(1.5);

  assert.equal(context.src, 'local-assets/example/audio-live-rate.mp3');
  assert.equal(context.playbackRate, 1.5);
  assert.deepEqual(events, ['seek:0', 'play:0', 'seek:42', 'play:42']);
});

test('updateActivePlaybackRate keeps the paused context without resuming and preserves position', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  stopListeningAudio();
  const audio = createAudio('audio-paused-rate');

  toggleListeningAudio(audio, {}, { playbackRate: 1 });
  context.currentTime = 18;
  toggleListeningAudio(audio, {}, { playbackRate: 1 });
  updateActivePlaybackRate(1.25);

  assert.equal(context.src, 'local-assets/example/audio-paused-rate.mp3');
  assert.equal(context.playbackRate, 1.25);
  assert.deepEqual(events, ['seek:0', 'play:0', 'pause']);

  toggleListeningAudio(audio);

  assert.deepEqual(events, ['seek:0', 'play:0', 'pause', 'seek:18', 'play:18']);
});

test('restartListeningAudio keeps the same context for the same audio and plays from the beginning', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  stopListeningAudio();

  const audio = createAudio('audio-restart');
  playListeningAudio(audio);
  context.currentTime = 35;
  const result = restartListeningAudio(audio, {}, { playbackRate: 1.25 });

  assert.equal(context.currentTime, 0);
  assert.equal(context.playbackRate, 1.25);
  assert.equal(result.state, 'playing');
  assert.deepEqual(events, ['seek:0', 'play:0', 'seek:0', 'play:0']);
});

test('playListeningAudio emits progress on time update', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 120 }) as MockAudioContext & { emitTimeUpdate: () => void };
  installAudioContext(context);
  stopListeningAudio();
  const progress: Array<{ currentTime: number; duration: number; progressPercent: number }> = [];

  playListeningAudio(createAudio('audio-progress'), {
    onTimeUpdate(state) {
      progress.push(state);
    }
  });
  context.currentTime = 30;
  context.emitTimeUpdate();

  assert.deepEqual(progress, [{ currentTime: 30, duration: 120, progressPercent: 25 }]);
});

test('seekListeningAudio jumps and keeps playback active', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  stopListeningAudio();
  const audio = createAudio('audio-seek');

  playListeningAudio(audio);
  const result = seekListeningAudio(audio, 45, {}, { playbackRate: 1.5 });

  assert.equal(context.currentTime, 45);
  assert.equal(context.playbackRate, 1.5);
  assert.equal(result.state, 'playing');
  assert.deepEqual(events, ['seek:0', 'play:0', 'seek:45', 'play:45']);
});

test('seekListeningAudio keeps paused state when seeking the paused active audio', () => {
  const events: string[] = [];
  const context = createMockContext(events, { duration: 100 });
  installAudioContext(context);
  stopListeningAudio();
  const audio = createAudio('audio-paused-seek');

  toggleListeningAudio(audio);
  context.currentTime = 20;
  toggleListeningAudio(audio);
  const result = seekListeningAudio(audio, 55);

  assert.equal(context.currentTime, 55);
  assert.equal(result.state, 'paused');
  assert.deepEqual(events, ['seek:0', 'play:0', 'pause', 'seek:55']);
});

test('playListeningAudio releases the old context when switching audio', () => {
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];
  const firstContext = createMockContext(firstEvents, { duration: 100 });
  const secondContext = createMockContext(secondEvents, { duration: 100 });

  let createdCount = 0;
  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        createdCount += 1;
        return createdCount === 1 ? firstContext : secondContext;
      }
    } as unknown as typeof wx
  });
  stopListeningAudio();

  playListeningAudio(createAudio('audio-old-session'));
  firstContext.currentTime = 60;
  playListeningAudio(createAudio('audio-new-session'));

  assert.equal(secondContext.currentTime, 0);
  assert.deepEqual(firstEvents, ['seek:0', 'play:0', 'stop', 'destroy']);
  assert.deepEqual(secondEvents, ['seek:0', 'play:0']);
});

test('stopListeningAudio destroys the active context and clears playback state', () => {
  const firstEvents: string[] = [];
  const secondEvents: string[] = [];
  const firstContext = createMockContext(firstEvents);
  const secondContext = createMockContext(secondEvents);

  let createdCount = 0;
  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        createdCount += 1;
        return createdCount === 1 ? firstContext : secondContext;
      }
    } as unknown as typeof wx
  });
  stopListeningAudio();

  const audio = createAudio('audio-stop');
  playListeningAudio(audio);
  stopListeningAudio();
  toggleListeningAudio(audio);

  assert.deepEqual(firstEvents, ['seek:0', 'play:0', 'stop', 'destroy']);
  assert.deepEqual(secondEvents, ['seek:0', 'play:0']);
});
