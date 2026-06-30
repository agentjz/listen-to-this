import { PlaybackEndAction, PlaybackSettings } from '../types/playback';

export const AUTO_PLAY_NEXT_DELAY_MS = 3000;

export function resolvePlaybackEndAction(input: {
  settings: PlaybackSettings;
  hasNextPlayable: boolean;
}): PlaybackEndAction {
  if (input.settings.singleLoopEnabled) {
    return 'loop-current';
  }

  if (input.settings.autoPlayNextEnabled && input.hasNextPlayable) {
    return 'auto-next';
  }

  return 'stop';
}
