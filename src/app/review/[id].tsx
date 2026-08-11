import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import {
  addReviewComment,
  getReviewCommunity,
  listReviewComments,
  removeReviewComment,
  reportReview,
  setReviewLiked,
  setReviewSaved,
  trackProductEvent,
  type ReviewComment,
  type ReviewCommunity,
  type ReviewReportReason,
} from '@/features/community/community-service';
import { safeSharedReviewPath, shouldWaitForPublicReview } from '@/features/reviews/review-logic';
import { getPublicReview, type ReviewRecord } from '@/features/reviews/reviews';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

const reportReasons: { id: ReviewReportReason; label: string }[] = [
  { id: 'spoiler', label: '스포일러 표시 누락' },
  { id: 'harassment', label: '괴롭힘·혐오 표현' },
  { id: 'personal_info', label: '개인정보 노출' },
  { id: 'copyright', label: '저작권 문제' },
  { id: 'other', label: '기타' },
];

function shortDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function PublicReviewScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const reviewId = Array.isArray(params.id) ? params.id[0] : params.id;
  const returnTo = safeSharedReviewPath(reviewId ? `/review/${reviewId}` : undefined);
  const { mode, status: sessionStatus } = useSession();
  const [record, setRecord] = useState<ReviewRecord | null>(null);
  const [community, setCommunity] = useState<ReviewCommunity | null>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<ReviewComment | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReviewReportReason | null>(null);
  const [reportDetail, setReportDetail] = useState('');
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const loadCommunity = useCallback(async () => {
    if (!reviewId) return;
    const [nextCommunity, nextComments] = await Promise.all([getReviewCommunity(reviewId), listReviewComments(reviewId)]);
    setCommunity(nextCommunity);
    setComments(nextComments);
  }, [reviewId]);

  useEffect(() => {
    if (sessionStatus !== 'ready' || mode !== 'supabase' || !reviewId || !returnTo) return;
    let active = true;
    void getPublicReview(reviewId)
      .then(async (result) => {
        if (!active) return;
        setRecord(result);
        if (!result) { setStatus('missing'); return; }
        await loadCommunity();
        if (!active) return;
        setStatus('ready');
        void trackProductEvent('public_review_view', 'review', reviewId, { surface: 'public_review', mode: result.mode });
      })
      .catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [loadCommunity, mode, returnTo, reviewId, sessionStatus]);

  const questionRows = useMemo(() => {
    if (!record) return [];
    return record.questions.map((question) => {
      const answer = record.answers[question.key]?.trim();
      const selected = new Set(record.questionTags[question.key] ?? []);
      const tags = question.options.filter((option) => selected.has(option.id)).map((option) => option.label);
      return { key: question.key, question: question.text, response: answer || tags.join(' · ') };
    }).filter((row) => row.response);
  }, [record]);

  async function toggleLike() {
    if (!reviewId || !community) return;
    const next = !community.viewerLiked;
    setBusy(true);
    setNotice(null);
    try {
      await setReviewLiked(reviewId, next);
      await loadCommunity();
      if (next) void trackProductEvent('review_like', 'review', reviewId, { surface: 'public_review', mode: record?.mode });
    } catch (error) {
      setNotice({ title: '공감을 반영하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  async function toggleSave() {
    if (!reviewId || !community) return;
    const next = !community.viewerSaved;
    setBusy(true);
    setNotice(null);
    try {
      await setReviewSaved(reviewId, next);
      await loadCommunity();
      if (next) void trackProductEvent('review_save', 'review', reviewId, { surface: 'public_review', mode: record?.mode });
    } catch (error) {
      setNotice({ title: '저장을 반영하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  async function submitComment() {
    if (!reviewId || !commentText.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      await addReviewComment(reviewId, commentText, replyTo?.commentId ?? null);
      setCommentText('');
      setReplyTo(null);
      await loadCommunity();
      void trackProductEvent('comment_create', 'review', reviewId, { surface: 'public_review', mode: record?.mode });
      setNotice({ title: '댓글을 남겼어요', message: '작성한 내용은 언제든 직접 삭제할 수 있습니다.', tone: 'success' });
    } catch (error) {
      setNotice({ title: '댓글을 등록하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  async function removeComment(commentId: string) {
    setBusy(true);
    try {
      await removeReviewComment(commentId);
      await loadCommunity();
      setNotice({ title: '댓글을 삭제했어요', message: '답글 흐름을 위해 삭제 표시만 남습니다.', tone: 'success' });
    } catch (error) {
      setNotice({ title: '댓글을 삭제하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  async function submitReport() {
    if (!reviewId || !reportReason) {
      setNotice({ title: '신고 이유를 선택해 주세요', message: '운영자가 확인할 수 있도록 가장 가까운 이유를 골라 주세요.', tone: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await reportReview(reviewId, reportReason, reportDetail);
      setReportOpen(false);
      setReportReason(null);
      setReportDetail('');
      void trackProductEvent('report_submit', 'review', reviewId, { surface: 'public_review' });
      setNotice({ title: '신고가 접수됐어요', message: '관리자 검토 전까지 중복 접수되지 않으며, 필요하면 공개 범위를 조정합니다.', tone: 'success' });
    } catch (error) {
      setNotice({ title: '신고를 접수하지 못했어요', message: error instanceof Error ? error.message : '다시 시도해 주세요.', tone: 'danger' });
    } finally { setBusy(false); }
  }

  if (shouldWaitForPublicReview(sessionStatus, mode, Boolean(returnTo), status)) {
    return <Screen eyebrow="공개 기록" title="감상 기록"><ActivityIndicator color={colors.primary} size="large" /></Screen>;
  }

  if (mode !== 'supabase') {
    return (
      <Screen eyebrow="공개 기록" title="로그인 후 볼 수 있어요">
        <StateNotice message="공개 기록도 Flick 이메일 계정 사용자에게만 읽기를 허용합니다. 작성자 외에는 기록 본문을 수정하거나 삭제할 수 없어요." title="계정 보호" tone="warning" />
        <Button label="이메일로 로그인" onPress={() => router.replace({ pathname: '/welcome', params: returnTo ? { returnTo } : {} })} />
      </Screen>
    );
  }

  if (status === 'error') {
    return <Screen eyebrow="공개 기록" title="기록을 불러오지 못했어요"><StateNotice message="연결을 확인한 뒤 다시 열어 주세요." title="조회 오류" tone="danger" /><Button label="FLICK 홈으로" onPress={() => router.replace('/')} /></Screen>;
  }

  if (status === 'missing' || !record || !community) {
    return <Screen eyebrow="공개 기록" title="볼 수 없는 기록이에요"><StateNotice message="작성자가 비공개로 바꾸거나 삭제했을 수 있습니다. 공개가 완료된 기록만 볼 수 있어요." title="접근할 수 없음" tone="warning" /><Button label="FLICK 홈으로" onPress={() => router.replace('/')} /></Screen>;
  }

  return (
    <Screen eyebrow="공개 기록 · 읽기 전용" title={record.movie.title}>
      <StateNotice message="기록 본문은 작성자만 수정·삭제할 수 있습니다. 다른 사용자는 공감·저장·댓글만 남길 수 있어요." title="안전한 공개 기록" tone="success" />
      {notice ? <StateNotice {...notice} /> : null}
      <View style={styles.summary}>
        <Text style={styles.meta}>{record.watchedAt} · {record.mode === 'light' ? 'Light' : 'Core'}</Text>
        <Text accessibilityLabel={`별점 ${record.rating}점`} style={styles.rating}>★ {record.rating} / 5</Text>
        {record.oneLine ? <Text style={styles.oneLine}>“{record.oneLine}”</Text> : null}
        <View style={styles.actionRow}>
          <Button disabled={busy} label={`${community.viewerLiked ? '공감 취소' : '공감'} · ${community.likeCount}`} onPress={() => void toggleLike()} style={styles.action} variant={community.viewerLiked ? 'primary' : 'secondary'} />
          <Button disabled={busy} label={`${community.viewerSaved ? '저장 취소' : '저장'} · ${community.saveCount}`} onPress={() => void toggleSave()} style={styles.action} variant="secondary" />
        </View>
      </View>
      {record.spoiler ? <StateNotice message="아래 내용에 영화의 주요 장면이나 결말이 포함될 수 있어요." title="스포일러 주의" tone="warning" /> : null}
      {questionRows.map((row, index) => (
        <View key={row.key} style={styles.section}>
          <Text style={styles.question}>Q{index + 1}. {row.question}</Text>
          <Text style={styles.response}>{row.response}</Text>
        </View>
      ))}
      {record.body ? <View style={styles.section}><Text style={styles.sectionTitle}>자유 감상</Text><Text style={styles.response}>{record.body}</Text></View> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>댓글 {community.commentCount}개</Text>
        {replyTo ? <View style={styles.replyNotice}><Text style={styles.meta}>{replyTo.authorDisplayName}님에게 답글 작성 중</Text><Button label="답글 취소" onPress={() => setReplyTo(null)} variant="ghost" /></View> : null}
        <TextInput accessibilityLabel="댓글 내용" maxLength={500} multiline onChangeText={setCommentText} placeholder="영화와 기록에 대한 생각을 남겨보세요." placeholderTextColor={colors.textMuted} style={styles.input} value={commentText} />
        <Text style={styles.count}>{commentText.length}/500</Text>
        <Button disabled={!commentText.trim() || busy} label={replyTo ? '답글 등록' : '댓글 등록'} onPress={() => void submitComment()} />
        {!comments.length ? <Text style={styles.meta}>첫 댓글을 남겨보세요.</Text> : comments.map((comment) => (
          <View key={comment.commentId} style={[styles.comment, Boolean(comment.parentId) && styles.reply]}>
            <Text style={styles.commentAuthor}>{comment.authorDisplayName} · {shortDate(comment.createdAt)}</Text>
            <Text style={comment.status === 'removed' ? styles.removed : styles.response}>{comment.status === 'removed' ? '삭제된 댓글입니다.' : comment.body}</Text>
            {comment.status === 'visible' ? <View style={styles.commentActions}>{!comment.parentId ? <Button label="답글" onPress={() => setReplyTo(comment)} style={styles.smallAction} variant="ghost" /> : null}{comment.isMine ? <Button label="내 댓글 삭제" onPress={() => void removeComment(comment.commentId)} style={styles.smallAction} variant="ghost" /> : null}</View> : null}
          </View>
        ))}
      </View>

      {community.canReport ? <View style={styles.section}>
        <Button label={reportOpen ? '신고 닫기' : '이 기록 신고하기'} onPress={() => setReportOpen(!reportOpen)} variant="ghost" />
        {reportOpen ? <>
          <Text style={styles.meta}>가장 가까운 신고 이유를 선택해 주세요.</Text>
          <View style={styles.reasonGrid}>{reportReasons.map((reason) => <Pressable accessibilityRole="button" accessibilityState={{ selected: reportReason === reason.id }} key={reason.id} onPress={() => setReportReason(reason.id)} style={[styles.reason, reportReason === reason.id && styles.reasonSelected]}><Text style={[styles.reasonText, reportReason === reason.id && styles.reasonTextSelected]}>{reason.label}</Text></Pressable>)}</View>
          <TextInput accessibilityLabel="신고 상세 내용" maxLength={500} multiline onChangeText={setReportDetail} placeholder="운영자에게 필요한 추가 설명이 있다면 입력해 주세요. 개인정보는 적지 마세요." placeholderTextColor={colors.textMuted} style={styles.input} value={reportDetail} />
          <Button disabled={!reportReason || busy} label="신고 접수" onPress={() => void submitReport()} variant="secondary" />
        </> : null}
      </View> : null}

      <Button label="영화 상세 보기" onPress={() => { void trackProductEvent('movie_detail_open', 'movie', record.movieId, { surface: 'public_review', source: 'review' }); router.push({ pathname: '/movie/[id]', params: { id: record.movieId } }); }} variant="secondary" />
      <Button label="FLICK 홈으로" onPress={() => router.replace('/')} variant="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.xl },
  meta: { ...typography.caption, color: colors.textMuted },
  rating: { ...typography.heading, color: colors.warning },
  oneLine: { ...typography.heading, color: colors.text },
  section: { backgroundColor: colors.surface, borderRadius: radii.md, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  question: { ...typography.label, color: colors.text },
  response: { ...typography.body, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, color: colors.text, minHeight: 104, padding: spacing.md, textAlignVertical: 'top' },
  count: { ...typography.caption, color: colors.textMuted, textAlign: 'right' },
  replyNotice: { alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: radii.md, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
  comment: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingTop: spacing.md },
  reply: { borderLeftColor: colors.primary, borderLeftWidth: 3, marginLeft: spacing.xl, paddingLeft: spacing.md },
  commentAuthor: { ...typography.label, color: colors.text },
  removed: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  commentActions: { flexDirection: 'row', gap: spacing.sm },
  smallAction: { minHeight: 40, paddingHorizontal: spacing.sm },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reason: { borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  reasonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  reasonText: { ...typography.caption, color: colors.textMuted },
  reasonTextSelected: { color: colors.surface, fontWeight: '700' },
});
