import { TtsProvider, TtsSynthesisRequest, TtsSynthesisResult } from './types';
import { getCloudRuntime } from '../db';
import crypto from 'node:crypto';
import https from 'node:https';

interface TencentTextToVoiceResponse {
  Response: {
    Audio?: string;
    RequestId?: string;
    Error?: {
      Code: string;
      Message: string;
    };
  };
}

const ACTION = 'TextToVoice';
const VERSION = '2019-08-23';
const SERVICE = 'tts';
const DEFAULT_ENDPOINT = 'tts.tencentcloudapi.com';

export class TencentTtsProvider implements TtsProvider {
  async synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult> {
    const secretId = process.env.TENCENT_SECRET_ID;
    const secretKey = process.env.TENCENT_SECRET_KEY;
    const region = process.env.TENCENT_REGION;

    if (!secretId || !secretKey || !region) {
      throw new Error('腾讯云 TTS 未配置，无法生成音频');
    }

    const endpoint = process.env.TENCENT_TTS_ENDPOINT || DEFAULT_ENDPOINT;
    const format = 'mp3';
    const payload = {
      Text: request.text,
      SessionId: createSessionId(),
      VoiceType: Number(process.env.TENCENT_TTS_VOICE_TYPE || 1050),
      PrimaryLanguage: 2,
      Codec: 'MP3',
      SampleRate: 16000,
      Speed: Number(process.env.TENCENT_TTS_SPEED || 0),
      Volume: Number(process.env.TENCENT_TTS_VOLUME || 0),
      ProjectId: 0,
      ModelType: 1
    };
    const response = await callTencentTextToVoice({
      endpoint,
      region,
      secretId,
      secretKey,
      payload
    });
    const audioBase64 = response.Response.Audio;

    if (response.Response.Error) {
      throw new Error(`${response.Response.Error.Code}: ${response.Response.Error.Message}`);
    }

    if (!audioBase64) {
      throw new Error(`腾讯云 TTS 未返回音频，请求 ID：${response.Response.RequestId ?? 'unknown'}`);
    }

    const cloudPath = createOutputPath(format);
    const uploaded = await getCloudRuntime().uploadFile({
      cloudPath,
      fileContent: Buffer.from(audioBase64, 'base64')
    });

    return {
      cloudFileId: uploaded.fileID,
      format
    };
  }
}

async function callTencentTextToVoice(input: {
  endpoint: string;
  region: string;
  secretId: string;
  secretKey: string;
  payload: Record<string, unknown>;
}): Promise<TencentTextToVoiceResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify(input.payload);
  const authorization = createAuthorization({
    endpoint: input.endpoint,
    secretId: input.secretId,
    secretKey: input.secretKey,
    timestamp,
    body
  });

  return postJson<TencentTextToVoiceResponse>(input.endpoint, body, {
    Authorization: authorization,
    'Content-Type': 'application/json; charset=utf-8',
    Host: input.endpoint,
    'X-TC-Action': ACTION,
    'X-TC-Timestamp': String(timestamp),
    'X-TC-Version': VERSION,
    'X-TC-Region': input.region
  });
}

function createAuthorization(input: {
  endpoint: string;
  secretId: string;
  secretKey: string;
  timestamp: number;
  body: string;
}): string {
  const date = new Date(input.timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${input.endpoint}\nx-tc-action:${ACTION.toLowerCase()}\n`;
  const signedHeaders = 'content-type;host;x-tc-action';
  const hashedRequestPayload = sha256(input.body);
  const canonicalRequest = ['POST', '/', '', canonicalHeaders, signedHeaders, hashedRequestPayload].join('\n');
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = ['TC3-HMAC-SHA256', input.timestamp, credentialScope, sha256(canonicalRequest)].join('\n');
  const secretDate = hmac(`TC3${input.secretKey}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, 'tc3_request');
  const signature = hmac(secretSigning, stringToSign, 'hex');

  return `TC3-HMAC-SHA256 Credential=${input.secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function postJson<T>(host: string, body: string, headers: Record<string, string>): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        method: 'POST',
        hostname: host,
        path: '/',
        headers
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(text) as T);
          } catch (error) {
            reject(new Error(`腾讯云 TTS 返回非 JSON 响应：${text.slice(0, 200)}`));
          }
        });
      }
    );
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

function createSessionId(): string {
  return `listen-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function createOutputPath(format: TtsSynthesisResult['format']): string {
  const prefix = process.env.TTS_OUTPUT_PREFIX || 'tts-audio';
  return `${prefix}/${createSessionId()}.${format}`;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(key: string | Buffer, value: string, encoding?: crypto.BinaryToTextEncoding): Buffer | string {
  const digest = crypto.createHmac('sha256', key).update(value, 'utf8');
  return encoding ? digest.digest(encoding) : digest.digest();
}
