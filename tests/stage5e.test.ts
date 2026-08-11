import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202608110004_stage5de_personalization_experiments.sql'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'src/app/experiments.tsx'), 'utf8');

describe('stage 5E server-judged experiments', () => {
  it('keeps answers server-side and limits attempts atomically', () => {
    expect(migration).toContain('correct_option_key');
    expect(migration).toContain('for update');
    expect(migration).toContain('attempt_count >= 3');
    expect(migration).toContain('revoke all on public.experiment_quizzes from anon, authenticated');
    expect(screen).not.toContain('correct_option_key');
  });

  it('accepts only the first vote per authenticated user', () => {
    expect(migration).toContain('primary key (poll_id, user_id)');
    expect(migration).toContain('on conflict (poll_id, user_id) do nothing');
    expect(migration).toContain("if auth.uid() is null then raise exception 'authentication_required'");
    expect(screen).toContain('첫 선택만 반영됩니다');
  });
});
