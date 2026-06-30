import { PlaybackRate, PlaybackSettings } from '../types/playback';

const PLAYBACK_SETTINGS_KEY = 'listen.playbackSettings';

export const PLAYBACK_RATES: PlaybackRate[] = [0.75, 1, 1.25, 1.5];

export const DEFAULT_PLAYBACK_SETTINGS: PlaybackSettings = {
  playbackRate: 1,
  singleLoopEnabled: false,
  autoPlayNextEnabled: false
};

export function readPlaybackSettings(): PlaybackSettings {
  return normalizePlaybackSettings(wx.getStorageSync<Partial<PlaybackSettings> | null>(PLAYBACK_SETTINGS_KEY));
}

export function writePlaybackSettings(settings: PlaybackSettings): PlaybackSettings {
  const normalized = normalizePlaybackSettings(settings);
  wx.setStorageSync(PLAYBACK_SETTINGS_KEY, normalized);
  return normalized;
}

export function updatePlaybackSettings(patch: Partial<PlaybackSettings>): PlaybackSettings {
  return writePlaybackSettings({
    ...readPlaybackSettings(),
    ...patch
  });
}

export function getNextPlaybackRate(currentRate: PlaybackRate): PlaybackRate {
  const index = PLAYBACK_RATES.indexOf(currentRate);
  return PLAYBACK_RATES[(index + 1) % PLAYBACK_RATES.length] ?? DEFAULT_PLAYBACK_SETTINGS.playbackRate;
}

export function normalizePlaybackSettings(value: Partial<PlaybackSettings> | null | undefined): PlaybackSettings {
  const playbackRate = isPlaybackRate(value?.playbackRate) ? value.playbackRate : DEFAULT_PLAYBACK_SETTINGS.playbackRate;

  return {
    playbackRate,
    singleLoopEnabled: value?.singleLoopEnabled === true,
    autoPlayNextEnabled: value?.autoPlayNextEnabled === true
  };
}

function isPlaybackRate(value: unknown): value is PlaybackRate {
  return PLAYBACK_RATES.includes(value as PlaybackRate);
}
