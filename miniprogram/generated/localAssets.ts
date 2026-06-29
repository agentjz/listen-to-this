import { AudioFormat } from '../types/domain';

export interface LocalAssetMaterial {
  id: string;
  title: string;
  content: string;
  audio: {
    format: AudioFormat;
    cloudFileId: string;
  } | null;
  imageCloudFileId: string | null;
}

export const LOCAL_ASSET_MATERIALS: LocalAssetMaterial[] = [
  {
    "id": "dog-wolf-friendship",
    "title": "Dog Wolf Friendship",
    "content": "Thousands of years ago, you couldn't find dogs. You could only find wolves. Wolves and humans even lived side by side. The wolves probably ate the food people threw away around the villages. As time went by, these wolves started to be guard dogs and help to drive away dangerous animals. Since then, we have been friends with dogs.",
    "audio": {
      "format": "mp3" as AudioFormat,
      "cloudFileId": "/local-assets/dog-wolf-friendship/audio.mp3"
    },
    "imageCloudFileId": "/local-assets/dog-wolf-friendship/image.svg"
  }
];
