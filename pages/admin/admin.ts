import { loadAppSnapshot } from '../../miniprogram/services/sync';

interface AdminData {
  isAdmin: boolean;
  openid: string;
}

Page<AdminData, {
  load: () => Promise<void>;
}>({
  data: {
    isAdmin: false,
    openid: ''
  },

  async onShow() {
    await this.load();
  },

  async load() {
    try {
      const snapshot = await loadAppSnapshot();
      this.setData?.({
        isAdmin: snapshot.session.isAdmin,
        openid: snapshot.session.openid
      });
    } catch (error) {
      wx.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' });
    }
  }
});
