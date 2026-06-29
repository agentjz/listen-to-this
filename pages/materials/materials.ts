import { deleteMaterialByMode, loadSnapshotByMode, moveMaterialByMode, reorderMaterialByMode } from '../../miniprogram/services/runtimeData';
import { restartListeningAudio, toggleListeningAudio } from '../../miniprogram/services/audioPlayer';
import { ListeningAudio, Material, SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface MaterialCard extends Material {
  hasAudio: boolean;
  audio: ListeningAudio | null;
  isDragging?: boolean;
}

interface MaterialListData {
  mode: DataMode;
  libraryId: string;
  isManaging: boolean;
  isWritingOrder: boolean;
  draggingMaterialId: string;
  dragStartY: number;
  dragSourceIndex: number;
  dragTargetIndex: number;
  dragItemHeight: number;
  playingMaterialId: string;
  pausedMaterialId: string;
  debugLines: string[];
  libraries: SourceLibrary[];
  materials: MaterialCard[];
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
  goImport: () => void;
  openDetail: (event: { currentTarget: { dataset: { id: string } } }) => void;
  playMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  restartMaterial: (event: { currentTarget: { dataset: { id: string } } }) => void;
  moveMaterial: (event: { currentTarget: { dataset: { id: string } } }) => Promise<void>;
  appendDebug: (message: string) => void;
  buildAudioHooks: (materialId: string) => {
    onDebug: (message: string) => void;
    onError: (message: string) => void;
    onEnded: () => void;
    onPlay: () => void;
    onPause: () => void;
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
    isManaging: false,
    isWritingOrder: false,
    draggingMaterialId: '',
    dragStartY: 0,
    dragSourceIndex: -1,
    dragTargetIndex: -1,
    dragItemHeight: 160,
    playingMaterialId: '',
    pausedMaterialId: '',
    debugLines: [],
    libraries: [],
    materials: []
  },

  async onLoad(query) {
    this.setData({ mode: parseDataMode(query?.mode), libraryId: query?.libraryId ?? '' });
    await this.load();
  },

  async onShow() {
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const audiosByMaterial = new Map<string, ListeningAudio>();
      for (const audio of snapshot.data.listeningAudios) {
        if (!audiosByMaterial.has(audio.materialId)) {
          audiosByMaterial.set(audio.materialId, audio);
        }
      }
      const materials = snapshot.data.materials
        .filter((material) => material.libraryId === this.data.libraryId && material.status !== 'archived')
        .sort((left, right) => {
          if (left.sortOrder !== right.sortOrder) {
            return left.sortOrder - right.sortOrder;
          }

          return left.createdAt - right.createdAt;
        })
        .map((material) => ({
          ...material,
          hasAudio: audiosByMaterial.has(material.id),
          audio: audiosByMaterial.get(material.id) ?? null
        }));
      this.setData({
        libraries: snapshot.data.libraries.filter((library) => library.kind === 'user'),
        materials
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  toggleManage() {
    this.setData({
      isManaging: !this.data.isManaging,
      draggingMaterialId: '',
      dragSourceIndex: -1,
      dragTargetIndex: -1
    });
  },

  goImport() {
    wx.navigateTo({ url: `/pages/import/import?mode=${this.data.mode}` });
  },

  openDetail(event) {
    wx.navigateTo({ url: `/pages/material-detail/material-detail?mode=${this.data.mode}&materialId=${event.currentTarget.dataset.id}` });
  },

  playMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);
    this.appendDebug(`play.request materialId=${materialId}`);

    if (!material?.audio) {
      this.appendDebug('play.skip reason=audio_not_found');
      wx.showToast({ title: '当前材料没有音频，可查看原文', icon: 'none' });
      return;
    }

    const result = toggleListeningAudio(material.audio, this.buildAudioHooks(materialId));
    if (result.state === 'playing') {
      this.setData({ playingMaterialId: materialId, pausedMaterialId: '' });
      this.appendDebug(`play.started src=${result.src}`);
      return;
    }

    if (result.state === 'paused') {
      this.setData({ playingMaterialId: '', pausedMaterialId: materialId });
      this.appendDebug(`play.paused src=${result.src}`);
    }
  },

  restartMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    const material = this.data.materials.find((item) => item.id === materialId);
    this.appendDebug(`restart.request materialId=${materialId}`);

    if (!material?.audio) {
      this.appendDebug('restart.skip reason=audio_not_found');
      wx.showToast({ title: '当前材料没有音频，可查看原文', icon: 'none' });
      return;
    }

    const result = restartListeningAudio(material.audio, this.buildAudioHooks(materialId));
    this.setData({ playingMaterialId: materialId, pausedMaterialId: '' });
    this.appendDebug(`restart.started src=${result.src}`);
  },

  appendDebug(message) {
    const time = new Date().toLocaleTimeString();
    this.setData({
      debugLines: [`${time} ${message}`, ...this.data.debugLines].slice(0, 8)
    });
  },

  buildAudioHooks(materialId) {
    return {
      onDebug: (message: string) => this.appendDebug(message),
      onError: (message: string) => wx.showToast({ title: message, icon: 'none' }),
      onEnded: () => {
        this.setData({ playingMaterialId: '', pausedMaterialId: '' });
        wx.showToast({ title: '播放结束', icon: 'none' });
      },
      onPlay: () => this.setData({ playingMaterialId: materialId, pausedMaterialId: '' }),
      onPause: () => this.setData({ playingMaterialId: '', pausedMaterialId: materialId })
    };
  },

  async moveMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
    const targetLibraries = this.data.libraries.filter((library) => library.id !== this.data.libraryId);
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
    if (!this.data.isManaging || this.data.isWritingOrder) {
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
    const offset = currentY - this.data.dragStartY;
    const movedSlots = Math.round(offset / this.data.dragItemHeight);
    const targetIndex = Math.max(0, Math.min(this.data.materials.length - 1, this.data.dragSourceIndex + movedSlots));

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

    const materials = [...this.data.materials];
    const [dragging] = materials.splice(draggingIndex, 1);
    materials.splice(targetIndex, 0, dragging);
    this.setData({
      dragTargetIndex: targetIndex,
      materials: materials.map((material) => ({
        ...material,
        isDragging: material.id === this.data.draggingMaterialId
      }))
    });
  },

  async persistDraggedOrder(materialId, sourceIndex, targetIndex) {
    const direction = targetIndex < sourceIndex ? 'up' : 'down';
    const steps = Math.abs(targetIndex - sourceIndex);

    for (let index = 0; index < steps; index += 1) {
      await reorderMaterialByMode(this.data.mode, materialId, direction);
    }
  },

  async deleteMaterial(event) {
    const materialId = event.currentTarget.dataset.id;
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
