/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/202608110001_stage5a_public_content.sql', 'utf8');
const community = readFileSync('src/features/community/community-service.ts', 'utf8');
const publicReview = readFileSync('src/app/review/[id].tsx', 'utf8');
const archive = readFileSync('src/app/(tabs)/archive.tsx', 'utf8');
const admin = readFileSync('src/app/admin.tsx', 'utf8');

describe('Stage 5A public content contract', () => {
  it('stores idempotent likes and saves while keeping interaction tables behind RPCs', () => {
    expect(migration).toMatch(/primary key \(review_id, user_id\)/g);
    expect(migration).toContain('on conflict do nothing');
    expect(migration).toMatch(/revoke all on public\.review_likes from anon, authenticated/);
    expect(migration).toMatch(/revoke all on public\.review_comments from anon, authenticated/);
    expect(migration).toMatch(/is_public_completed_review\(p_review_id\)/);
  });

  it('limits comments to one reply level and makes report submission idempotent', () => {
    expect(migration).toContain("raise exception 'reply_depth_exceeded'");
    expect(migration).toContain('unique (review_id, reporter_user_id)');
    expect(migration).toContain('cannot_report_own_review');
    expect(migration).toMatch(/admin_list_review_reports[\s\S]*can_moderate_reviews/);
  });

  it('records only allow-listed pseudonymous conversion metadata', () => {
    const eventTable = migration.match(/create table if not exists public\.product_events \([\s\S]*?\n\);/)?.[0] ?? '';
    expect(migration).toContain('session_id uuid not null');
    expect(migration).toContain("'surface'");
    expect(eventTable).not.toMatch(/email|body text/i);
    expect(community).toContain('Product measurement must never interrupt');
  });

  it('connects interactions, reports, unified filters, and admin moderation to real UI', () => {
    expect(publicReview).toContain('setReviewLiked');
    expect(publicReview).toContain('addReviewComment');
    expect(publicReview).toContain('reportReview');
    expect(archive).toContain('통합 기록 관리');
    expect(archive).toContain('영구 삭제 확인');
    expect(admin).toContain('listAdminReviewReports');
    expect(admin).toContain('기록 비공개 + 처리');
  });
});
