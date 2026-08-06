import { describe, expect, it } from 'vitest';

import {
  canCompleteOnboarding,
  getKeywordLabels,
  ONBOARDING_MAX_KEYWORDS,
  toggleKeyword,
} from '../src/features/onboarding/keywords';

describe('onboarding keyword selection', () => {
  it('adds and removes a keyword without duplicates', () => {
    expect(toggleKeyword([], 'warm')).toEqual(['warm']);
    expect(toggleKeyword(['warm'], 'warm')).toEqual([]);
  });

  it('does not exceed the maximum selection', () => {
    const full = Array.from({ length: ONBOARDING_MAX_KEYWORDS }, (_, index) => `keyword-${index}`);
    expect(toggleKeyword(full, 'extra')).toEqual(full);
  });

  it('requires at least three keywords to complete', () => {
    expect(canCompleteOnboarding(['warm', 'moving'])).toBe(false);
    expect(canCompleteOnboarding(['warm', 'moving', 'immersive'])).toBe(true);
  });

  it('ignores unknown ids when rendering labels', () => {
    expect(getKeywordLabels(['warm', 'unknown'])).toEqual(['따뜻한']);
  });
});
