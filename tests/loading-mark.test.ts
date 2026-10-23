/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Figma loading mark asset and animation contract', () => {
  it('uses the original 94 by 94 vector with no embedded raster', () => {
    const svg = readFileSync('assets/figma-vectors/loadingLogo.svg', 'utf8');
    expect(svg).toContain('width="94" height="94"');
    expect(svg).not.toMatch(/<image|base64/);
  });
  it('rotates a single intact image about the center and honors reduced motion', () => {
    const source = readFileSync('src/features/reviews/loading-mark.tsx', 'utf8');
    expect(source).toContain('name="loadingLogo"');
    expect(source).toContain("transformOrigin: 'center'");
    expect(source).toContain("outputRange: ['0deg', '360deg']");
    expect(source).toContain('Easing.linear');
    expect(source).toContain('reduceMotionChanged');
    expect(source).toContain('subscription.remove()');
    expect(source).not.toContain('.map(');
  });
});
