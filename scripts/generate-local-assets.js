const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const assetsRoot = path.join(root, 'local-assets');
const outputDir = path.join(root, 'miniprogram', 'generated');
const outputFile = path.join(outputDir, 'localAssets.ts');
const audioFormats = ['mp3', 'm4a', 'wav'];
const imageExtensions = ['svg', 'png', 'jpg', 'jpeg'];

function titleFromFolderId(folderId) {
  return folderId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readMaterials() {
  if (!fs.existsSync(assetsRoot)) {
    return [];
  }

  return fs
    .readdirSync(assetsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const folderId = entry.name;
      const materialDir = path.join(assetsRoot, folderId);
      const textPath = path.join(materialDir, 'text.txt');
      const content = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8').trim() : '';
      const audioFormat = audioFormats.find((format) => fs.existsSync(path.join(materialDir, `audio.${format}`)));
      const imageExtension = imageExtensions.find((extension) => fs.existsSync(path.join(materialDir, `image.${extension}`)));

      return {
        id: folderId,
        title: titleFromFolderId(folderId),
        content,
        audio: audioFormat
          ? {
              format: audioFormat,
              cloudFileId: `/local-assets/${folderId}/audio.${audioFormat}`
            }
          : null,
        imageCloudFileId: imageExtension ? `/local-assets/${folderId}/image.${imageExtension}` : null
      };
    });
}

function writeOutput(materials) {
  fs.mkdirSync(outputDir, { recursive: true });
  const serialized = JSON.stringify(materials, null, 2)
    .replace(/"format": "([^"]+)"/g, '"format": "$1" as AudioFormat')
    .replace(/"audio": null/g, '"audio": null');
  const body = `import { AudioFormat } from '../types/domain';

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

export const LOCAL_ASSET_MATERIALS: LocalAssetMaterial[] = ${serialized};
`;
  fs.writeFileSync(outputFile, body, 'utf8');
}

writeOutput(readMaterials());
console.log('Generated miniprogram/generated/localAssets.ts');
