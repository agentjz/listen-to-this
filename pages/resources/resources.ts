import { deleteLibraryByMode, loadSnapshotByMode, saveLibraryByMode } from '../../miniprogram/services/runtimeData';
import { SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';

interface ResourceItem extends SourceLibrary {
  materialCount: number;
}

interface ResourcesData {
  mode: DataMode;
  isManaging: boolean;
  newLibraryName: string;
  isSaving: boolean;
  resources: ResourceItem[];
}

Page<ResourcesData, {
  load: () => Promise<void>;
  toggleManage: () => void;
  onLibraryNameInput: (event: { detail: { value: string } }) => void;
  saveLibrary: () => Promise<void>;
  deleteLibrary: (event: { currentTarget: { dataset: { id: string; name: string } } }) => Promise<void>;
  openMaterials: (event: { currentTarget: { dataset: { id: string } } }) => void;
}>({
  data: {
    mode: 'local',
    isManaging: false,
    newLibraryName: '',
    isSaving: false,
    resources: []
  },

  async onLoad(query) {
    this.setData?.({ mode: parseDataMode(query?.mode) });
    await this.load();
  },

  async onShow() {
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const resources = [...snapshot.data.libraries]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((library) => ({
          ...library,
          materialCount: snapshot.data.materials.filter((material) => material.libraryId === library.id).length
        }));
      this.setData?.({ resources });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  toggleManage() {
    this.setData?.({ isManaging: !this.data.isManaging });
  },

  onLibraryNameInput(event) {
    this.setData?.({ newLibraryName: event.detail.value });
  },

  async saveLibrary() {
    try {
      this.setData?.({ isSaving: true });
      await saveLibraryByMode(this.data.mode, this.data.newLibraryName);
      wx.showToast({ title: '已新增', icon: 'success' });
      this.setData?.({ newLibraryName: '' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '新增失败', icon: 'none' });
    } finally {
      this.setData?.({ isSaving: false });
    }
  },

  async deleteLibrary(event) {
    const libraryId = event.currentTarget.dataset.id;
    const libraryName = event.currentTarget.dataset.name;
    const confirmed = await wx.showModal({
      title: '删除分类',
      content: `确认删除“${libraryName}”？分类内有材料时不会删除。`,
      showCancel: true
    });

    if (!confirmed.confirm) {
      return;
    }

    try {
      await deleteLibraryByMode(this.data.mode, libraryId);
      wx.showToast({ title: '已删除', icon: 'success' });
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '删除失败', icon: 'none' });
    }
  },

  openMaterials(event) {
    wx.navigateTo({ url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${event.currentTarget.dataset.id}` });
  }
});
