/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync('supabase/migrations/202608100002_super_admin_console.sql', 'utf8');
const screen = readFileSync('src/app/admin.tsx', 'utf8');
const service = readFileSync('src/features/admin/admin-service.ts', 'utf8');

describe('super admin contract', () => {
  it('keeps bootstrap identity out of source control and starts mutation permissions disabled', () => {
    expect(migration).not.toContain('@naver.com');
    expect(migration).toMatch(/can_moderate_reviews boolean not null default false/);
    expect(migration).toMatch(/can_delete_reviews boolean not null default false/);
  });

  it('checks server permissions before cross-user reads and mutations', () => {
    expect(migration).toMatch(/admin_list_users[\s\S]*can_view_users/);
    expect(migration).toMatch(/admin_list_reviews[\s\S]*can_view_reviews/);
    expect(migration).toMatch(/admin_make_review_private[\s\S]*can_moderate_reviews/);
    expect(migration).toMatch(/admin_delete_review[\s\S]*can_delete_reviews/);
    expect(migration).toContain('admin_audit_events');
    expect(migration).toMatch(/revoke all on public\.admin_access from anon, authenticated/);
  });

  it('uses RPCs and requires a second confirmation before destructive deletion', () => {
    expect(service).toContain("rpc('admin_delete_review'");
    expect(service).toContain("rpc('admin_set_my_permissions'");
    expect(screen).toContain('pendingDeleteId === review.reviewId');
    expect(screen).toContain('영구 삭제 확인');
    expect(screen).not.toMatch(/\.from\(['"]reviews['"]\)\.delete/);
  });
});
