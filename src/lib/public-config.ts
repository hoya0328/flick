// Publishable/legacy anon keys are public identifiers, not administrator secrets.
// Reject a server credential even if somebody accidentally renames it EXPO_PUBLIC_*.
export function isPublicSupabaseKey(value: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  if (!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)) return false;
  try {
    const payload = value.split('.')[1];
    if (!payload) return false;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon';
  } catch {
    return false;
  }
}

export function assertPublicSupabaseKey(value: string | undefined) {
  if (value && !isPublicSupabaseKey(value)) {
    // Never include the credential itself in UI, console, telemetry, or errors.
    throw new Error('Supabase 클라이언트에는 공개용 publishable/anon 키만 사용할 수 있습니다. 서버 비밀키를 제거한 뒤 다시 빌드해 주세요.');
  }
}
