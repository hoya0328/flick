/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(`src/${path}`, 'utf8');

describe('header wordmark home navigation contract', () => {
  it('has one named keyboard/touch control with the existing vector artwork', () => {
    const control = source('components/home-wordmark.tsx');
    expect(control).toContain('accessibilityRole="button"');
    expect(control).toContain('accessibilityLabel="FLICK 글씨 · 홈으로"');
    expect(control).toContain('onPress={onPress ?? (() => router.navigate(\'/\'))}');
    expect(control).toContain('width: 116.4, height: 44');
    expect(control).toContain('<DesignVector name="wordmark" width={116.4} height={22} />');
    expect(control).not.toContain('pointerEvents');
  });

  it.each([
    'app/(tabs)/index.tsx', 'app/(tabs)/feed.tsx',
    'features/discovery/explore-hub.tsx', 'features/profile/profile-ui.tsx',
  ])('uses the same actionable wordmark in %s', path => {
    const page = source(path);
    expect(page).toContain('<HomeWordmark');
    expect(page).not.toMatch(/<DesignVector[^>]*name="wordmark"/);
  });

  it('keeps the profile symbol and wordmark on the same existing home action', () => {
    const page = source('features/profile/profile-ui.tsx');
    expect(page).toContain('accessibilityLabel="FLICK 홈으로" onPress={onHome}');
    expect(page).toContain('<HomeWordmark style={p.wordmark} onPress={onHome}/>');
    // 44px control adds 11px above/below the old 22px drawing at y=31.
    expect(page).toContain("wordmark:{position:'absolute',left:'50%',marginLeft:-58,top:20}");
    expect(20 + (44 - 22) / 2).toBe(31);
  });
});
