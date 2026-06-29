export interface TtsSynthesisRequest {
  text: string;
  voice?: string;
}

export interface TtsSynthesisResult {
  cloudFileId: string;
  format: 'mp3' | 'm4a' | 'wav';
  durationMs?: number;
}

export interface TtsProvider {
  synthesize(request: TtsSynthesisRequest): Promise<TtsSynthesisResult>;
}
