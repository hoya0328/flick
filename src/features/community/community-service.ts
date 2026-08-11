import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

const EVENT_SESSION_KEY = 'flick.stage5a.event-session';

export type PublicReviewCard = {
  reviewId: string;
  authorDisplayName: string;
  movieId: string;
  movieTitle: string;
  posterPath: string | null;
  mode: 'light' | 'core';
  watchedAt: string;
  rating: number | null;
  oneLine: string;
  bodyExcerpt: string;
  spoiler: boolean;
  updatedAt: string;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
};

export type ReviewCommunity = {
  likeCount: number;
  commentCount: number;
  saveCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
  canReport: boolean;
};

export type ReviewComment = {
  commentId: string;
  parentId: string | null;
  authorDisplayName: string;
  body: string;
  status: 'visible' | 'removed';
  createdAt: string;
  isMine: boolean;
};

export type ReviewReportReason = 'spoiler' | 'harassment' | 'personal_info' | 'copyright' | 'other';
export type ProductEventName = 'public_review_view' | 'movie_detail_open' | 'review_like' | 'review_save' | 'comment_create' | 'report_submit' | 'record_start';

function client() {
  if (!supabase) throw new Error('커뮤니티 서버가 연결되지 않았어요.');
  return supabase;
}

function communityError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (message.includes('authentication_required')) return new Error('로그인 후 사용할 수 있어요.');
  if (message.includes('review_not_found')) return new Error('공개된 완료 기록을 찾을 수 없어요.');
  if (message.includes('invalid_comment')) return new Error('댓글은 1자 이상 500자 이하로 입력해 주세요.');
  if (message.includes('reply_depth_exceeded')) return new Error('답글에는 추가 답글을 달 수 없어요.');
  if (message.includes('invalid_parent_comment')) return new Error('답글을 연결할 댓글을 다시 확인해 주세요.');
  if (message.includes('comment_not_found')) return new Error('본인의 댓글만 삭제할 수 있어요.');
  if (message.includes('cannot_report_own_review')) return new Error('내 기록은 신고할 수 없어요.');
  if (message.includes('invalid_report_reason')) return new Error('신고 이유를 선택해 주세요.');
  return new Error(message || '요청을 처리하지 못했어요.');
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listPublicReviewFeed(mode: 'light' | 'core' | null = null, cursor: string | null = null, limit = 20): Promise<PublicReviewCard[]> {
  const { data, error } = await client().rpc('list_public_reviews', { p_mode: mode, p_cursor: cursor, p_limit: limit });
  if (error) throw communityError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    reviewId: String(row.review_id),
    authorDisplayName: String(row.author_display_name ?? 'FLICK 사용자'),
    movieId: String(row.movie_id),
    movieTitle: String(row.movie_title ?? '영화 정보 없음'),
    posterPath: typeof row.poster_path === 'string' ? row.poster_path : null,
    mode: row.mode === 'core' ? 'core' : 'light',
    watchedAt: String(row.watched_at),
    rating: row.rating === null ? null : Number(row.rating),
    oneLine: String(row.one_line ?? ''),
    bodyExcerpt: String(row.body_excerpt ?? ''),
    spoiler: Boolean(row.spoiler),
    updatedAt: String(row.updated_at),
    likeCount: numberValue(row.like_count),
    commentCount: numberValue(row.comment_count),
    saveCount: numberValue(row.save_count),
    viewerLiked: Boolean(row.viewer_liked),
    viewerSaved: Boolean(row.viewer_saved),
  }));
}

export async function getReviewCommunity(reviewId: string): Promise<ReviewCommunity> {
  const { data, error } = await client().rpc('get_review_community', { p_review_id: reviewId });
  if (error) throw communityError(error);
  const row = ((data ?? []) as Record<string, unknown>[])[0];
  if (!row) throw new Error('공개 기록의 반응 정보를 불러오지 못했어요.');
  return {
    likeCount: numberValue(row.like_count),
    commentCount: numberValue(row.comment_count),
    saveCount: numberValue(row.save_count),
    viewerLiked: Boolean(row.viewer_liked),
    viewerSaved: Boolean(row.viewer_saved),
    canReport: Boolean(row.can_report),
  };
}

export async function listReviewComments(reviewId: string): Promise<ReviewComment[]> {
  const { data, error } = await client().rpc('list_review_comments', { p_review_id: reviewId });
  if (error) throw communityError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    commentId: String(row.comment_id),
    parentId: typeof row.parent_id === 'string' ? row.parent_id : null,
    authorDisplayName: String(row.author_display_name ?? 'FLICK 사용자'),
    body: String(row.body ?? ''),
    status: row.status === 'removed' ? 'removed' : 'visible',
    createdAt: String(row.created_at),
    isMine: Boolean(row.is_mine),
  }));
}

export async function setReviewLiked(reviewId: string, active: boolean) {
  const { error } = await client().rpc('set_review_like', { p_review_id: reviewId, p_active: active });
  if (error) throw communityError(error);
}

export async function setReviewSaved(reviewId: string, active: boolean) {
  const { error } = await client().rpc('set_review_save', { p_review_id: reviewId, p_active: active });
  if (error) throw communityError(error);
}

export async function addReviewComment(reviewId: string, body: string, parentId: string | null = null) {
  const { data, error } = await client().rpc('add_review_comment', { p_review_id: reviewId, p_body: body, p_parent_id: parentId });
  if (error) throw communityError(error);
  return String(data);
}

export async function removeReviewComment(commentId: string) {
  const { error } = await client().rpc('remove_review_comment', { p_comment_id: commentId });
  if (error) throw communityError(error);
}

export async function reportReview(reviewId: string, reason: ReviewReportReason, detail: string) {
  const { error } = await client().rpc('report_review', { p_review_id: reviewId, p_reason: reason, p_detail: detail });
  if (error) throw communityError(error);
}

function makeSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function eventSessionId() {
  const existing = await AsyncStorage.getItem(EVENT_SESSION_KEY);
  if (existing) return existing;
  const created = makeSessionId();
  await AsyncStorage.setItem(EVENT_SESSION_KEY, created);
  return created;
}

export async function trackProductEvent(eventName: ProductEventName, entityType: 'review' | 'movie' | 'record', entityId: string | null, metadata: { surface?: string; mode?: string; source?: string } = {}) {
  try {
    const sessionId = await eventSessionId();
    await client().rpc('track_product_event', { p_session_id: sessionId, p_event_name: eventName, p_entity_type: entityType, p_entity_id: entityId, p_metadata: metadata });
  } catch {
    // Product measurement must never interrupt reading or recording.
  }
}
