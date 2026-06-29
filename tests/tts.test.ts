import assert from 'node:assert/strict';
import { test } from 'node:test';
import { TencentTtsProvider } from '../cloudfunctions/_shared/tts/tencent';

test('TencentTtsProvider fails clearly when credentials are missing', async () => {
  const originalSecretId = process.env.TENCENT_SECRET_ID;
  const originalSecretKey = process.env.TENCENT_SECRET_KEY;
  const originalBucket = process.env.TTS_OUTPUT_BUCKET;
  delete process.env.TENCENT_SECRET_ID;
  delete process.env.TENCENT_SECRET_KEY;
  delete process.env.TTS_OUTPUT_BUCKET;

  await assert.rejects(
    () => new TencentTtsProvider().synthesize({ text: 'Hello.' }),
    /腾讯云 TTS 未配置/
  );

  process.env.TENCENT_SECRET_ID = originalSecretId;
  process.env.TENCENT_SECRET_KEY = originalSecretKey;
  process.env.TTS_OUTPUT_BUCKET = originalBucket;
});
