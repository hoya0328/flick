/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('account authorization contract', () => {
  it('keeps public records readable only after completion while writes stay owner-only', () => {
    const base = read('supabase/migrations/202608070004_stage3ab_reviews.sql');
    const visibility = read('supabase/migrations/202608070006_review_visibility_core_ai.sql');

    expect(visibility).toContain("visibility = 'public' and status = 'completed'");
    expect(base).toMatch(/reviews_update_own[\s\S]*using \(auth\.uid\(\) = user_id\)[\s\S]*with check \(auth\.uid\(\) = user_id\)/);
    expect(base).toMatch(/reviews_delete_own[\s\S]*using \(auth\.uid\(\) = user_id\)/);
    expect(visibility).toMatch(/security invoker[\s\S]*where id = v_review_id and user_id = auth\.uid\(\)/);
  });

  it('keeps the shared review screen read-only and separate from the editor route', () => {
    const viewer = read('src/app/review/[id].tsx');
    const archive = read('src/app/(tabs)/archive.tsx');

    expect(viewer).toContain('getPublicReview');
    expect(viewer).not.toMatch(/saveReview|deleteReview|TextInput/);
    expect(archive).toContain('publicReviewPath(record.id)');
    expect(archive).not.toContain("Linking.createURL('/record'");
  });
});
