import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const screen = fs.readFileSync(path.join(root, 'src/app/emoji-quiz.tsx'), 'utf8');
const home = fs.readFileSync(path.join(root, 'src/app/(tabs)/index.tsx'), 'utf8');

describe('emoji quiz screen contract', () => {
  it('offers presets, custom count, progress and result recovery', () => {
    expect(screen).toContain('const presets = [10, 30, 50]');
    expect(screen).toContain('1~100');
    expect(screen).toContain('정답 확인');
    expect(screen).toContain('게임 결과');
    expect(screen).toContain('같은 문제 수로 다시 하기');
  });

  it('is reachable from a compact home card', () => {
    expect(home).toContain("router.push('/emoji-quiz' as Href)");
    expect(home).toContain('이모지로 영화 맞히기');
  });
});
