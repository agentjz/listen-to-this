import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isAdminOpenid } from '../miniprogram/lib/auth';

test('isAdminOpenid only allows configured openid', () => {
  assert.equal(isAdminOpenid('owner', ['owner']), true);
  assert.equal(isAdminOpenid('guest', ['owner']), false);
});
