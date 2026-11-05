import { describe, expect, it } from 'vitest';
import { INTRO_INTENT_TTL, introEntryTarget, introPage, parseIntroIntent, type IntroIntent } from '../src/features/onboarding/intro-model';

const now = 10000000;
const core: IntroIntent = { mode: 'core', expiresAt: now + INTRO_INTENT_TTL };
const state = { mode: 'none' as const, onboardingComplete: false, introSeen: false, intent: null, hasSharedLink: false, now };

describe('Figma introductory onboarding boundary', () => {
  it.each([['1', 1], ['2', 2], ['3', 3], ['4', 4], ['0', 1], ['5', 1], ['https://example.invalid', 1], [undefined, 1], [['4'], 1]])('normalizes the page without accepting arbitrary routes: %s', (value, expected) => {
    expect(introPage(value)).toBe(expected);
  });
  it('shows the tour only to an unintroduced signed-out ordinary entry', () => {
    expect(introEntryTarget(state)).toBe('intro');
    expect(introEntryTarget({ ...state, introSeen: true })).toBe('welcome');
    expect(introEntryTarget({ ...state, hasSharedLink: true })).toBe('welcome');
  });
  it.each(['light', 'core'] as const)('never bypasses login or required taste setup with a %s choice', mode => {
    const intent = { ...core, mode };
    expect(introEntryTarget({ ...state, introSeen: true, intent })).toBe('welcome');
    expect(introEntryTarget({ ...state, mode: 'supabase', intent })).toBe('onboarding');
    expect(introEntryTarget({ ...state, mode: 'demo', intent })).toBe('onboarding');
    expect(introEntryTarget({ ...state, mode: 'supabase', onboardingComplete: true, intent })).toBe(mode);
    expect(introEntryTarget({ ...state, mode: 'demo', onboardingComplete: true, intent })).toBe(mode);
  });
  it('preserves signed-in returning users and shared-link precedence', () => {
    expect(introEntryTarget({ ...state, mode: 'supabase', onboardingComplete: true })).toBe('home');
    expect(introEntryTarget({ ...state, mode: 'demo', onboardingComplete: true })).toBe('home');
    expect(introEntryTarget({ ...state, mode: 'supabase', onboardingComplete: true, hasSharedLink: true, intent: core })).toBe('shared');
  });
  it('accepts only valid, finite, short-lived recording choices', () => {
    expect(parseIntroIntent(JSON.stringify(core), now)).toEqual(core);
    for (const value of [null, '', 'null', '{}', 'bad-json', JSON.stringify({ mode: '/admin', expiresAt: now + 1 }), JSON.stringify({ mode: 'core', expiresAt: 'later' }), JSON.stringify({ mode: 'core', expiresAt: now }), JSON.stringify({ mode: 'core', expiresAt: now + INTRO_INTENT_TTL + 1 })]) {
      expect(parseIntroIntent(value, now)).toBeNull();
    }
    expect(introEntryTarget({ ...state, mode: 'supabase', onboardingComplete: true, intent: { ...core, expiresAt: now - 1 } })).toBe('home');
  });
});
