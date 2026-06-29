declare const wx: WechatMiniprogram.Wx;
declare function App(options: WechatMiniprogram.AppOptions): void;
declare function Page<TData extends object, TCustom extends object>(
  options: WechatMiniprogram.PageOptions<TData, TCustom> & TCustom & ThisType<WechatMiniprogram.PageInstance<TData, TCustom>>
): void;
declare function getApp<T extends Record<string, unknown> = Record<string, unknown>>(): T;

declare namespace WechatMiniprogram {
  type AnyObject = Record<string, unknown>;

  interface AppOptions {
    globalData?: Record<string, unknown>;
    onLaunch?: () => void;
  }

  interface PageOptions<TData extends object, TCustom extends object> {
    data?: TData;
    onLoad?: (query?: Record<string, string | undefined>) => void | Promise<void>;
    onShow?: () => void | Promise<void>;
    onUnload?: () => void;
  }

  type PageInstance<TData extends object, TCustom extends object> = PageOptions<TData, TCustom> &
    TCustom & {
      data: TData;
      setData(data: Partial<TData>): void;
    };

  interface Cloud {
    init(options?: { env?: string; traceUser?: boolean }): void;
    callFunction<T = unknown>(options: { name: string; data?: object }): Promise<{ result: T }>;
    uploadFile(options: { cloudPath: string; filePath: string }): Promise<{ fileID: string }>;
  }

  interface InnerAudioContext {
    src: string;
    playbackRate: number;
    currentTime: number;
    duration: number;
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;
    onPlay(callback: () => void): void;
    onEnded(callback: () => void): void;
    onError(callback: (error: { errMsg: string }) => void): void;
  }

  interface Wx {
    cloud?: Cloud;
    createInnerAudioContext(): InnerAudioContext;
    navigateTo(options: { url: string }): void;
    redirectTo(options: { url: string }): void;
    showToast(options: { title: string; icon?: 'success' | 'error' | 'loading' | 'none'; duration?: number }): void;
    showModal(options: { title: string; content: string; showCancel?: boolean }): Promise<{ confirm: boolean; cancel: boolean }>;
    showActionSheet(options: { itemList: string[] }): Promise<{ tapIndex: number }>;
    chooseMessageFile(options: { count: number; type: 'file'; extension?: string[] }): Promise<{ tempFiles: Array<{ path: string; name: string; size: number }> }>;
    chooseMedia(options: { count: number; mediaType: Array<'image' | 'video'>; sourceType?: Array<'album' | 'camera'> }): Promise<{ tempFiles: Array<{ tempFilePath: string; size: number }> }>;
    getFileSystemManager(): FileSystemManager;
    getStorageSync<T = unknown>(key: string): T;
    setStorageSync<T = unknown>(key: string, data: T): void;
    removeStorageSync(key: string): void;
  }

  interface FileSystemManager {
    saveFile(options: { tempFilePath: string }): Promise<{ savedFilePath: string }>;
  }
}
