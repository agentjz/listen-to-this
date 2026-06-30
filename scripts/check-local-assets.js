const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const assetsRoot = path.join(root, 'local-assets');
const folderPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const audioNames = new Set(['audio.mp3', 'audio.m4a', 'audio.wav']);
const allowedNames = new Set(['README.md', 'metadata.json', 'text.txt', ...audioNames]);
const allowedSectionFiles = new Set(['README.md']);
const libraryKinds = new Set(['system', 'general', 'user']);
const sections = new Set(['public', 'uncategorized', 'user']);
const failures = [];

if (!fs.existsSync(assetsRoot)) {
  console.log('No local-assets directory.');
  process.exit(0);
}

const entries = fs.readdirSync(assetsRoot, { withFileTypes: true });
const folderIds = new Set();

for (const sectionEntry of entries) {
  if (!sectionEntry.isDirectory()) {
    failures.push(`local-assets/${sectionEntry.name}: local-assets 根目录只允许 public、uncategorized、user 分区目录`);
    continue;
  }

  const sectionName = sectionEntry.name;
  if (!sections.has(sectionName)) {
    failures.push(`local-assets/${sectionName}: 顶层目录必须是 public、uncategorized 或 user`);
    continue;
  }

  const sectionDir = path.join(assetsRoot, sectionName);
  const materialEntries = fs.readdirSync(sectionDir, { withFileTypes: true });

  for (const entry of materialEntries) {
    if (entry.isFile() && allowedSectionFiles.has(entry.name)) {
      continue;
    }

    if (!entry.isDirectory()) {
      failures.push(`local-assets/${sectionName}/${entry.name}: 分区目录内只允许材料文件夹`);
      continue;
    }

    checkMaterial(sectionName, entry.name);
  }
}

function checkMaterial(sectionName, folderId) {
  const materialKey = `${sectionName}-${folderId}`;
  if (folderIds.has(materialKey)) {
    failures.push(`local-assets/${sectionName}/${folderId}: 材料 ID 重复`);
  }
  folderIds.add(materialKey);

  if (!folderPattern.test(folderId)) {
    failures.push(`local-assets/${sectionName}/${folderId}: 文件夹名必须使用小写字母、数字和连字符`);
  }

  const materialDir = path.join(assetsRoot, sectionName, folderId);
  const children = fs.readdirSync(materialDir, { withFileTypes: true });
  const fileNames = children.map((child) => child.name);

  for (const child of children) {
    if (child.isDirectory()) {
      failures.push(`local-assets/${sectionName}/${folderId}/${child.name}: 材料文件夹内不允许子目录`);
      continue;
    }

    if (!allowedNames.has(child.name)) {
      failures.push(`local-assets/${sectionName}/${folderId}/${child.name}: 文件名必须使用 text.txt 或 audio.*`);
    }
  }

  if (fileNames.includes('title.txt')) {
    failures.push(`local-assets/${sectionName}/${folderId}: 不使用 title.txt，文件夹名就是材料标识和默认标题来源`);
  }

  if (!fileNames.includes('text.txt')) {
    failures.push(`local-assets/${sectionName}/${folderId}: 缺少 text.txt`);
  }

  if (fileNames.includes('metadata.json')) {
    try {
      const metadata = JSON.parse(fs.readFileSync(path.join(materialDir, 'metadata.json'), 'utf8'));
      if (!metadata.libraryId || !folderPattern.test(metadata.libraryId)) {
        failures.push(`local-assets/${sectionName}/${folderId}/metadata.json: libraryId 必须使用小写字母、数字和连字符`);
      }
      if (!metadata.libraryName || typeof metadata.libraryName !== 'string') {
        failures.push(`local-assets/${sectionName}/${folderId}/metadata.json: libraryName 不能为空`);
      }
      if (!libraryKinds.has(metadata.libraryKind)) {
        failures.push(`local-assets/${sectionName}/${folderId}/metadata.json: libraryKind 必须是 system、general 或 user`);
      }
    } catch (error) {
      failures.push(`local-assets/${sectionName}/${folderId}/metadata.json: JSON 无法解析`);
    }
  }

  const audioCount = fileNames.filter((name) => audioNames.has(name)).length;
  if (audioCount > 1) {
    failures.push(`local-assets/${sectionName}/${folderId}: 只能保留一个 audio.mp3、audio.m4a 或 audio.wav`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Local assets checks passed.');
