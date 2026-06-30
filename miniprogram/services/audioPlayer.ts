import { ListeningAudio } from '../types/domain';
import { PlaybackRate } from '../types/playback';

export interface AudioPlayerHooks {
  onDebug?: (message: string) => void;
  onError?: (message: string) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onTimeUpdate?: (state: AudioProgressState) => void;
}

export interface PlayListeningAudioResult {
  src: string;
  format: ListeningAudio['format'];
  state: AudioPlaybackState;
}

export type AudioPlaybackState = 'playing' | 'paused' | 'stopped';

export interface AudioPlaybackOptions {
  playbackRate?: PlaybackRate;
}

export interface AudioProgressState {
  currentTime: number;
  duration: number;
  progressPercent: number;
}

let activeAudioContext: WechatMiniprogram.InnerAudioContext | null = null;
let activeAudio: ListeningAudio | null = null;
let activeHooks: AudioPlayerHooks = {};
let activeAudioId = '';
let activePlaybackState: AudioPlaybackState = 'stopped';
let activePlaybackRate: PlaybackRate = 1;
let activePositionSeconds = 0;
let activeSessionToken = 0;

export function toggleListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}, options: AudioPlaybackOptions = {}): PlayListeningAudioResult {
  if (activeAudioContext && activeAudioId === audio.id && activePlaybackState === 'playing') {
    pauseActiveAudio(hooks);
    return buildResult(audio);
  }

  const context = ensureAudioSession(audio, hooks, options.playbackRate ?? activePlaybackRate);
  activePlaybackRate = options.playbackRate ?? activePlaybackRate;
  activeHooks = hooks;

  if (activePlaybackState === 'paused') {
    context.playbackRate = activePlaybackRate;
    context.seek(activePositionSeconds);
    context.play();
    activePlaybackState = 'playing';
    debug(`player.command=resume position=${activePositionSeconds}`, hooks);
    hooks.onPlay?.();
    return buildResult(audio);
  }

  activePositionSeconds = 0;
  context.playbackRate = activePlaybackRate;
  context.seek(0);
  context.play();
  activePlaybackState = 'playing';
  debug('player.command=play', hooks);
  return buildResult(audio);
}

export function playListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}, options: AudioPlaybackOptions = {}): PlayListeningAudioResult {
  const context = ensureAudioSession(audio, hooks, options.playbackRate ?? 1);
  activePlaybackRate = options.playbackRate ?? 1;
  activePositionSeconds = 0;
  context.playbackRate = activePlaybackRate;
  context.seek(0);
  context.play();
  activePlaybackState = 'playing';
  debug('player.command=play', hooks);
  return buildResult(audio);
}

export function restartListeningAudio(audio: ListeningAudio, hooks: AudioPlayerHooks = {}, options: AudioPlaybackOptions = {}): PlayListeningAudioResult {
  const context = ensureAudioSession(audio, hooks, options.playbackRate ?? activePlaybackRate);
  activePlaybackRate = options.playbackRate ?? activePlaybackRate;
  activePositionSeconds = 0;
  context.playbackRate = activePlaybackRate;
  context.seek(0);
  context.play();
  activePlaybackState = 'playing';
  debug('player.command=restart position=0', hooks);
  hooks.onPlay?.();
  return buildResult(audio);
}

export function stopListeningAudio(hooks: AudioPlayerHooks = {}): void {
  if (!activeAudioContext) {
    clearActiveAudioState();
    return;
  }

  activeSessionToken += 1;
  activeAudioContext.stop();
  activeAudioContext.destroy();
  activeAudioContext = null;
  clearActiveAudioState();
  debug('player.command=stop', hooks);
}

export function seekListeningAudio(audio: ListeningAudio, positionSeconds: number, hooks: AudioPlayerHooks = {}, options: AudioPlaybackOptions = {}): PlayListeningAudioResult {
  const previousState = activeAudioContext && activeAudioId === audio.id ? activePlaybackState : 'stopped';
  const targetPosition = normalizeTime(positionSeconds);
  const context = ensureAudioSession(audio, hooks, options.playbackRate ?? activePlaybackRate);

  activePlaybackRate = options.playbackRate ?? activePlaybackRate;
  activePositionSeconds = targetPosition;
  context.playbackRate = activePlaybackRate;
  context.seek(targetPosition);
  debug(`player.command=seek position=${targetPosition}`, hooks);

  if (previousState === 'playing' || previousState === 'stopped') {
    context.play();
    activePlaybackState = 'playing';
    hooks.onPlay?.();
  } else {
    activePlaybackState = 'paused';
  }

  return buildResult(audio);
}

export function updateActivePlaybackRate(playbackRate: PlaybackRate): void {
  activePlaybackRate = playbackRate;

  if (!activeAudioContext || !activeAudio) {
    return;
  }

  activeAudioContext.playbackRate = playbackRate;

  if (activePlaybackState === 'playing') {
    activePositionSeconds = readActivePosition();
    activeAudioContext.seek(activePositionSeconds);
    activeAudioContext.play();
    debug(`player.command=rate position=${activePositionSeconds} rate=${playbackRate}`, activeHooks);
    return;
  }

  if (activePlaybackState === 'paused') {
    activePositionSeconds = readActivePosition();
    debug(`player.command=rate-paused position=${activePositionSeconds} rate=${playbackRate}`, activeHooks);
  }
}

function ensureAudioSession(audio: ListeningAudio, hooks: AudioPlayerHooks, playbackRate: PlaybackRate): WechatMiniprogram.InnerAudioContext {
  if (activeAudioContext && activeAudioId === audio.id) {
    activeAudio = audio;
    activeHooks = hooks;
    activePlaybackRate = playbackRate;
    activeAudioContext.playbackRate = playbackRate;
    return activeAudioContext;
  }

  releaseActiveAudio(hooks);
  return createAudioSession(audio, hooks, playbackRate);
}

function createAudioSession(audio: ListeningAudio, hooks: AudioPlayerHooks, playbackRate: PlaybackRate): WechatMiniprogram.InnerAudioContext {
  const context = wx.createInnerAudioContext();
  const sessionToken = activeSessionToken + 1;

  activeSessionToken = sessionToken;
  activeAudioContext = context;
  activeAudio = audio;
  activeHooks = hooks;
  activeAudioId = audio.id;
  activePlaybackState = 'stopped';
  activePlaybackRate = playbackRate;
  activePositionSeconds = 0;

  context.src = audio.cloudFileId;
  context.startTime = 0;
  context.playbackRate = playbackRate;

  debug(`audio.id=${audio.id}`, hooks);
  debug(`audio.src=${audio.cloudFileId}`, hooks);
  debug(`audio.format=${audio.format}`, hooks);
  debug(`audio.playbackRate=${playbackRate}`, hooks);

  context.onPlay(() => {
    if (!isActiveSession(sessionToken, context)) {
      return;
    }

    activePlaybackState = 'playing';
    debug('player.event=play', hooks);
    hooks.onPlay?.();
  });

  context.onPause(() => {
    if (!isActiveSession(sessionToken, context)) {
      return;
    }

    activePositionSeconds = readProgressState(context).currentTime;
    activePlaybackState = 'paused';
    debug('player.event=pause', hooks);
    hooks.onPause?.();
  });

  context.onTimeUpdate(() => {
    if (!isActiveSession(sessionToken, context)) {
      return;
    }

    const state = readProgressState(context);
    activePositionSeconds = state.currentTime;
    hooks.onTimeUpdate?.(state);
  });

  context.onEnded(() => {
    if (!isActiveSession(sessionToken, context)) {
      return;
    }

    activePlaybackState = 'stopped';
    activePositionSeconds = 0;
    debug('player.event=ended', hooks);
    hooks.onEnded?.();
  });

  context.onError((error) => {
    if (!isActiveSession(sessionToken, context)) {
      return;
    }

    activePlaybackState = 'stopped';
    const message = error.errMsg || 'unknown audio error';
    console.error('[audioPlayer]', message);
    hooks.onDebug?.(`player.error=${message}`);
    hooks.onError?.(message);
  });

  return context;
}

function pauseActiveAudio(hooks: AudioPlayerHooks): void {
  if (!activeAudioContext) {
    return;
  }

  activePositionSeconds = readActivePosition();
  activeAudioContext.pause();
  activePlaybackState = 'paused';
  activeHooks = hooks;
  debug(`player.command=pause position=${activePositionSeconds}`, hooks);
  hooks.onPause?.();
}

function releaseActiveAudio(hooks: AudioPlayerHooks): void {
  if (!activeAudioContext) {
    clearActiveAudioState();
    return;
  }

  activeSessionToken += 1;
  activeAudioContext.stop();
  activeAudioContext.destroy();
  activeAudioContext = null;
  clearActiveAudioState();
  debug('player.command=release', hooks);
}

function clearActiveAudioState(): void {
  activeAudio = null;
  activeHooks = {};
  activeAudioId = '';
  activePlaybackState = 'stopped';
  activePlaybackRate = 1;
  activePositionSeconds = 0;
}

function buildResult(audio: ListeningAudio): PlayListeningAudioResult {
  return {
    src: audio.cloudFileId,
    format: audio.format,
    state: activePlaybackState
  };
}

function isActiveSession(sessionToken: number, context: WechatMiniprogram.InnerAudioContext): boolean {
  return activeSessionToken === sessionToken && activeAudioContext === context;
}

function readActivePosition(): number {
  if (!activeAudioContext) {
    return activePositionSeconds;
  }

  const contextTime = normalizeTime(activeAudioContext.currentTime);
  if (contextTime === 0 && activePositionSeconds > 0) {
    return activePositionSeconds;
  }

  return contextTime;
}

function readProgressState(context: WechatMiniprogram.InnerAudioContext): AudioProgressState {
  const currentTime = normalizeTime(context.currentTime);
  const duration = normalizeTime(context.duration);
  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100))) : 0;
  return { currentTime, duration, progressPercent };
}

function normalizeTime(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}

function debug(message: string, hooks: AudioPlayerHooks): void {
  console.info('[audioPlayer]', message);
  hooks.onDebug?.(message);
}
