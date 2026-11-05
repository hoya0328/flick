export const INTRO_SEEN_KEY = 'flick.intro.seen.v1';
export const INTRO_INTENT_KEY = 'flick.intro.recording-intent.v1';
export const INTRO_INTENT_TTL = 30 * 60 * 1000;
export type IntroMode = 'light' | 'core';
export type IntroIntent = { mode: IntroMode; expiresAt: number };
export type IntroPage = 1 | 2 | 3 | 4;

export function introPage(value: unknown): IntroPage {
  return value === '2' ? 2 : value === '3' ? 3 : value === '4' ? 4 : 1;
}

export function parseIntroIntent(raw: string | null, now = Date.now()): IntroIntent | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('mode' in value) || !('expiresAt' in value)) return null;
    if ((value.mode !== 'light' && value.mode !== 'core') || typeof value.expiresAt !== 'number' ||
      !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + INTRO_INTENT_TTL) return null;
    return { mode: value.mode, expiresAt: value.expiresAt };
  } catch { return null; }
}

export function introEntryTarget({ mode, onboardingComplete, introSeen, intent, hasSharedLink, now = Date.now() }: {
  mode: 'none' | 'demo' | 'supabase'; onboardingComplete: boolean; introSeen: boolean;
  intent: IntroIntent | null; hasSharedLink: boolean; now?: number;
}): 'intro' | 'welcome' | 'onboarding' | 'shared' | 'light' | 'core' | 'home' {
  if (mode === 'none') return hasSharedLink || introSeen ? 'welcome' : 'intro';
  if (!onboardingComplete) return 'onboarding';
  if (hasSharedLink) return 'shared';
  return intent && intent.expiresAt > now && intent.expiresAt <= now + INTRO_INTENT_TTL ? intent.mode : 'home';
}
