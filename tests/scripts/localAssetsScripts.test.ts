import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('local assets scripts scan sectioned material folders', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'listen-assets-'));
  const materialDir = join(workspace, 'local-assets', 'public', 'dog-wolf-friendship');
  mkdirSync(materialDir, { recursive: true });
  mkdirSync(join(workspace, 'local-assets', 'uncategorized'), { recursive: true });
  mkdirSync(join(workspace, 'local-assets', 'user'), { recursive: true });
  writeFileSync(join(materialDir, 'text.txt'), 'hello');
  writeFileSync(join(materialDir, 'audio.mp3'), 'audio');

  execFileSync(process.execPath, [join(root, 'scripts', 'check-local-assets.js')], { cwd: workspace });
  execFileSync(process.execPath, [join(root, 'scripts', 'generate-local-assets.js')], { cwd: workspace });

  const generated = readFileSync(join(workspace, 'miniprogram', 'generated', 'localAssets.ts'), 'utf8');
  assert.equal(generated.includes('"id": "public-dog-wolf-friendship"'), true);
  assert.equal(generated.includes('"cloudFileId": "/local-assets/public/dog-wolf-friendship/audio.mp3"'), true);
});

test('local assets check rejects old single-level material folders', () => {
  const workspace = mkdtempSync(join(tmpdir(), 'listen-assets-'));
  const materialDir = join(workspace, 'local-assets', 'dog-wolf-friendship');
  mkdirSync(materialDir, { recursive: true });
  writeFileSync(join(materialDir, 'text.txt'), 'hello');

  assert.throws(
    () => execFileSync(process.execPath, [join(root, 'scripts', 'check-local-assets.js')], { cwd: workspace, stdio: 'pipe' }),
    /顶层目录必须是 public、uncategorized 或 user/
  );
});
