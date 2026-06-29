import assert from 'node:assert/strict';
import { test } from 'node:test';
import { playListeningAudio, restartListeningAudio, toggleListeningAudio } from '../miniprogram/services/audioPlayer';
import { ListeningAudio } from '../miniprogram/types/domain';

test('playListeningAudio sets source and starts playback', () => {
  const events: string[] = [];
  const context = {
    src: '',
    playbackRate: 0,
    currentTime: 0,
    duration: 0,
    play() {
      events.push('play');
    },
    pause() {
      events.push('pause');
    },
    stop() {
      events.push('stop');
    },
    destroy() {
      events.push('destroy');
    },
    onPlay(callback: () => void) {
      callback();
    },
    onEnded() {},
    onError() {}
  };

  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        return context;
      }
    } as unknown as typeof wx
  });

  const audio: ListeningAudio = {
    id: 'audio-1',
    materialId: 'material-1',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: 'local-assets/example/audio.mp3',
    createdAt: 1,
    updatedAt: 1
  };
  const debugLines: string[] = [];
  const result = playListeningAudio(audio, {
    onDebug(message) {
      debugLines.push(message);
    }
  });

  assert.equal(context.src, 'local-assets/example/audio.mp3');
  assert.equal(context.playbackRate, 1);
  assert.deepEqual(events, ['play']);
  assert.equal(result.src, 'local-assets/example/audio.mp3');
  assert.equal(result.format, 'mp3');
  assert.equal(debugLines.includes('player.event=play'), true);
});

test('toggleListeningAudio pauses and resumes the active audio', () => {
  const events: string[] = [];
  const context = {
    src: '',
    playbackRate: 0,
    currentTime: 0,
    duration: 0,
    play() {
      events.push('play');
    },
    pause() {
      events.push('pause');
    },
    stop() {
      events.push('stop');
    },
    destroy() {
      events.push('destroy');
    },
    onPlay() {},
    onEnded() {},
    onError() {}
  };

  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        return context;
      }
    } as unknown as typeof wx
  });

  const audio: ListeningAudio = {
    id: 'audio-toggle',
    materialId: 'material-1',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: 'local-assets/example/audio.mp3',
    createdAt: 1,
    updatedAt: 1
  };

  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.equal(toggleListeningAudio(audio).state, 'paused');
  assert.equal(toggleListeningAudio(audio).state, 'playing');
  assert.deepEqual(events, ['play', 'pause', 'play']);
});

test('restartListeningAudio plays the active audio from the beginning', () => {
  const events: string[] = [];
  const context = {
    src: '',
    playbackRate: 0,
    currentTime: 0,
    duration: 100,
    play() {
      events.push(`play:${this.currentTime}`);
    },
    pause() {
      events.push('pause');
    },
    stop() {
      events.push('stop');
    },
    destroy() {
      events.push('destroy');
    },
    onPlay() {},
    onEnded() {},
    onError() {}
  };

  Object.assign(globalThis, {
    wx: {
      createInnerAudioContext() {
        return context;
      }
    } as unknown as typeof wx
  });

  const audio: ListeningAudio = {
    id: 'audio-restart',
    materialId: 'material-1',
    sourceKind: 'upload',
    format: 'mp3',
    cloudFileId: 'local-assets/example/audio.mp3',
    createdAt: 1,
    updatedAt: 1
  };

  playListeningAudio(audio);
  context.currentTime = 35;
  const result = restartListeningAudio(audio);

  assert.equal(context.currentTime, 0);
  assert.equal(result.state, 'playing');
  assert.deepEqual(events, ['play:0', 'play:0']);
});
