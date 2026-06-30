const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const assetsRoot = path.join(root, 'local-assets');
const outputDir = path.join(root, 'miniprogram', 'generated');
const outputFile = path.join(outputDir, 'localAssets.ts');
const audioFormats = ['mp3', 'm4a', 'wav'];
const assetSections = {
  public: {
    libraryId: 'public-library',
    libraryName: '公共资源',
    libraryKind: 'general'
  },
  uncategorized: {
    libraryId: 'uncategorized-library',
    libraryName: '未分类材料',
    libraryKind: 'user'
  },
  user: {
    libraryId: 'user-library',
    libraryName: '用户资源',
    libraryKind: 'user'
  }
};

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
    .flatMap((sectionEntry) => readSectionMaterials(sectionEntry.name));
}

function readSectionMaterials(sectionName) {
  const sectionDefaults = assetSections[sectionName];
  if (!sectionDefaults) {
    return [];
  }

  const sectionDir = path.join(assetsRoot, sectionName);
  return fs
    .readdirSync(sectionDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readMaterial(sectionName, sectionDefaults, entry.name));
}

function readMaterial(sectionName, sectionDefaults, folderId) {
  const materialDir = path.join(assetsRoot, sectionName, folderId);
  const textPath = path.join(materialDir, 'text.txt');
  const metadata = readMetadata(materialDir, sectionDefaults);
  const content = fs.existsSync(textPath) ? fs.readFileSync(textPath, 'utf8').trim() : '';
  const audioFormat = audioFormats.find((format) => fs.existsSync(path.join(materialDir, `audio.${format}`)));

  return {
    id: `${sectionName}-${folderId}`,
    title: titleFromFolderId(folderId),
    libraryId: metadata.libraryId,
    libraryName: metadata.libraryName,
    libraryKind: metadata.libraryKind,
    content,
    audio: audioFormat
      ? {
          format: audioFormat,
          cloudFileId: `/local-assets/${sectionName}/${folderId}/audio.${audioFormat}`
        }
      : null,
  };
}

function readMetadata(materialDir, sectionDefaults) {
  const metadataPath = path.join(materialDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return sectionDefaults;
  }

  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  return {
    libraryId: metadata.libraryId || sectionDefaults.libraryId,
    libraryName: metadata.libraryName || sectionDefaults.libraryName,
    libraryKind: metadata.libraryKind || sectionDefaults.libraryKind
  };
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
  libraryId: string;
  libraryName: string;
  libraryKind: 'system' | 'general' | 'user';
  content: string;
  audio: {
    format: AudioFormat;
    cloudFileId: string;
  } | null;
}

export const LOCAL_ASSET_MATERIALS: LocalAssetMaterial[] = ${serialized};
`;
  fs.writeFileSync(outputFile, body, 'utf8');
}

writeOutput(readMaterials());
console.log('Generated miniprogram/generated/localAssets.ts');
