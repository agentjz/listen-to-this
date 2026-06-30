import {
  advancePracticeQueue,
  buildPracticeMaterials,
  createPracticeQueue,
  filterPracticeMaterials,
  getCurrentPracticeMaterial
} from '../../miniprogram/lib/practice';
import { formatPlaybackTime } from '../../miniprogram/lib/materialListView';
import { AudioProgressState, restartListeningAudio, seekListeningAudio, stopListeningAudio, toggleListeningAudio, updateActivePlaybackRate } from '../../miniprogram/services/audioPlayer';
import { getPracticeGroup } from '../../miniprogram/services/practiceGroups';
import { loadSnapshotByMode } from '../../miniprogram/services/runtimeData';
import { AUTO_PLAY_NEXT_DELAY_MS, resolvePlaybackEndAction } from '../../miniprogram/lib/playbackFlow';
import { getNextPlaybackRate, readPlaybackSettings, updatePlaybackSettings } from '../../miniprogram/services/playbackSettings';
import { PracticeGroup, PracticeMaterial, PracticeQueueState, PracticeSourceType } from '../../miniprogram/types/practice';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { PlaybackRate, PlaybackSettings } from '../../miniprogram/types/playback';

interface PracticePlayerData {
  mode: DataMode;
  sourceType: PracticeSourceType;
  sourceId: string;
  title: string;
  isLoading: boolean;
  materials: PracticeMaterial[];
  queue: PracticeQueueState;
  currentMaterial: PracticeMaterial | null;
  currentRoundText: string;
  playingMaterialId: string;
  pausedMaterialId: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  currentTimeText: string;
  durationText: string;
  isSeeking: boolean;
  showContent: boolean;
  playbackSettings: PlaybackSettings;
  playbackRateText: string;
}

Page<PracticePlayerData, {
  load: () => Promise<void>;
  togglePlay: () => void;
  restartCurrent: () => void;
  nextMaterial: () => void;
  cyclePlaybackRate: () => void;
  toggleSingleLoop: () => void;
  toggleAutoPlayNext: () => void;
  toggleContent: () => void;
  onProgressChanging: (event: { detail: { value: number } }) => void;
  onProgressChanged: (event: { detail: { value: number } }) => void;
  updateProgress: (state: AudioProgressState) => void;
  resetProgress: () => void;
  clearPendingAutoPlay: () => void;
  playPracticeMaterial: (material: PracticeMaterial) => void;
  handlePlaybackEnded: (materialId: string) => void;
  updatePlaybackSettingsData: (settings: PlaybackSettings) => void;
  refreshCurrentMaterial: (queue: PracticeQueueState, materials?: PracticeMaterial[]) => void;
  formatTime: (seconds: number) => string;
  buildAudioHooks: (materialId: string) => {
    onError: (message: string) => void;
    onEnded: () => void;
    onPlay: () => void;
    onPause: () => void;
    onTimeUpdate: (state: AudioProgressState) => void;
  };
  resolveTitle: (group: PracticeGroup | null, libraryName: string) => string;
}>({
  data: {
    mode: 'local',
    sourceType: 'all',
    sourceId: '',
    title: '听写练习',
    isLoading: true,
    materials: [],
    queue: { materialIds: [], currentIndex: 0 },
    currentMaterial: null,
    currentRoundText: '',
    playingMaterialId: '',
    pausedMaterialId: '',
    currentTime: 0,
    duration: 0,
    progressPercent: 0,
    currentTimeText: '00:00',
    durationText: '00:00',
    isSeeking: false,
    showContent: false,
    playbackSettings: readPlaybackSettings(),
    playbackRateText: '1x'
  },

  async onLoad(query) {
    const sourceType = query?.sourceType === 'library' || query?.sourceType === 'group' ? query.sourceType : 'all';
    this.setData({
      mode: parseDataMode(query?.mode),
      sourceType,
      sourceId: query?.sourceId ?? ''
    });
    await this.load();
  },

  onHide() {
    this.clearPendingAutoPlay();
    stopListeningAudio();
    this.resetProgress();
  },

  onUnload() {
    this.clearPendingAutoPlay();
    stopListeningAudio();
    this.resetProgress();
  },

  async load() {
    try {
      this.clearPendingAutoPlay();
      stopListeningAudio();
      this.resetProgress();
      this.updatePlaybackSettingsData(readPlaybackSettings());
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const allPracticeMaterials = buildPracticeMaterials({
        libraries: snapshot.data.libraries,
        materials: snapshot.data.materials,
        listeningAudios: snapshot.data.listeningAudios
      });
      const group = this.data.sourceType === 'group' ? getPracticeGroup(this.data.mode, this.data.sourceId) : null;
      const library = this.data.sourceType === 'library'
        ? snapshot.data.libraries.find((item) => item.id === this.data.sourceId)
        : undefined;
      const materials = filterPracticeMaterials({
        materials: allPracticeMaterials,
        source: {
          type: this.data.sourceType,
          id: this.data.sourceId
        },
        group
      });
      const queue = createPracticeQueue(materials.map((material) => material.id));

      this.setData({
        title: this.resolveTitle(group, library?.name ?? ''),
        isLoading: false,
        materials,
        queue,
        showContent: false
      });
      this.refreshCurrentMaterial(queue, materials);
    } catch (error) {
      this.setData({ isLoading: false, materials: [], currentMaterial: null });
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  togglePlay() {
    this.clearPendingAutoPlay();
    const material = this.data.currentMaterial;
    if (!material) {
      return;
    }

    const result = toggleListeningAudio(material.audio, this.buildAudioHooks(material.id), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    if (result.state === 'playing') {
      this.setData({ playingMaterialId: material.id, pausedMaterialId: '' });
      return;
    }

    if (result.state === 'paused') {
      this.setData({ playingMaterialId: '', pausedMaterialId: material.id });
    }
  },

  restartCurrent() {
    this.clearPendingAutoPlay();
    const material = this.data.currentMaterial;
    if (!material) {
      return;
    }

    restartListeningAudio(material.audio, this.buildAudioHooks(material.id), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    this.setData({ playingMaterialId: material.id, pausedMaterialId: '' });
  },

  nextMaterial() {
    this.clearPendingAutoPlay();
    if (this.data.materials.length === 0) {
      return;
    }

    stopListeningAudio();
    const queue = advancePracticeQueue(this.data.queue, this.data.materials.map((material) => material.id));
    this.resetProgress();
    this.setData({ queue, showContent: false });
    this.refreshCurrentMaterial(queue);
  },

  cyclePlaybackRate() {
    const playbackRate = getNextPlaybackRate(this.data.playbackSettings.playbackRate);
    const settings = updatePlaybackSettings({ playbackRate });
    this.updatePlaybackSettingsData(settings);
    updateActivePlaybackRate(settings.playbackRate);
  },

  toggleSingleLoop() {
    const settings = updatePlaybackSettings({
      singleLoopEnabled: !this.data.playbackSettings.singleLoopEnabled
    });
    this.updatePlaybackSettingsData(settings);
  },

  toggleAutoPlayNext() {
    const settings = updatePlaybackSettings({
      autoPlayNextEnabled: !this.data.playbackSettings.autoPlayNextEnabled
    });
    this.updatePlaybackSettingsData(settings);
  },

  toggleContent() {
    this.setData({ showContent: !this.data.showContent });
  },

  onProgressChanging(event) {
    const percent = Math.max(0, Math.min(100, event.detail.value));
    const duration = this.data.duration;
    const currentTime = duration > 0 ? (duration * percent) / 100 : 0;
    this.setData({
      isSeeking: true,
      progressPercent: percent,
      currentTime,
      currentTimeText: this.formatTime(currentTime)
    });
  },

  onProgressChanged(event) {
    const material = this.data.currentMaterial;
    if (!material) {
      this.setData({ isSeeking: false });
      return;
    }

    const percent = Math.max(0, Math.min(100, event.detail.value));
    const duration = this.data.duration;
    const targetSeconds = duration > 0 ? (duration * percent) / 100 : 0;
    this.clearPendingAutoPlay();
    seekListeningAudio(material.audio, targetSeconds, this.buildAudioHooks(material.id), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    this.setData({
      isSeeking: false,
      playingMaterialId: material.id,
      pausedMaterialId: ''
    });
  },

  updateProgress(state) {
    if (this.data.isSeeking) {
      return;
    }

    this.setData({
      currentTime: state.currentTime,
      duration: state.duration,
      progressPercent: state.progressPercent,
      currentTimeText: this.formatTime(state.currentTime),
      durationText: this.formatTime(state.duration)
    });
  },

  resetProgress() {
    this.setData({
      playingMaterialId: '',
      pausedMaterialId: '',
      currentTime: 0,
      duration: 0,
      progressPercent: 0,
      currentTimeText: '00:00',
      durationText: '00:00',
      isSeeking: false
    });
  },

  clearPendingAutoPlay() {
    const timerId = (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer;
    if (timerId) {
      clearTimeout(timerId);
      (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer = undefined;
    }
  },

  playPracticeMaterial(material) {
    restartListeningAudio(material.audio, this.buildAudioHooks(material.id), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    this.setData({ playingMaterialId: material.id, pausedMaterialId: '' });
  },

  handlePlaybackEnded(materialId) {
    const material = this.data.currentMaterial?.id === materialId ? this.data.currentMaterial : null;
    const action = resolvePlaybackEndAction({
      settings: this.data.playbackSettings,
      hasNextPlayable: this.data.materials.length > 1
    });

    this.resetProgress();

    if (action === 'loop-current' && material) {
      this.playPracticeMaterial(material);
      return;
    }

    if (action === 'auto-next') {
      this.clearPendingAutoPlay();
      (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer = setTimeout(() => {
        (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer = undefined;
        const queue = advancePracticeQueue(this.data.queue, this.data.materials.map((item) => item.id));
        const nextMaterial = getCurrentPracticeMaterial(this.data.materials, queue);
        this.setData({ queue, showContent: false });
        this.refreshCurrentMaterial(queue);
        if (nextMaterial) {
          this.playPracticeMaterial(nextMaterial);
        }
      }, AUTO_PLAY_NEXT_DELAY_MS);
      wx.showToast({ title: '3 秒后播放下一条', icon: 'none' });
      return;
    }

    wx.showToast({ title: '播放结束', icon: 'none' });
  },

  updatePlaybackSettingsData(settings) {
    this.setData({
      playbackSettings: settings,
      playbackRateText: formatPlaybackRate(settings.playbackRate)
    });
  },

  refreshCurrentMaterial(queue, materials) {
    const sourceMaterials = materials ?? this.data.materials;
    const currentMaterial = getCurrentPracticeMaterial(sourceMaterials, queue);
    const currentRoundText = currentMaterial ? `${queue.currentIndex + 1} / ${queue.materialIds.length}` : '';
    this.setData({ currentMaterial, currentRoundText });
  },

  formatTime(seconds) {
    return formatPlaybackTime(seconds);
  },

  buildAudioHooks(materialId) {
    return {
      onError: (message: string) => wx.showToast({ title: message, icon: 'none' }),
      onEnded: () => this.handlePlaybackEnded(materialId),
      onPlay: () => this.setData({ playingMaterialId: materialId, pausedMaterialId: '' }),
      onPause: () => this.setData({ playingMaterialId: '', pausedMaterialId: materialId }),
      onTimeUpdate: (state: AudioProgressState) => this.updateProgress(state)
    };
  },

  resolveTitle(group, libraryName) {
    if (this.data.sourceType === 'group') {
      return group?.name ?? '练习组';
    }

    if (this.data.sourceType === 'library') {
      return libraryName || '分类随机';
    }

    return this.data.mode === 'local' ? '本地全部随机' : '云端全部随机';
  }
});

function formatPlaybackRate(rate: PlaybackRate): string {
  return `${rate}x`;
}
