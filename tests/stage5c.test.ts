/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/202608110003_stage5c_discovery_editorial.sql', 'utf8');
const home = readFileSync('src/app/(tabs)/index.tsx', 'utf8');
const search = readFileSync('src/app/(tabs)/search.tsx', 'utf8');
const admin = readFileSync('src/app/admin-curations.tsx', 'utf8');
const publicDetail = readFileSync('src/app/curation/[id].tsx', 'utf8');

describe('Stage 5C discovery and editorial contract', () => {
  it('uses explainable seven-day snapshots and suppresses small samples', () => {
    expect(migration).toContain('v_min_reviews := least(greatest(coalesce(p_min_reviews, 5), 5), 100)');
    expect(migration).toContain("reviews.visibility = 'public' and reviews.status = 'completed'");
    expect(migration).toContain("coalesce(reviews.completed_at, reviews.updated_at) >= v_period_start");
    expect(migration).toContain('v_sample_size >= v_min_reviews');
    expect(home).toContain('DiscoveryRankingsView');
  });

  it('keeps ranking refresh and editorial mutations admin-only', () => {
    expect(migration).toMatch(/admin_refresh_discovery_rankings[\s\S]*admin_access[\s\S]*admin_required/);
    expect(migration).toMatch(/admin_save_editorial_curation[\s\S]*admin_access[\s\S]*admin_required/);
    expect(migration).toContain('revoke all on public.discovery_ranking_runs from anon, authenticated');
    expect(migration).toContain('revoke all on public.editorial_curations from anon, authenticated');
  });

  it('requires verifiable authorship, source, rights, and at least one movie before expert publication', () => {
    expect(migration).toContain("raise exception 'add_movies_before_publish'");
    expect(migration).toContain("raise exception 'expert_rights_required'");
    expect(migration).toContain("coalesce(p_source_url, '') !~ '^https?://'");
    expect(admin).toContain('게시 권한 확인');
    expect(publicDetail).toContain('출처가 확인된 전문가 콘텐츠');
  });

  it('exposes emotion curation with reasons and manual niche curation controls', () => {
    expect(search).toContain('지금 원하는 감정으로 고르기');
    expect(search).toContain('recommendationReason');
    expect(admin).toContain('니치 큐레이션');
    expect(admin).toContain('addAdminCurationMovie');
    expect(home).toContain('상황별 편집 큐레이션');
  });
});
