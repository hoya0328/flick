import { supabase } from '@/lib/supabase';

export type AdminAccess = {
  role: 'super_admin';
  canViewUsers: boolean;
  canViewReviews: boolean;
  canModerateReviews: boolean;
  canDeleteReviews: boolean;
};

export type AdminUser = {
  userId: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
};

export type AdminReview = {
  reviewId: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerDisplayName: string | null;
  movieTitle: string;
  mode: 'light' | 'core';
  status: 'draft' | 'completed';
  visibility: 'private' | 'public';
  rating: number | null;
  oneLine: string;
  bodyPreview: string;
  updatedAt: string;
};

export type AdminAuditEvent = {
  eventId: number;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
};

export type AdminReviewReport = {
  reportId: string;
  reviewId: string;
  movieTitle: string;
  authorDisplayName: string;
  reporterDisplayName: string;
  reason: string;
  detail: string;
  status: string;
  createdAt: string;
};

type AccessRow = {
  role: 'super_admin';
  can_view_users: boolean;
  can_view_reviews: boolean;
  can_moderate_reviews: boolean;
  can_delete_reviews: boolean;
};

function client() {
  if (!supabase) throw new Error('관리자 서버가 연결되지 않았습니다.');
  return supabase;
}

function adminError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('admin_required')) return new Error('관리자 권한이 없습니다.');
  if (message.includes('admin_view_users_required')) return new Error('사용자 조회 권한이 꺼져 있습니다.');
  if (message.includes('admin_view_reviews_required')) return new Error('기록 조회 권한이 꺼져 있습니다.');
  if (message.includes('admin_moderate_reviews_required')) return new Error('기록 수정 권한이 꺼져 있습니다.');
  if (message.includes('admin_delete_reviews_required')) return new Error('기록 삭제 권한이 꺼져 있습니다.');
  if (message.includes('review_not_found')) return new Error('기록이 없거나 이미 삭제되었습니다.');
  return new Error(message || '관리자 요청을 처리하지 못했습니다.');
}

export async function getMyAdminAccess(): Promise<AdminAccess | null> {
  const { data, error } = await client().rpc('admin_my_access');
  if (error) throw adminError(error);
  const row = (data as AccessRow[] | null)?.[0];
  return row ? {
    role: row.role,
    canViewUsers: row.can_view_users,
    canViewReviews: row.can_view_reviews,
    canModerateReviews: row.can_moderate_reviews,
    canDeleteReviews: row.can_delete_reviews,
  } : null;
}

export async function setMyAdminPermissions(access: AdminAccess) {
  const { error } = await client().rpc('admin_set_my_permissions', {
    p_can_view_users: access.canViewUsers,
    p_can_view_reviews: access.canViewReviews,
    p_can_moderate_reviews: access.canModerateReviews,
    p_can_delete_reviews: access.canDeleteReviews,
  });
  if (error) throw adminError(error);
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await client().rpc('admin_list_users', { p_limit: 100 });
  if (error) throw adminError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    userId: String(row.user_id),
    email: String(row.email ?? ''),
    displayName: typeof row.display_name === 'string' ? row.display_name : null,
    createdAt: String(row.created_at),
    lastSignInAt: typeof row.last_sign_in_at === 'string' ? row.last_sign_in_at : null,
  }));
}

export async function listAdminReviews(): Promise<AdminReview[]> {
  const { data, error } = await client().rpc('admin_list_reviews', { p_limit: 100 });
  if (error) throw adminError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    reviewId: String(row.review_id),
    ownerUserId: String(row.owner_user_id),
    ownerEmail: String(row.owner_email ?? ''),
    ownerDisplayName: typeof row.owner_display_name === 'string' ? row.owner_display_name : null,
    movieTitle: String(row.movie_title ?? '영화 정보 없음'),
    mode: row.mode === 'core' ? 'core' : 'light',
    status: row.status === 'completed' ? 'completed' : 'draft',
    visibility: row.visibility === 'public' ? 'public' : 'private',
    rating: row.rating === null ? null : Number(row.rating),
    oneLine: String(row.one_line ?? ''),
    bodyPreview: String(row.body_preview ?? ''),
    updatedAt: String(row.updated_at),
  }));
}

export async function listAdminAuditEvents(): Promise<AdminAuditEvent[]> {
  const { data, error } = await client().rpc('admin_list_audit_events', { p_limit: 30 });
  if (error) throw adminError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    eventId: Number(row.event_id),
    action: String(row.action),
    targetType: String(row.target_type),
    targetId: typeof row.target_id === 'string' ? row.target_id : null,
    createdAt: String(row.created_at),
  }));
}

export async function listAdminReviewReports(): Promise<AdminReviewReport[]> {
  const { data, error } = await client().rpc('admin_list_review_reports', { p_limit: 50 });
  if (error) throw adminError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    reportId: String(row.report_id),
    reviewId: String(row.review_id),
    movieTitle: String(row.movie_title ?? '영화 정보 없음'),
    authorDisplayName: String(row.author_display_name ?? 'FLICK 사용자'),
    reporterDisplayName: String(row.reporter_display_name ?? 'FLICK 사용자'),
    reason: String(row.reason),
    detail: String(row.detail ?? ''),
    status: String(row.status),
    createdAt: String(row.created_at),
  }));
}

export async function resolveAdminReviewReport(reportId: string, action: 'dismiss' | 'make_private') {
  const { error } = await client().rpc('admin_resolve_review_report', { p_report_id: reportId, p_action: action });
  if (error) throw adminError(error);
}

export async function makeAdminReviewPrivate(reviewId: string) {
  const { error } = await client().rpc('admin_make_review_private', { p_review_id: reviewId });
  if (error) throw adminError(error);
}

export async function deleteAdminReview(reviewId: string) {
  const { error } = await client().rpc('admin_delete_review', { p_review_id: reviewId });
  if (error) throw adminError(error);
}
