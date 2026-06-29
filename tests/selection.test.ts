import assert from 'node:assert/strict';
import { test } from 'node:test';
import { selectAll, toggleSelection } from '../miniprogram/lib/selection';

test('toggleSelection adds and removes ids', () => {
  assert.deepEqual(toggleSelection([], 'a'), ['a']);
  assert.deepEqual(toggleSelection(['a', 'b'], 'a'), ['b']);
});

test('selectAll keeps unique non-empty ids', () => {
  assert.deepEqual(selectAll(['a', 'b', 'a', '']), ['a', 'b']);
});
