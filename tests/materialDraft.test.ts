import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSaveMaterialRequest } from '../miniprogram/services/materialDraft';

test('buildSaveMaterialRequest trims content and uses title', () => {
  const request = buildSaveMaterialRequest({
    libraryId: 'library',
    title: ' My Material ',
    content: ' Hello. ',
    now: Date.UTC(2026, 0, 1)
  });

  assert.deepEqual(request, {
    libraryId: 'library',
    title: 'My Material',
    content: 'Hello.',
    imageFileIds: []
  });
});

test('buildSaveMaterialRequest rejects empty content', () => {
  assert.throws(() => buildSaveMaterialRequest({ libraryId: 'library', content: ' ' }), /英文内容/);
});
