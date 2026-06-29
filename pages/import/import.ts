import { loadSnapshotByMode, saveDraftMaterialByMode, syncCloudData } from '../../miniprogram/services/runtimeData';
import { chooseAndReplaceMaterialAudio } from '../../miniprogram/services/upload';
import { SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface ImportData {
  mode: DataMode;
  openid: string;
  title: string;
  content: string;
  audioFileName: string;
  pendingAudioPath: string;
  libraryId: string;
  libraries: SourceLibrary[];
  isSaving: boolean;
}

Page<ImportData, {
  load: () => Promise<void>;
  onTitleInput: (event: { detail: { value: string } }) => void;
  onContentInput: (event: { detail: { value: string } }) => void;
  chooseAudio: () => Promise<void>;
  clearAudio: () => void;
  chooseLibrary: (event: { currentTarget: { dataset: { id: string } } }) => void;
  saveMaterial: () => Promise<void>;
}>({
  data: {
    mode: 'local',
    openid: '',
    title: '',
    content: '',
    audioFileName: '',
    pendingAudioPath: '',
    libraryId: '',
    libraries: [],
    isSaving: false
  },

  async onLoad(query) {
    this.setData?.({ mode: parseDataMode(query?.mode) });
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const libraries = snapshot.data.libraries
        .filter((library) => library.kind === 'user')
        .sort((left, right) => left.sortOrder - right.sortOrder);
      this.setData?.({
        openid: snapshot.session.openid,
        libraries,
        libraryId: libraries[0]?.id ?? ''
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  onTitleInput(event) {
    this.setData?.({ title: event.detail.value });
  },

  onContentInput(event) {
    this.setData?.({ content: event.detail.value });
  },

  async chooseAudio() {
    try {
      const chosen = await wx.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['mp3', 'm4a', 'wav']
      });
      const file = chosen.tempFiles[0];
      if (!file) {
        throw new Error('没有选择音频文件');
      }

      this.setData?.({
        audioFileName: file.name || file.path.split('/').pop() || 'audio',
        pendingAudioPath: file.path
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '选择失败', icon: 'none' });
    }
  },

  clearAudio() {
    this.setData?.({
      audioFileName: '',
      pendingAudioPath: ''
    });
  },

  chooseLibrary(event) {
    this.setData?.({ libraryId: event.currentTarget.dataset.id });
  },

  async saveMaterial() {
    try {
      this.setData?.({ isSaving: true });
      const saved = await saveDraftMaterialByMode(this.data.mode, {
        libraryId: this.data.libraryId,
        title: this.data.title,
        content: this.data.content
      });
      if (this.data.pendingAudioPath) {
        await chooseAndReplaceMaterialAudio({
          mode: this.data.mode,
          openid: this.data.openid,
          materialId: saved.material.id,
          filePath: this.data.pendingAudioPath,
          fileName: this.data.audioFileName
        });
      }
      if (this.data.mode === 'cloud') {
        await syncCloudData();
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      wx.navigateTo({ url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${this.data.libraryId}` });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '保存失败', icon: 'none' });
    } finally {
      this.setData?.({ isSaving: false });
    }
  }
});
