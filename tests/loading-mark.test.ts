/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Figma loading mark asset and animation contract', () => {
  it('uses the original square PNG at its natural 94 by 94 size', () => {
    const png = readFileSync('assets/figma-review/loading-logo.png');
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(94);
    expect(png.readUInt32BE(20)).toBe(94);
    expect(png.length).toBeGreaterThan(1000);
  });
  it('rotates a single intact image about the center and honors reduced motion', () => {
    const source = readFileSync('src/features/reviews/loading-mark.tsx', 'utf8');
    expect(source).toContain("loading-logo.png");
    expect(source).toContain("transformOrigin: 'center'");
    expect(source).toContain("outputRange: ['0deg', '360deg']");
    expect(source).toContain('Easing.linear');
    expect(source).toContain('reduceMotionChanged');
    expect(source).toContain('subscription.remove()');
    expect(source).not.toContain('.map(');
  });
});
