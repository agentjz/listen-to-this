export type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

export interface PlaybackSettings {
  playbackRate: PlaybackRate;
  singleLoopEnabled: boolean;
  autoPlayNextEnabled: boolean;
}

export type PlaybackEndAction = 'loop-current' | 'auto-next' | 'stop';
