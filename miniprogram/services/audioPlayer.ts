import { ListeningAudio } from '../types/domain';

export interface AudioPlayerHooks {
  onDebug?: (message: string) => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
}

export interface PlayListeningAudioResult {
  src: string;
  format: ListeningAudio['format'];
  state: AudioPlaybackState;
}

export type AudioPlaybackState = 'playing' | 'paused' | 'stopped';

let activeAudioContext: WechatMiniprogram.InnerAudioContext | null = null;
let activeAudioId = '';
let activePlaybackState: AudioPlaybackState = 'stopped';

export function toggleListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  if (activeAudioContext && activeAudioId === audio.id && activePlaybackState === 'playing') {
    activeAudioContext.pause();
    activePlaybackState = 'paused';
    hooks.onDebug?.('player.command=pause');
    hooks.onPause?.();
    return {
      src: audio.cloudFileId,
      format: audio.format,
      state: activePlaybackState
    };
  }

  if (activeAudioContext && activeAudioId === audio.id && activePlaybackState === 'paused') {
    activeAudioContext.play();
    activePlaybackState = 'playing';
    hooks.onDebug?.('player.command=resume');
    hooks.onPlay?.();
    return {
      src: audio.cloudFileId,
      format: audio.format,
      state: activePlaybackState
    };
  }

  return playListeningAudio(audio, hooks);
}

export function playListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  if (activeAudioContext && activeAudioId !== audio.id) {
    activeAudioContext.stop();
    activeAudioContext.destroy();
  }

  const context = activeAudioContext && activeAudioId === audio.id ? activeAudioContext : wx.createInnerAudioContext();
  activeAudioContext = context;
  activeAudioId = audio.id;
  activePlaybackState = 'playing';
  context.src = audio.cloudFileId;
  context.playbackRate = 1;

  hooks.onDebug?.(`audio.id=${audio.id}`);
  hooks.onDebug?.(`audio.src=${audio.cloudFileId}`);
  hooks.onDebug?.(`audio.format=${audio.format}`);

  context.onPlay(() => {
    activePlaybackState = 'playing';
    hooks.onDebug?.('player.event=play');
    hooks.onPlay?.();
  });

  context.onEnded(() => {
    activePlaybackState = 'stopped';
    hooks.onDebug?.('player.event=ended');
    hooks.onEnded?.();
  });

  context.onError((error) => {
    activePlaybackState = 'stopped';
    const message = error.errMsg || 'unknown audio error';
    hooks.onDebug?.(`player.error=${message}`);
    hooks.onError?.(message);
  });

  context.play();
  hooks.onDebug?.('player.command=play');

  return {
    src: audio.cloudFileId,
    format: audio.format,
    state: activePlaybackState
  };
}

export function restartListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}): PlayListeningAudioResult {
  const result = activeAudioContext && activeAudioId === audio.id ? playActiveAudioFromStart(audio, hooks) : playListeningAudio(audio, hooks);
  hooks.onDebug?.('player.command=restart');
  return result;
}

function playActiveAudioFromStart(audio: ListeningAudio, hooks: AudioPlayerHooks): PlayListeningAudioResult {
  if (!activeAudioContext) {
    return playListeningAudio(audio, hooks);
  }

  activeAudioContext.currentTime = 0;
  activeAudioContext.play();
  activePlaybackState = 'playing';
  hooks.onPlay?.();

  return {
    src: audio.cloudFileId,
    format: audio.format,
    state: activePlaybackState
  };
}
