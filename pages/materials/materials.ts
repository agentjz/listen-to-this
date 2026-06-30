import { deleteMaterialByMode, loadSnapshotByMode, moveMaterialByMode, reorderMaterialByMode } from '../../miniprogram/services/runtimeData';
import { AudioProgressState, restartListeningAudio, seekListeningAudio, stopListeningAudio, toggleListeningAudio, updateActivePlaybackRate } from '../../miniprogram/services/audioPlayer';
import { SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { PlaybackRate, PlaybackSettings } from '../../miniprogram/types/playback';
import { buildMaterialListView, formatPlaybackTime, getReorderDirection, MaterialListCard } from '../../miniprogram/lib/materialListView';
import { getDragTargetIndex, moveItemPreview } from '../../miniprogram/lib/dragOrder';
import { AUTO_PLAY_NEXT_DELAY_MS, resolvePlaybackEndAction } from '../../miniprogram/lib/playbackFlow';
import { getNextPlaybackRate, readPlaybackSettings, updatePlaybackSettings } from '../../miniprogram/services/playbackSettings';

interface MaterialListData {
  mode: DataMode;
  libraryId: string;
  libraryName: string;
  highlightMaterialId: string;
  isUnfiledLibrary: boolean;
  isPublicLibrary: boolean;
  isAllResources: boolean;
  primaryManageActionText: string;
  isManaging: boolean;
  isWritingOrder: boolean;
  draggingMaterialId: string;
  dragStartY: number;
  dragSourceIndex: number;
  dragTargetIndex: number;
  dragItemHeight: number;
  playingMaterialId: string;
  pausedMaterialId: string;
  progressMaterialId: string;
  currentTime: number;
  duration: number;
  progressPercent: number;
  currentTimeText: string;
  durationText: string;
  isSeeking: boolean;
  playbackSettings: PlaybackSettings;
  playbackRateText: string;
  libraries: SourceLibrary[];
  materials: MaterialListCard[];
}

interface MaterialTouchEvent {
  currentTarget: {
    dataset: {
      id: string;
      index: number;
    };
  };
  touches?: Array<{ pageY: number }>;
  changedTouches?: Array<{ pageY: number }>;
}

Page<MaterialListData, {
  load: () => Promise<void>;
  toggleManage: () => void;
  goPrimaryManageAction: () => void;
  openDetail: (event: { currentTarget: { dataset: { id: string } } }) => void;
  editMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  playMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  restartMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  cyclePlaybackRate: () => void;
  toggleSingleLoop: () => void;
  toggleAutoPlayNext: () => void;
  onProgressChanging: (event: { currentTarget: { dataset: { id: string } }; detail: { value: number } }) => void;
  onProgressChanged: (event: { currentTarget: { dataset: { id: string } }; detail: { value: number } }) => void;
  moveMaterial: (event: { currentTarget: { dataset: { id: string } } }) => Promise<void>;
  updateProgress: (materialId: string, state: AudioProgressState) => void;
  resetProgress: () => void;
  clearPendingAutoPlay: () => void;
  playMaterialById: (materialId: string) => void;
  findNextPlayableMaterial: (materialId: string) => MaterialListCard | null;
  handlePlaybackEnded: (materialId: string) => void;
  updatePlaybackSettingsData: (settings: PlaybackSettings) => void;
  formatTime: (seconds: number) => string;
  buildAudioHooks: (materialId: string) => {
    onError: (message: string) => void;
    onEnded: () => void;
    onPlay: () => void;
    onPause: () => void;
    onTimeUpdate: (state: AudioProgressState) => void;
  };
  onDragStart: (event: MaterialTouchEvent) => void;
  onDragMove: (event: MaterialTouchEvent) => void;
  onDragEnd: (event: MaterialTouchEvent) => Promise<void>;
  clearDragState: () => void;
  previewMaterialOrder: (targetIndex: number) => void;
  persistDraggedOrder: (materialId: string, sourceIndex: number, targetIndex: number) => Promise<void>;
  deleteMaterial: (event: { currentTarget: { dataset: { id: string } } }) => Promise<void>;
}>({
  data: {
    mode: 'local',
    libraryId: '',
    libraryName: '',
    highlightMaterialId: '',
    isUnfiledLibrary: false,
    isPublicLibrary: false,
    isAllResources: false,
    primaryManageActionText: '新建材料',
    isManaging: false,
    isWritingOrder: false,
    draggingMaterialId: '',
    dragStartY: 0,
    dragSourceIndex: -1,
    dragTargetIndex: -1,
    dragItemHeight: 160,
    playingMaterialId: '',
    pausedMaterialId: '',
    progressMaterialId: '',
    currentTime: 0,
    duration: 0,
    progressPercent: 0,
    currentTimeText: '00:00',
    durationText: '00:00',
    isSeeking: false,
    playbackSettings: readPlaybackSettings(),
    playbackRateText: '1x',
    libraries: [],
    materials: []
  },

  async onLoad(query) {
    this.setData({
      mode: parseDataMode(query?.mode),
      libraryId: query?.libraryId ?? '',
      highlightMaterialId: query?.highlightMaterialId ?? ''
    });
    await this.load();
  },

  async onShow() {
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
      const view = buildMaterialListView({
        libraryId: this.data.libraryId,
        highlightMaterialId: this.data.highlightMaterialId,
        libraries: snapshot.data.libraries,
        materials: snapshot.data.materials,
        listeningAudios: snapshot.data.listeningAudios
      });
      this.setData({
        libraryName: view.libraryName,
        isUnfiledLibrary: view.isUnfiledLibrary,
        isAllResources: view.isAllResources,
        isPublicLibrary: view.isPublicLibrary,
        primaryManageActionText: view.primaryManageActionText,
        libraries: snapshot.data.libraries.filter((library) => library.kind === 'user'),
        materials: view.materials
      });
      if (this.data.highlightMaterialId) {
        setTimeout(() => {
          this.setData({
            materials: this.data.materials.map((material) => ({
              ...material,
              isHighlighted: false
            })),
            highlightMaterialId: ''
          });
        }, 1600);
      }
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  toggleManage() {
    if (this.data.isPublicLibrary) {
      wx.showToast({ title: '公共资源无法管理', icon: 'none' });
      return;
    }

    this.setData({
      isManaging: !this.data.isManaging,
      draggingMaterialId: '',
      dragSourceIndex: -1,
      dragTargetIndex: -1
    });
  },

  goPrimaryManageAction() {
    if (this.data.isAllResources) {
      wx.showToast({ title: '请进入具体分类管理', icon: 'none' });
      return;
    }

    if (this.data.isUnfiledLibrary) {
      wx.navigateTo({ url: `/pages/import/import?mode=${this.data.mode}` });
      return;
    }

    wx.navigateTo({ url: `/pages/import-existing/import-existing?mode=${this.data.mode}&targetLibraryId=${this.data.libraryId}` });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/material-detail/material-detail?mode=${this.data.mode}&materialId=${event.currentTarget.dataset.id}&action=view` });
  },

  editMaterial(event) {
    wx.navigateTo({ url: `/pages/material-detail/material-detail?mode=${this.data.mode}&materialId=${event.currentTarget.dataset.id}&action=edit` });
  },

  playMaterial(event) {
    this.clearPendingAutoPlay();
    const materialId = event.currentTarget.dataset.id;
    this.playMaterialById(materialId);
  },

  playMaterialById(materialId) {
    const material = this.data.materials.find((item) => item.id === materialId);

    if (!material?.audio) {
      wx.showToast({ title: '当前材料没有音频，可查看原文', icon: 'none' });
      return;
    }

    const result = toggleListeningAudio(material.audio, this.buildAudioHooks(materialId), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    if (result.state === 'playing') {
      this.setData({ playingMaterialId: materialId, pausedMaterialId: '', progressMaterialId: materialId });
      return;
    }

    if (result.state === 'paused') {
      this.setData({ playingMaterialId: '', pausedMaterialId: materialId });
    }
  },

  restartMaterial(event) {
    this.clearPendingAutoPlay();
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);

    if (!material?.audio) {
      wx.showToast({ title: '当前材料没有音频，可查看原文', icon: 'none' });
      return;
    }

    restartListeningAudio(material.audio, this.buildAudioHooks(materialId), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    this.setData({ playingMaterialId: materialId, pausedMaterialId: '', progressMaterialId: materialId });
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

  onProgressChanging(event) {
    const percent = Math.max(0, Math.min(100, event.detail.value));
    const duration = this.data.duration;
    const currentTime = duration > 0 ? (duration * percent) / 100 : 0;
    this.setData({
      isSeeking: true,
      progressMaterialId: event.currentTarget.dataset.id,
      progressPercent: percent,
      currentTime,
      currentTimeText: this.formatTime(currentTime)
    });
  },

  onProgressChanged(event) {
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);
    if (!material?.audio) {
      this.setData({ isSeeking: false });
      return;
    }

    const percent = Math.max(0, Math.min(100, event.detail.value));
    const duration = this.data.duration;
    const targetSeconds = duration > 0 ? (duration * percent) / 100 : 0;
    this.clearPendingAutoPlay();
    seekListeningAudio(material.audio, targetSeconds, this.buildAudioHooks(materialId), {
      playbackRate: this.data.playbackSettings.playbackRate
    });
    this.setData({
      isSeeking: false,
      playingMaterialId: materialId,
      pausedMaterialId: '',
      progressMaterialId: materialId
    });
  },

  updateProgress(materialId, state) {
    if (this.data.isSeeking) {
      return;
    }

    this.setData({
      progressMaterialId: materialId,
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
      progressMaterialId: '',
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

  findNextPlayableMaterial(materialId) {
    const currentIndex = this.data.materials.findIndex((material) => material.id === materialId);
    if (currentIndex < 0) {
      return null;
    }

    return this.data.materials.slice(currentIndex + 1).find((material) => !!material.audio) ?? null;
  },

  handlePlaybackEnded(materialId) {
    const current = this.data.materials.find((material) => material.id === materialId);
    const next = this.findNextPlayableMaterial(materialId);
    const action = resolvePlaybackEndAction({
      settings: this.data.playbackSettings,
      hasNextPlayable: !!next
    });

    this.resetProgress();

    if (action === 'loop-current' && current?.audio) {
      restartListeningAudio(current.audio, this.buildAudioHooks(materialId), {
        playbackRate: this.data.playbackSettings.playbackRate
      });
      this.setData({ playingMaterialId: materialId, pausedMaterialId: '', progressMaterialId: materialId });
      return;
    }

    if (action === 'auto-next' && next) {
      this.clearPendingAutoPlay();
      (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer = setTimeout(() => {
        (this as unknown as { pendingAutoPlayTimer?: ReturnType<typeof setTimeout> }).pendingAutoPlayTimer = undefined;
        this.playMaterialById(next.id);
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

  formatTime(seconds) {
    return formatPlaybackTime(seconds);
  },

  buildAudioHooks(materialId) {
    return {
      onError: (message: string) => wx.showToast({ title: message, icon: 'none' }),
      onEnded: () => this.handlePlaybackEnded(materialId),
      onPlay: () => this.setData({ playingMaterialId: materialId, pausedMaterialId: '' }),
      onPause: () => this.setData({ playingMaterialId: '', pausedMaterialId: materialId }),
      onTimeUpdate: (state: AudioProgressState) => this.updateProgress(materialId, state)
    };
  },

  async moveMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);
    if (material?.isPublicMaterial) {
      wx.showToast({ title: '公共资源无法移动', icon: 'none' });
      return;
    }

    const targetLibraries = this.data.libraries.filter((library) => library.id !== material?.libraryId);
    if (targetLibraries.length === 0) {
      wx.showToast({ title: '没有其他分类', icon: 'none' });
      return;
    }

    const selected = await wx.showActionSheet({
      itemList: targetLibraries.map((library) => library.name)
    });
    const target = targetLibraries[selected.tapIndex];
    if (!target) {
      return;
    }

    try {
      await moveMaterialByMode(this.data.mode, materialId, target.id);
      wx.showToast({ title: '已移动', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '移动失败', icon: 'none' });
    }
  },

  onDragStart(event) {
    if (!this.data.isManaging || this.data.isWritingOrder || this.data.isPublicLibrary || this.data.isAllResources) {
      return;
    }

    const materialId = event.currentTarget.dataset.id;
    const sourceIndex = Number(event.currentTarget.dataset.index);
    const startY = event.touches?.[0]?.pageY ?? event.changedTouches?.[0]?.pageY ?? 0;

    if (!materialId || sourceIndex < 0) {
      return;
    }

    this.setData({
      draggingMaterialId: materialId,
      dragStartY: startY,
      dragSourceIndex: sourceIndex,
      dragTargetIndex: sourceIndex,
      materials: this.data.materials.map((material) => ({
        ...material,
        isDragging: material.id === materialId
      }))
    });
  },

  onDragMove(event) {
    if (!this.data.draggingMaterialId || this.data.dragSourceIndex < 0) {
      return;
    }

    const currentY = event.touches?.[0]?.pageY ?? event.changedTouches?.[0]?.pageY ?? this.data.dragStartY;
    const targetIndex = getDragTargetIndex({
      startY: this.data.dragStartY,
      currentY,
      itemHeight: this.data.dragItemHeight,
      sourceIndex: this.data.dragSourceIndex,
      itemCount: this.data.materials.length
    });

    if (targetIndex !== this.data.dragTargetIndex) {
      this.previewMaterialOrder(targetIndex);
    }
  },

  async onDragEnd() {
    const materialId = this.data.draggingMaterialId;
    const sourceIndex = this.data.dragSourceIndex;
    const targetIndex = this.data.dragTargetIndex;

    if (!materialId || sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      this.clearDragState();
      return;
    }

    try {
      this.setData({ isWritingOrder: true });
      await this.persistDraggedOrder(materialId, sourceIndex, targetIndex);
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '排序失败', icon: 'none' });
      await this.load();
    } finally {
      this.setData({ isWritingOrder: false });
      this.clearDragState();
    }
  },

  clearDragState() {
    this.setData({
      draggingMaterialId: '',
      dragStartY: 0,
      dragSourceIndex: -1,
      dragTargetIndex: -1,
      materials: this.data.materials.map((material) => ({
        ...material,
        isDragging: false
      }))
    });
  },

  previewMaterialOrder(targetIndex) {
    const draggingIndex = this.data.materials.findIndex((material) => material.id === this.data.draggingMaterialId);
    if (draggingIndex < 0 || targetIndex < 0 || targetIndex >= this.data.materials.length) {
      return;
    }

    const materials = moveItemPreview(this.data.materials, draggingIndex, targetIndex);
    this.setData({
      dragTargetIndex: targetIndex,
      materials: materials.map((material) => ({
        ...material,
        isDragging: material.id === this.data.draggingMaterialId
      }))
    });
  },

  async persistDraggedOrder(materialId, sourceIndex, targetIndex) {
    const direction = getReorderDirection(sourceIndex, targetIndex);
    const steps = Math.abs(targetIndex - sourceIndex);

    for (let index = 0; index < steps; index += 1) {
      await reorderMaterialByMode(this.data.mode, materialId, direction);
    }
  },

  async deleteMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);
    if (material?.isPublicMaterial) {
      wx.showToast({ title: '公共资源无法删除', icon: 'none' });
      return;
    }

    const confirmed = await wx.showModal({
      title: '删除材料',
      content: '删除后会同时移除本材料的音频记录。',
      showCancel: true
    });

    if (!confirmed.confirm) {
      return;
    }

    try {
      await deleteMaterialByMode(this.data.mode, materialId);
      wx.showToast({ title: '已删除', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' });
    }
  }
});

function formatPlaybackRate(rate: PlaybackRate): string {
  return `${rate}x`;
}
