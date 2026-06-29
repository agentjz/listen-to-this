import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canPlayPreferably, createAudioCloudPath, detectAudioFormat } from '../miniprogram/lib/audio';

test('detectAudioFormat accepts supported formats', () => {
  assert.equal(detectAudioFormat('a.mp3'), 'mp3');
  assert.equal(detectAudioFormat('a.M4A'), 'm4a');
  assert.equal(detectAudioFormat('/tmp/a.wav'), 'wav');
});

test('detectAudioFormat rejects unsupported formats', () => {
  assert.equal(detectAudioFormat('a.flac'), null);
  assert.equal(detectAudioFormat('a'), null);
});

test('canPlayPreferably prioritizes mp3 and m4a', () => {
  assert.equal(canPlayPreferably('mp3'), true);
  assert.equal(canPlayPreferably('m4a'), true);
  assert.equal(canPlayPreferably('wav'), false);
});

test('createAudioCloudPath scopes audio by user and material', () => {
  assert.equal(createAudioCloudPath('openid', 'material', 'mp3', 123), 'users/openid/listening-audio/material-123.mp3');
});
