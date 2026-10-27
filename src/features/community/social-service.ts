import { supabase } from "@/lib/supabase";

export type CommunityState = {
  userId: string;
  publicProfile: boolean;
  followers: number;
  following: number;
  unread: number;
  canConfigureModeration: boolean;
  canModeratePosts: boolean;
};
export type Member = {
  userId: string;
  name: string;
  bio: string;
  avatar: string | null;
  viewerFollows: boolean;
  publicProfile?: boolean;
  isMine?: boolean;
  followers?: number;
  following?: number;
  reviewCount?: number;
  movieCount?: number;
  collectionCount?: number;
};
export type SocialPost = {
  id: string;
  body: string;
  photos: string[];
  visibility: "private" | "public";
  status: "active" | "removed" | "moderated";
  createdAt: string;
  updatedAt: string;
  removedAt: string | null;
  isMine: boolean;
  authorName: string;
  authorProfileId: string | null;
  avatar: string | null;
  likeCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
};
export type PostScope =
  | "public"
  | "following"
  | "mine"
  | "saved"
  | "member"
  | "trash"
  | "detail";
export type SocialComment = {
  id: string;
  name: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  authorProfileId: string | null;
};
export type CommunityNotification = {
  id: string;
  kind:
    | "follow"
    | "review_like"
    | "review_comment"
    | "post_like"
    | "post_comment";
  actorName: string;
  actorProfileId: string | null;
  reviewId: string | null;
  postId: string | null;
  createdAt: string;
  read: boolean;
};
export type PostReport = {
  id: string;
  postId: string;
  reason: string;
  detail: string;
  createdAt: string;
  body: string;
};
export type MemberContent = {
  reviews: {
    id: string;
    title: string;
    mode: string;
    rating: number | null;
    watchedAt: string;
    posterPath: string | null;
  }[];
  collections: { id: string; title: string }[];
};
const messages: Record<string, string> = {
  authentication_required: "실제 계정으로 로그인해 주세요.",
  profile_not_found: "공개 프로필을 찾을 수 없어요.",
  invalid_follow: "본인은 팔로우할 수 없어요.",
  follow_limit: "팔로잉은 최대 2,000명까지 가능해요.",
  post_not_found: "게시물이 비공개·삭제되었거나 접근할 수 없어요.",
  invalid_post: "본문 1~2,000자와 사진 최대 5장을 확인해 주세요.",
  invalid_owned_photo: "본인 계정에 올린 사진만 사용할 수 있어요.",
  post_daily_limit: "무료 베타에서는 하루 10개까지 작성할 수 있어요.",
  post_burst_limit: "게시 후 20초 뒤에 새 글을 작성해 주세요.",
  invalid_comment: "댓글을 1~500자로 입력해 주세요.",
  comment_daily_limit: "댓글은 하루 50개까지 작성할 수 있어요.",
  comment_burst_limit: "댓글은 1분에 5개까지 작성할 수 있어요.",
  comment_not_found: "본인의 댓글만 삭제할 수 있어요.",
  admin_required: "일상 피드 신고 관리 권한이 필요해요.",
  report_not_found: "이미 처리된 신고예요.",
};
export async function socialRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
): Promise<T> {
  if (!supabase) throw new Error(messages.authentication_required);
  const { data, error } = await supabase.rpc(name, args);
  if (error)
    throw new Error(
      messages[error.message] ??
        "요청하지 못했어요. 로그인·네트워크를 확인한 뒤 다시 시도해 주세요.",
    );
  return data as T;
}
export const getCommunityState = () =>
  socialRpc<CommunityState>("get_my_community_state");
export const setPublicProfile = (enabled: boolean) =>
  socialRpc<void>("set_my_public_profile", { p_public: enabled });
export const getPublicMember = (id: string) =>
  socialRpc<Member | null>("get_public_member", { p_user: id });
export const listPublicMembers = (query = "", offset = 0) =>
  socialRpc<Member[]>("list_public_members", {
    p_query: query,
    p_offset: offset,
  });
export const followMember = (id: string, follow: boolean) =>
  socialRpc<void>("set_member_follow", { p_target: id, p_follow: follow });
export const listConnections = (kind: "followers" | "following", offset = 0) =>
  socialRpc<Member[]>("list_my_connections", {
    p_kind: kind,
    p_offset: offset,
  });
export const listPosts = (
  scope: PostScope,
  offset = 0,
  userId: string | null = null,
  postId: string | null = null,
) =>
  socialRpc<SocialPost[]>("list_social_posts", {
    p_scope: scope,
    p_offset: offset,
    p_user: userId,
    p_post: postId,
  });
export const savePost = (
  id: string | null,
  body: string,
  photos: string[],
  visibility: "private" | "public",
) =>
  socialRpc<string>("save_social_post", {
    p_id: id,
    p_body: body,
    p_photos: photos,
    p_visibility: visibility,
  });
export const removePost = (id: string, removed: boolean) =>
  socialRpc<void>("set_social_post_removed", { p_id: id, p_removed: removed });
export const reactToPost = (
  id: string,
  kind: "like" | "save",
  active: boolean,
) =>
  socialRpc<void>("set_social_post_reaction", {
    p_post: id,
    p_kind: kind,
    p_active: active,
  });
export const listPostComments = (id: string, offset = 0) =>
  socialRpc<SocialComment[]>("list_social_post_comments", {
    p_post: id,
    p_offset: offset,
  });
export const addPostComment = (id: string, body: string) =>
  socialRpc<string>("add_social_post_comment", { p_post: id, p_body: body });
export const removePostComment = (id: string) =>
  socialRpc<void>("remove_social_post_comment", { p_id: id });
export const reportPost = (id: string, reason: string, detail = "") =>
  socialRpc<void>("report_social_post", {
    p_post: id,
    p_reason: reason,
    p_detail: detail,
  });
export const listNotifications = (offset = 0) =>
  socialRpc<CommunityNotification[]>("list_my_notifications", {
    p_offset: offset,
  });
export const markNotificationsRead = (id: string | null = null) =>
  socialRpc<void>("mark_my_notifications_read", { p_id: id });
export const getMemberContent = (id: string) =>
  socialRpc<MemberContent>("list_member_public_content", { p_user: id });
export const listPostReports = () =>
  socialRpc<PostReport[]>("list_post_reports");
export const setPostModeration = (enabled: boolean) =>
  socialRpc<void>("set_my_post_moderation", { p_enabled: enabled });
export const moderatePostReport = (id: string, hide: boolean) =>
  socialRpc<void>("moderate_post_report", { p_report: id, p_hide: hide });

export function safeCommunityPath(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^\/(review|post|people)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : undefined;
}
// A static 200 entry keeps shared links independent of build-time dynamic IDs.
export function publicCommunityUrl(path:string):string{
  const safe=safeCommunityPath(path);
  return safe?`https://flick-film-journal--beta.expo.app/?returnTo=${encodeURIComponent(safe)}`:'https://flick-film-journal--beta.expo.app/welcome';
}
export function notificationPath(n: CommunityNotification): string | undefined {
  return safeCommunityPath(
    n.postId
      ? `/post/${n.postId}`
      : n.reviewId
        ? `/review/${n.reviewId}`
        : n.actorProfileId
          ? `/people/${n.actorProfileId}`
          : undefined,
  );
}
export function postIssue(
  body: string,
  photos: readonly string[],
): string | null {
  if (!body.trim()) return "본문을 입력해야 합니다.";
  if (body.trim().length > 2000)
    return "본문은 2,000자 이내로 입력해야 합니다.";
  if (photos.length > 5) return "사진은 최대 5장까지 추가할 수 있어요.";
  return null;
}
export function mergeById<T extends { id: string }>(old: T[], next: T[]): T[] {
  return [
    ...new Map([...old, ...next].map((value) => [value.id, value])).values(),
  ];
}
