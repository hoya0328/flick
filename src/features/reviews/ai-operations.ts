export type AiQuota = { remaining: number; dailyLimit: number; retryAfterSeconds?: number };

export class AiOperationError extends Error {
  code: string;
  quota?: AiQuota;

  constructor(code: string, quota?: AiQuota) {
    super(code);
    this.name = 'AiOperationError';
    this.code = code;
    this.quota = quota;
  }
}

export function normalizeAiQuota(value: unknown): AiQuota | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const quota = value as { remaining?: unknown; dailyLimit?: unknown; retryAfterSeconds?: unknown };
  if (!Number.isInteger(quota.remaining) || !Number.isInteger(quota.dailyLimit)) return undefined;
  return {
    remaining: Math.max(0, Number(quota.remaining)),
    dailyLimit: Math.max(0, Number(quota.dailyLimit)),
    ...(Number.isInteger(quota.retryAfterSeconds) ? { retryAfterSeconds: Math.max(0, Number(quota.retryAfterSeconds)) } : {}),
  };
}

export async function readAiOperationError(error: unknown, data?: unknown): Promise<AiOperationError> {
  let payload = data;
  const context = (error as { context?: { clone?: () => unknown; json?: () => Promise<unknown> } } | null)?.context;
  if ((!payload || typeof payload !== 'object') && context) {
    try {
      const response = typeof context.clone === 'function' ? context.clone() : context;
      if (response && typeof (response as { json?: unknown }).json === 'function') payload = await (response as { json: () => Promise<unknown> }).json();
    } catch { /* Use the generic code below. */ }
  }
  const result = payload && typeof payload === 'object' ? payload as { code?: unknown; quota?: unknown } : {};
  return new AiOperationError(typeof result.code === 'string' ? result.code : 'ai_unavailable', normalizeAiQuota(result.quota));
}

export function aiOperationMessage(error: unknown): string {
  const code = error instanceof AiOperationError ? error.code : 'ai_unavailable';
  if (code === 'daily_limit') return '오늘 사용할 수 있는 무료 AI 횟수를 모두 사용했어요. 내일 다시 시도해 주세요.';
  if (code === 'burst_limit') return '요청이 잠시 많아요. 1분 뒤 다시 시도해 주세요.';
  if (code === 'free_tier_limit') return 'Gemini 무료 제공량이 소진됐어요. 기존 기록을 유지하고 나중에 다시 시도해 주세요.';
  if (code === 'sensitive_input') return '이메일·전화번호 등 개인정보로 보이는 내용이 있어 AI로 전송하지 않았어요. 해당 내용을 지운 뒤 다시 시도해 주세요.';
  if (code === 'unsafe_output') return '안전 기준에 맞지 않는 결과라 사용하지 않았어요. 기존 기록은 그대로 보존했어요.';
  if (code === 'quota_guard_unavailable') return '사용량 보호 장치를 확인할 수 없어 AI를 호출하지 않았어요. 잠시 뒤 다시 시도해 주세요.';
  return 'AI가 응답하지 않았어요. 기존 기록은 그대로 보존했어요. 잠시 뒤 다시 시도해 주세요.';
}
