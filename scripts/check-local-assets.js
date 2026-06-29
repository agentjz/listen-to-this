const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const assetsRoot = path.join(root, 'local-assets');
const folderPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const audioNames = new Set(['audio.mp3', 'audio.m4a', 'audio.wav']);
const imageNames = new Set(['image.svg', 'image.png', 'image.jpg', 'image.jpeg']);
const allowedNames = new Set(['README.md', 'text.txt', ...audioNames, ...imageNames]);
const failures = [];

if (!fs.existsSync(assetsRoot)) {
  console.log('No local-assets directory.');
  process.exit(0);
}

const entries = fs.readdirSync(assetsRoot, { withFileTypes: true });
const folderIds = new Set();

for (const entry of entries) {
  if (!entry.isDirectory()) {
    failures.push(`local-assets/${entry.name}: local-assets 根目录只允许材料文件夹`);
    continue;
  }

  const folderId = entry.name;
  if (folderIds.has(folderId)) {
    failures.push(`local-assets/${folderId}: 材料文件夹名重复`);
  }
  folderIds.add(folderId);

  if (!folderPattern.test(folderId)) {
    failures.push(`local-assets/${folderId}: 文件夹名必须使用小写字母、数字和连字符`);
  }

  const materialDir = path.join(assetsRoot, folderId);
  const children = fs.readdirSync(materialDir, { withFileTypes: true });
  const fileNames = children.map((child) => child.name);

  for (const child of children) {
    if (child.isDirectory()) {
      failures.push(`local-assets/${folderId}/${child.name}: 材料文件夹内不允许子目录`);
      continue;
    }

    if (!allowedNames.has(child.name)) {
      failures.push(`local-assets/${folderId}/${child.name}: 文件名必须使用 text.txt、audio.* 或 image.*`);
    }
  }

  if (fileNames.includes('title.txt')) {
    failures.push(`local-assets/${folderId}: 不使用 title.txt，文件夹名就是材料标识和默认标题来源`);
  }

  if (!fileNames.includes('text.txt')) {
    failures.push(`local-assets/${folderId}: 缺少 text.txt`);
  }

  const audioCount = fileNames.filter((name) => audioNames.has(name)).length;
  if (audioCount > 1) {
    failures.push(`local-assets/${folderId}: 只能保留一个 audio.mp3、audio.m4a 或 audio.wav`);
  }

  const imageCount = fileNames.filter((name) => imageNames.has(name)).length;
  if (imageCount > 1) {
    failures.push(`local-assets/${folderId}: 只能保留一个 image.svg、image.png、image.jpg 或 image.jpeg`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Local assets checks passed.');
