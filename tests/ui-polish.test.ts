/// <reference types="node" />
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(`src/${path}`, 'utf8');
function styles(path: string) {
  const file = ts.createSourceFile(path, source(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let result: Record<string, Record<string, string | number>> = {};
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(file) === 'StyleSheet.create' && ts.isObjectLiteralExpression(node.arguments[0]!)) {
      result = Object.fromEntries(node.arguments[0]!.properties.flatMap(property => {
        if (!ts.isPropertyAssignment(property) || !ts.isObjectLiteralExpression(property.initializer)) return [];
        return [[property.name.getText(file), Object.fromEntries(property.initializer.properties.flatMap(item => {
          if (!ts.isPropertyAssignment(item)) return [];
          const value = item.initializer;
          return [[item.name.getText(file), ts.isNumericLiteral(value) ? Number(value.text) : ts.isStringLiteral(value) ? value.text : value.getText(file)]];
        }))]];
      }));
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}

describe('quiet product copy and flexible card boundaries', () => {
  it('keeps the review border on the whole card, not the pressable body', () => {
    const rules = styles('components/home-content-cards.tsx');
    expect(rules.review).toMatchObject({ borderWidth: 1, borderRadius: 20, overflow: 'hidden' });
    expect(rules.reviewOutline).toBeUndefined();
    expect(rules.review!.height).toBeUndefined();
    expect(rules.reaction!.minHeight).toBeGreaterThanOrEqual(44);
    expect(source('components/home-content-cards.tsx')).not.toContain('조회수는 집계');
  });
  it('clips every magazine image, including uploaded covers, to the same corners', () => {
    expect(styles('components/home-content-cards.tsx').magazineCover).toMatchObject({ borderRadius: 20, overflow: 'hidden', width: '100%' });
    expect(source('components/home-content-cards.tsx')).toContain('testID="home-magazine-cover"');
  });
  it('fits the first magazine and collection cards within narrow mobile insets', () => {
    expect(source('app/(tabs)/index.tsx')).toContain('width={Math.min(contentWidth - 42, 311)}');
    expect(source('features/profile/saved-content.tsx')).toContain('width={Math.min(width-42,311)}');
    expect(source('features/discovery/explore-hub.tsx')).toContain('width: width - 42');
    for (const viewport of [320, 390, 402, 430, 1280]) {
      const content = Math.min(viewport, 402);
      expect(Math.min(content - 42, 311) + 42).toBeLessThanOrEqual(content);
    }
  });
  it('wraps long representative keywords inside the card', () => {
    const rules = styles('components/review-keywords.tsx');
    expect(rules.tags!.flexWrap).toBe('wrap');
    expect(rules.tag!.maxWidth).toBe('100%');
  });
  it('removes permission tutorials and duplicate comment empty text, not real protections', () => {
    const page = source('app/review/[id].tsx');
    expect(page).not.toMatch(/안전한 공개 기록|첫 댓글을 남겨보세요|읽기 전용/);
    expect(page).toContain("mode !== 'supabase'");
    expect(page).toContain('comment.isMine');
    expect(page).toContain('record.spoiler');
    expect(page).toContain('maxLength={500}');
  });
  it('retains AI consent, spoiler choices, private/public selection and field errors', () => {
    for (const path of ['app/light-record.tsx', 'app/core-record.tsx']) {
      const page = source(path);
      expect(page).toContain('서비스 개선');
      expect(page).toContain('민감정보');
      expect(page).toContain('accessibilityRole="alert"');
      expect(page).toContain('스포일러');
      expect(page).toContain('나만 보기');
      expect(page).toContain('전체 공개');
    }
  });
  it('does not present fallback films as an actual weekly ranking', () => {
    expect(source('app/(tabs)/index.tsx')).toContain("title={currentRankings ?");
    expect(source('app/(tabs)/index.tsx')).toContain('지금 눈여겨볼 영화');
    expect(source('components/home-content-cards.tsx')).toContain('샘플');
  });
  it('uses a content-sized report card rather than a fixed-size SVG outline', () => {
    const page = source('app/taste-insights.tsx');
    expect(page).not.toContain('actual <=');
    expect(page).not.toContain('reportCoreCard');
    expect(page).not.toContain('성격 검사가 아니에요');
  });
  it('does not repeat the same required-field error in the Light body and footer', () => {
    expect(source('app/light-record.tsx')).toContain("error && (step === 'summary' || step === 'search' || step === 'rating')");
  });
  it('shows AI review guidance only with generated content, not in every Core input', () => {
    const core = source('app/core-record.tsx');
    expect(core).not.toContain('모든 결과물에 대한 최종 판단');
    expect(core).toContain("step==='feedback'&&feedbackText?.source==='gemini'");
    expect(core).toContain("flow.source==='gemini'?<Text");
  });
});
