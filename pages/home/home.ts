import { loadSnapshotByMode } from '../../miniprogram/services/runtimeData';

interface HomeData {
  isLoading: boolean;
  localLibraryCount: number;
  localMaterialCount: number;
  cloudLibraryCount: number;
  cloudMaterialCount: number;
  cloudAvailable: boolean;
}

Page<HomeData, {
  load: () => Promise<void>;
  goLocalResources: () => void;
  goCloudResources: () => void;
  goLocalImport: () => void;
  goCloudImport: () => void;
}>({
  data: {
    isLoading: true,
    localLibraryCount: 0,
    localMaterialCount: 0,
    cloudLibraryCount: 0,
    cloudMaterialCount: 0,
    cloudAvailable: false
  },

  async onShow() {
    await this.load();
  },

  async load() {
    const localSnapshot = await loadSnapshotByMode('local');
    this.setData({
      isLoading: false,
      localLibraryCount: localSnapshot.data.libraries.length,
      localMaterialCount: localSnapshot.data.materials.length
    });

    try {
      const snapshot = await loadSnapshotByMode('cloud');
      this.setData({
        isLoading: false,
        cloudAvailable: true,
        cloudLibraryCount: snapshot.data.libraries.length,
        cloudMaterialCount: snapshot.data.materials.length
      });
    } catch (error) {
      this.setData({ cloudAvailable: false });
    }
  },

  goLocalResources() {
    wx.navigateTo({ url: '/pages/resources/resources?mode=local' });
  },

  goCloudResources() {
    wx.navigateTo({ url: '/pages/resources/resources?mode=cloud' });
  },

  goLocalImport() {
    wx.navigateTo({ url: '/pages/import/import?mode=local' });
  },

  goCloudImport() {
    wx.navigateTo({ url: '/pages/import/import?mode=cloud' });
  }
});
