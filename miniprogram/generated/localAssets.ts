import { AudioFormat } from '../types/domain';

export interface LocalAssetMaterial {
  id: string;
  title: string;
  libraryId: string;
  libraryName: string;
  libraryKind: 'system' | 'general' | 'user';
  content: string;
  audio: {
    format: AudioFormat;
    cloudFileId: string;
  } | null;
}

export const LOCAL_ASSET_MATERIALS: LocalAssetMaterial[] = [
  {
    "id": "public-dog-wolf-friendship",
    "title": "Dog Wolf Friendship",
    "libraryId": "public-library",
    "libraryName": "公共资源",
    "libraryKind": "general",
    "content": "Thousands of years ago, you couldn't find dogs. You could only find wolves. Wolves and humans even lived side by side. The wolves probably ate the food people threw away around the villages. As time went by, these wolves started to be guard dogs and help to drive away dangerous animals. Since then, we have been friends with dogs.",
    "audio": {
      "format": "mp3" as AudioFormat,
      "cloudFileId": "/local-assets/public/dog-wolf-friendship/audio.mp3"
    }
  }
];
