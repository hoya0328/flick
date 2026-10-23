/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { vectorAssets } from '../src/features/design/vector-assets';

describe('original Figma vector asset contract', () => {
  it('ships synchronized transparent vectors without raster or remote dependencies', () => {
    expect(Object.keys(vectorAssets).length).toBeGreaterThanOrEqual(30);
    for (const [name, asset] of Object.entries(vectorAssets)) {
      const source = readFileSync(`assets/figma-vectors/${name}.svg`, 'utf8').trim();
      expect(asset.xml, name).toBe(source);
      expect(source, name).toContain(`width="${asset.width}" height="${asset.height}"`);
      expect(source, name).not.toMatch(/<image|<foreignObject|<script|base64|href="https?:|fill="#F5F5F5"|<rect width="402"/);
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
    }
  });
  it('never imports raster UI assets into the requested screens', () => {
    for (const path of ['src/app/light-record.tsx', 'src/app/(tabs)/_layout.tsx', 'src/features/reviews/loading-mark.tsx', 'src/features/reviews/rating-control.tsx', 'src/features/reviews/rating-control.web.tsx']) {
      expect(readFileSync(path, 'utf8'), path).not.toMatch(/figma-(home|review)\/.*\.png/);
    }
  });
  it('keeps the 402px artboard, 74px content header, and original icon geometry', () => {
    const screen = readFileSync('src/app/light-record.tsx', 'utf8');
    expect(screen).toContain('maxWidth: 402');
    expect(screen).toContain('height: 74');
    expect(screen).toContain('fontSize: 15, lineHeight: 18');
    expect(vectorAssets.ratingStars.width).toBe(267);
    expect(vectorAssets.ratingStars.height).toBe(51);
    expect(vectorAssets.loadingLogo.width).toBe(94);
  });
});
