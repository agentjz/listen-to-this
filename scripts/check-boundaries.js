const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'miniprogram_npm', 'ref']);
const textExtensions = new Set([
  '.ts',
  '.js',
  '.json',
  '.wxml',
  '.wxss',
  '.md',
  '.yaml',
  '.yml'
]);

const mojibakeCodePoints = [
  0x935a,
  0x7035,
  0x7ee0,
  0x7f01,
  0x93c9,
  0x95ca,
  0x9422,
  0x59e3,
  0x7459,
  0x93c2,
  0x95c6,
  0x7487,
  0x6748,
  0x59af,
  0x93b5,
  0x6d63,
  0x9428,
  0x6d93,
  0x9a9e,
  0x93c8
];

const mojibakePatterns = [
  new RegExp('\\uFFFD'),
  new RegExp(mojibakeCodePoints.map((codePoint) => String.fromCodePoint(codePoint)).join('|'))
];

const forbiddenPatterns = [
  { pattern: /\bbindAudio\b/, message: '禁止使用 bindAudio 命名' },
  { pattern: /\bAudioBinding\b/, message: '禁止使用 AudioBinding 主领域名' },
  { pattern: /\bMaterialId\b/, message: '禁止使用错误大小写 MaterialId' },
  { pattern: /\bMaterials\b/, message: '禁止使用错误大小写 Materials' },
  { pattern: /\bSaveMaterial\b/, message: '页面方法禁止 PascalCase' },
  { pattern: /\bSaveListeningAudio\b/, message: '页面方法禁止 PascalCase' },
  { pattern: /\bBlock\b/, message: '禁止使用 Block 作为主领域名' },
  { pattern: /\bMaterialSentence\b/, message: '禁止保留 MaterialSentence 历史模型' },
  { pattern: /\bsentenceId\b/, message: '禁止保留 sentenceId 历史字段' },
  { pattern: /\bsentenceCount\b/, message: '禁止保留 sentenceCount 历史字段' },
  { pattern: /\bmaterialSentences\b/, message: '禁止保留 materialSentences 历史集合' },
  { pattern: /\bsplitEnglishSentences\b/, message: '禁止保留自动分句主功能' }
];

const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!textExtensions.has(path.extname(entry.name))) {
      continue;
    }

    const relativePath = path.relative(root, fullPath);
    const text = fs.readFileSync(fullPath, 'utf8');
    const isRuntimeFile = !relativePath.endsWith('.md') && relativePath !== path.join('scripts', 'check-boundaries.js');

    for (const pattern of mojibakePatterns) {
      if (pattern.test(text)) {
        failures.push(`${relativePath}: 检测到疑似乱码`);
      }
    }

    if (isRuntimeFile) {
      for (const rule of forbiddenPatterns) {
        if (rule.pattern.test(text)) {
          failures.push(`${relativePath}: ${rule.message}`);
        }
      }
    }

    if (isRuntimeFile && text.includes('ref/')) {
      failures.push(`${relativePath}: 运行文件不得引用 ref/`);
    }
  }
}

function checkAppPages() {
  const appJsonPath = path.join(root, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

  if (appJson.tabBar) {
    failures.push('app.json: 禁止配置底部 tabBar');
  }

  for (const page of appJson.pages || []) {
    for (const extension of ['.ts', '.wxml', '.json', '.wxss']) {
      const pageFile = path.join(root, `${page}${extension}`);
      if (!fs.existsSync(pageFile)) {
        failures.push(`app.json: 页面文件不存在 ${page}${extension}`);
      }
    }
  }
}

function checkVantDependency() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (!packageJson.dependencies || !packageJson.dependencies['@vant/weapp']) {
    failures.push('package.json: 缺少 @vant/weapp 依赖');
  }
}

walk(root);
checkAppPages();
checkVantDependency();

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Boundary checks passed.');
