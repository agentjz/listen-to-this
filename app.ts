App({
  globalData: {
    openid: ''
  },
  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: true
      });
    }
  }
});
