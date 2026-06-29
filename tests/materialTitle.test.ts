import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildDefaultMaterialTitle } from '../miniprogram/lib/materialTitle';

test('buildDefaultMaterialTitle uses a short content prefix', () => {
  const title = buildDefaultMaterialTitle('This is a long material with more content.', Date.UTC(2026, 0, 1));

  assert.equal(title, 'This is a lo 2026-01-01');
});
