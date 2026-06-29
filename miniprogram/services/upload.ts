import { createAudioCloudPath, detectAudioFormat } from '../lib/audio';
import { ReplaceListeningAudioResponse } from '../types/api';
import { DataMode } from '../types/runtime';
import { replaceListeningAudioByMode } from './runtimeData';

export interface UploadMaterialAudioInput {
  mode: DataMode;
  openid: string;
  materialId: string;
  filePath?: string;
  fileName?: string;
}

export async function chooseAndReplaceMaterialAudio(input: UploadMaterialAudioInput): Promise<ReplaceListeningAudioResponse> {
  const selectedFile = input.filePath
    ? { path: input.filePath, name: input.fileName || input.filePath, size: 0 }
    : await chooseAudioFile();

  const format = detectAudioFormat(selectedFile.name || selectedFile.path);
  if (!format) {
    throw new Error('仅支持 mp3、m4a、wav 音频');
  }

  if (input.mode === 'local') {
    const saved = await wx.getFileSystemManager().saveFile({ tempFilePath: selectedFile.path });
    return replaceListeningAudioByMode('local', {
      materialId: input.materialId,
      cloudFileId: saved.savedFilePath,
      format
    });
  }

  if (!wx.cloud) {
    throw new Error('当前环境未启用微信云开发');
  }

  const uploaded = await wx.cloud.uploadFile({
    cloudPath: createAudioCloudPath(input.openid, input.materialId, format, Date.now()),
    filePath: selectedFile.path
  });

  return replaceListeningAudioByMode('cloud', {
    materialId: input.materialId,
    cloudFileId: uploaded.fileID,
    format
  });
}

async function chooseAudioFile(): Promise<{ path: string; name: string; size: number }> {
  const chosen = await wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['mp3', 'm4a', 'wav']
  });
  const file = chosen.tempFiles[0];
  if (!file) {
    throw new Error('没有选择音频文件');
  }

  return file;
}
