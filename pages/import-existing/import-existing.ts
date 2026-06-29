import { UNFILED_LIBRARY_ID } from '../../miniprogram/lib/libraries';
import { loadSnapshotByMode, moveMaterialByMode, syncCloudData } from '../../miniprogram/services/runtimeData';
import { Material, SourceLibrary } from '../../miniprogram/types/domain';
import { DataMode, parseDataMode } from '../../miniprogram/types/runtime';
import { selectAll, toggleSelection } from '../../miniprogram/lib/selection';

interface CandidateMaterial extends Material {
  isSelected: boolean;
}

interface ImportExistingData {
  mode: DataMode;
  targetLibraryId: string;
  targetLibraryName: string;
  candidates: CandidateMaterial[];
  selectedMaterialIds: string[];
  selectedCount: number;
  isLoading: boolean;
  isBatchMoving: boolean;
}

Page<ImportExistingData, {
  load: () => Promise<void>;
  toggleCandidateSelection: (event: { currentTarget: { dataset: { id: string } } }) => void;
  selectAllCandidates: () => void;
  clearSelection: () => void;
  importSelectedMaterials: () => Promise<void>;
  refreshSelection: (selectedMaterialIds: string[]) => void;
  sortMaterials: (materials: Material[]) => Material[];
  resolveTargetLibrary: (libraries: SourceLibrary[]) => SourceLibrary;
}>({
  data: {
    mode: 'local',
    targetLibraryId: '',
    targetLibraryName: '',
    candidates: [],
    selectedMaterialIds: [],
    selectedCount: 0,
    isLoading: true,
    isBatchMoving: false
  },

  async onLoad(query) {
    this.setData({
      mode: parseDataMode(query?.mode),
      targetLibraryId: query?.targetLibraryId ?? ''
    });
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadSnapshotByMode(this.data.mode);
      const targetLibrary = this.resolveTargetLibrary(snapshot.data.libraries);
      const candidates = this.sortMaterials(
        snapshot.data.materials.filter((material) => material.libraryId === UNFILED_LIBRARY_ID && material.status !== 'archived')
      ).map((material) => ({
        ...material,
        isSelected: this.data.selectedMaterialIds.includes(material.id)
      }));
      const candidateIds = new Set(candidates.map((material) => material.id));
      const selectedMaterialIds = this.data.selectedMaterialIds.filter((id) => candidateIds.has(id));

      this.setData({
        targetLibraryName: targetLibrary.name,
        candidates: candidates.map((material) => ({
          ...material,
          isSelected: selectedMaterialIds.includes(material.id)
        })),
        selectedMaterialIds,
        selectedCount: selectedMaterialIds.length,
        isLoading: false
      });
    } catch (error) {
      this.setData({ isLoading: false });
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  },

  resolveTargetLibrary(libraries) {
    const targetLibrary = libraries.find((library) => library.id === this.data.targetLibraryId);
    if (!targetLibrary) {
      throw new Error('目标分类不存在');
    }

    if (targetLibrary.id === UNFILED_LIBRARY_ID) {
      throw new Error('未归类材料不需要导入');
    }

    if (targetLibrary.kind !== 'user') {
      throw new Error('公共资源不能导入材料');
    }

    return targetLibrary;
  },

  sortMaterials(materials) {
    return [...materials].sort((left, right) => {
      if (left.sortOrder !== right.sortOrder) {
        return left.sortOrder - right.sortOrder;
      }

      return left.createdAt - right.createdAt;
    });
  },

  toggleCandidateSelection(event) {
    if (this.data.isBatchMoving) {
      return;
    }

    this.refreshSelection(toggleSelection(this.data.selectedMaterialIds, event.currentTarget.dataset.id));
  },

  selectAllCandidates() {
    if (this.data.isBatchMoving) {
      return;
    }

    this.refreshSelection(selectAll(this.data.candidates.map((material) => material.id)));
  },

  clearSelection() {
    if (this.data.isBatchMoving) {
      return;
    }

    this.refreshSelection([]);
  },

  refreshSelection(selectedMaterialIds) {
    this.setData({
      selectedMaterialIds,
      selectedCount: selectedMaterialIds.length,
      candidates: this.data.candidates.map((material) => ({
        ...material,
        isSelected: selectedMaterialIds.includes(material.id)
      }))
    });
  },

  async importSelectedMaterials() {
    if (this.data.isBatchMoving) {
      return;
    }

    if (this.data.selectedMaterialIds.length === 0) {
      wx.showToast({ title: '请选择材料', icon: 'none' });
      return;
    }

    try {
      this.setData({
        isBatchMoving: true,
        candidates: this.data.candidates.map((material) => ({
          ...material,
          isSelected: this.data.selectedMaterialIds.includes(material.id)
        }))
      });

      for (const materialId of this.data.selectedMaterialIds) {
        await moveMaterialByMode(this.data.mode, materialId, this.data.targetLibraryId);
      }

      if (this.data.mode === 'cloud') {
        await syncCloudData();
      }

      wx.showToast({ title: '已导入', icon: 'success' });
      wx.redirectTo({ url: `/pages/materials/materials?mode=${this.data.mode}&libraryId=${this.data.targetLibraryId}` });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '批量导入失败', icon: 'none' });
      this.setData({ isBatchMoving: false });
      await this.load();
    }
  }
});
