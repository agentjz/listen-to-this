import { deleteLibraryByMode, loadSnapshotByMode, renameLibraryByMode, saveLibraryByMode } from '../../miniprogram/services/runtimeData';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { ALL_RESOURCES_VIEW_ID, ALL_RESOURCES_VIEW_NAME, UNFILED_LIBRARY_ID, sortLibrariesWithUnfiledLast } from '../../miniprogram/lib/libraries';

interface ResourceItem {
  id: string;
  name: string;
  kind: SourceLibrary['kind'] | 'virtual';
  materialCount: number;
  canDelete: boolean;
  canRename: boolean;
}

interface SearchResult {
  id: string;
  libraryId: string;
  title: string;
  libraryName: string;
  hasAudio: boolean;
}

interface ResourcesData {
  mode: DataMode;
  isManaging: boolean;
  newLibraryName: string;
  editingLibraryId: string;
  editingLibraryName: string;
  searchKeyword: string;
  isSaving: boolean;
  isRenaming: boolean;
  resources: ResourceItem[];
  searchResults: SearchResult[];
  snapshotMaterials: Material[];
  snapshotLibraries: SourceLibrary[];
}

Page<ResourcesData, {
  load: () => Promise<void>;
  toggleManage: () => void;
  onLibraryNameInput: (event: { detail: { value: string } }) => void;
  onRenameInput: (event: { detail: { value: string } }) => void;
  onSearchInput: (event: { detail: { value: string } }) => void;
  submitSearch: () => void;
  updateSearchResults: () => void;
  saveLibrary: () => Promise<void>;
  startRename: (event: { currentTarget: { dataset: { id: string; name: string } } }) => void;
  cancelRename: () => void;
  saveRename: () => Promise<void>;
  deleteLibrary: (event: { currentTarget: { dataset: { id: string; name: string } } }) => Promise<void>;
  openMaterials: (event: { currentTarget: { dataset: { id: string } } }) => void;
  openSearchResult: (event: { currentTarget: { dataset: { id: string; libraryId: string } } }) => void;
  getMaterialLibraryName: (libraries: SourceLibrary[], libraryId: string) => string;
  buildSearchResults: (materials: Material[], libraries: SourceLibrary[], keyword: string) => SearchResult[];
}>({
  data: {
    mode: 'local',
    isManaging: false,
    newLibraryName: '',
    editingLibraryId: '',
    editingLibraryName: '',
    searchKeyword: '',
    isSaving: false,
    isRenaming: false,
    resources: [],
    searchResults: [],
    snapshotMaterials: [],
    snapshotLibraries: []
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
      const snapshotMaterials = snapshot.data.materials.filter((material) => material.status !== 'archived');
      const snapshotLibraries = snapshot.data.libraries;
      const allResources: ResourceItem = {
        id: ALL_RESOURCES_VIEW_ID,
        name: ALL_RESOURCES_VIEW_NAME,
        kind: 'virtual',
        materialCount: snapshotMaterials.length,
        canDelete: false,
        canRename: false
      };
      const resources = [
        allResources,
        ...sortLibrariesWithUnfiledLast(snapshot.data.libraries)
        .map((library) => ({
          ...library,
          materialCount: snapshotMaterials.filter((material: Material) => material.libraryId === library.id).length,
          canDelete: library.kind === 'user' && library.id !== UNFILED_LIBRARY_ID,
          canRename: library.kind === 'user' && library.id !== UNFILED_LIBRARY_ID
        }))
      ];
      this.setData?.({
        snapshotMaterials,
        snapshotLibraries,
        resources,
        searchResults: this.buildSearchResults(snapshotMaterials, snapshotLibraries, this.data.searchKeyword)
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  toggleManage() {
    this.setData?.({
      isManaging: !this.data.isManaging,
      editingLibraryId: '',
      editingLibraryName: ''
    });
  },

  onLibraryNameInput(event) {
    this.setData?.({ newLibraryName: event.detail.value });
  },

  onRenameInput(event) {
    this.setData?.({ editingLibraryName: event.detail.value });
  },

  onSearchInput(event) {
    const searchKeyword = event.detail.value;
    this.setData?.({
      searchKeyword,
      searchResults: this.buildSearchResults(this.data.snapshotMaterials, this.data.snapshotLibraries, searchKeyword)
    });
  },

  updateSearchResults() {
    this.setData?.({
      searchResults: this.buildSearchResults(this.data.snapshotMaterials, this.data.snapshotLibraries, this.data.searchKeyword)
    });
  },

  submitSearch() {
    const results = this.buildSearchResults(this.data.snapshotMaterials, this.data.snapshotLibraries, this.data.searchKeyword);
    if (results.length === 0) {
      wx.showToast({ title: this.data.searchKeyword.trim() ? '没有找到材料' : '请输入搜索内容', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${results[0].libraryId}&highlightMaterialId=${results[0].id}`
    });
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

  startRename(event) {
    this.setData?.({
      editingLibraryId: event.currentTarget.dataset.id,
      editingLibraryName: event.currentTarget.dataset.name
    });
  },

  cancelRename() {
    this.setData?.({
      editingLibraryId: '',
      editingLibraryName: ''
    });
  },

  async saveRename() {
    if (this.data.isRenaming) {
      return;
    }

    try {
      this.setData?.({ isRenaming: true });
      await renameLibraryByMode(this.data.mode, this.data.editingLibraryId, this.data.editingLibraryName);
      wx.showToast({ title: '已重命名', icon: 'success' });
      this.cancelRename();
      await this.load();
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '重命名失败', icon: 'none' });
    } finally {
      this.setData?.({ isRenaming: false });
    }
  },

  async deleteLibrary(event) {
    const libraryId = event.currentTarget.dataset.id;
    const libraryName = event.currentTarget.dataset.name;
    const confirmed = await wx.showModal({
      title: '删除分类',
      content: `确认删除“${libraryName}”？分类内材料会移入未归类材料。`,
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
  },

  openSearchResult(event) {
    wx.navigateTo({
      url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${event.currentTarget.dataset.libraryId}&highlightMaterialId=${event.currentTarget.dataset.id}`
    });
  },

  getMaterialLibraryName(libraries, libraryId) {
    return libraries.find((library) => library.id === libraryId)?.name ?? '材料';
  },

  buildSearchResults(materials, libraries, keyword) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return [];
    }

    return materials
      .filter((material) => `${material.title}\n${material.content}`.toLowerCase().includes(normalizedKeyword))
      .slice(0, 20)
      .map((material) => ({
        id: material.id,
        libraryId: material.libraryId,
        title: material.title,
        libraryName: this.getMaterialLibraryName(libraries, material.libraryId),
        hasAudio: material.audioCount > 0
      }));
  }
});
