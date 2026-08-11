import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { LoadingScreen } from '@/components/loading-screen';
import { Screen } from '@/components/screen';
import { StateNotice } from '@/components/state-notice';
import {
  deleteAdminReview,
  getMyAdminAccess,
  listAdminAuditEvents,
  listAdminReviewReports,
  listAdminReviews,
  listAdminUsers,
  makeAdminReviewPrivate,
  resolveAdminReviewReport,
  setMyAdminPermissions,
  type AdminAccess,
  type AdminAuditEvent,
  type AdminReview,
  type AdminReviewReport,
  type AdminUser,
} from '@/features/admin/admin-service';
import { useSession } from '@/features/session/session-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function formatDate(value: string | null) {
  if (!value) return '없음';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const auditLabels: Record<string, string> = {
  permissions_updated: '권한 변경',
  users_viewed: '사용자 목록 조회',
  reviews_viewed: '기록 목록 조회',
  review_made_private: '공개 기록 비공개 전환',
  review_deleted: '기록 삭제',
  review_report_dismissed: '신고 기각',
  review_report_made_private: '신고 기록 비공개 전환',
};

const reportLabels: Record<string, string> = {
  spoiler: '스포일러 표시 누락',
  harassment: '괴롭힘·혐오 표현',
  personal_info: '개인정보 노출',
  copyright: '저작권 문제',
  other: '기타',
};

export default function AdminScreen() {
  const { mode, status } = useSession();
  const [access, setAccess] = useState<AdminAccess | null | undefined>(undefined);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reports, setReports] = useState<AdminReviewReport[]>([]);
  const [events, setEvents] = useState<AdminAuditEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ title: string; message: string; tone: 'success' | 'danger' | 'warning' } | null>(null);

  const loadConsole = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const nextAccess = await getMyAdminAccess();
      setAccess(nextAccess);
      if (!nextAccess) return;
      const [nextUsers, nextReviews, nextReports, nextEvents] = await Promise.all([
        nextAccess.canViewUsers ? listAdminUsers() : Promise.resolve([]),
        nextAccess.canViewReviews ? listAdminReviews() : Promise.resolve([]),
        nextAccess.canModerateReviews ? listAdminReviewReports() : Promise.resolve([]),
        listAdminAuditEvents(),
      ]);
      setUsers(nextUsers);
      setReviews(nextReviews);
      setReports(nextReports);
      setEvents(nextEvents);
    } catch (caught) {
      setNotice({ title: '관리자 정보를 불러오지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'ready' && mode === 'supabase') {
      void Promise.resolve().then(loadConsole);
    }
  }, [loadConsole, mode, status]);

  const updatePermission = async (key: keyof Pick<AdminAccess, 'canViewUsers' | 'canViewReviews' | 'canModerateReviews' | 'canDeleteReviews'>, value: boolean) => {
    if (!access) return;
    const nextAccess = { ...access, [key]: value };
    setBusy(true);
    setNotice(null);
    try {
      await setMyAdminPermissions(nextAccess);
      setAccess(nextAccess);
      await loadConsole();
      setNotice({ title: '권한 변경 완료', message: '서버 권한과 감사 로그에 즉시 반영했습니다.', tone: 'success' });
    } catch (caught) {
      setNotice({ title: '권한을 변경하지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
      setBusy(false);
    }
  };

  const handlePrivate = async (reviewId: string) => {
    setBusy(true);
    try {
      await makeAdminReviewPrivate(reviewId);
      await loadConsole();
      setNotice({ title: '비공개 전환 완료', message: '해당 기록은 작성자만 볼 수 있습니다.', tone: 'success' });
    } catch (caught) {
      setNotice({ title: '기록을 변경하지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
      setBusy(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setBusy(true);
    try {
      await deleteAdminReview(reviewId);
      setPendingDeleteId(null);
      await loadConsole();
      setNotice({ title: '기록 삭제 완료', message: '관련 질문과 태그도 함께 삭제했으며 감사 로그를 남겼습니다.', tone: 'success' });
    } catch (caught) {
      setNotice({ title: '기록을 삭제하지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
      setBusy(false);
    }
  };

  const handleReport = async (reportId: string, action: 'dismiss' | 'make_private') => {
    setBusy(true);
    try {
      await resolveAdminReviewReport(reportId, action);
      await loadConsole();
      setNotice({
        title: action === 'make_private' ? '신고 기록 비공개 전환 완료' : '신고 기각 완료',
        message: '처리 결과와 관리자 감사 로그를 남겼습니다.',
        tone: 'success',
      });
    } catch (caught) {
      setNotice({ title: '신고를 처리하지 못했어요', message: caught instanceof Error ? caught.message : '잠시 후 다시 시도해 주세요.', tone: 'danger' });
      setBusy(false);
    }
  };

  if (status === 'loading') return <LoadingScreen />;
  if (mode !== 'supabase') return <Redirect href="/welcome" />;
  if (access === undefined) return <LoadingScreen />;

  if (!access) {
    return (
      <Screen eyebrow="FLICK 운영" title="접근할 수 없습니다">
        <StateNotice message="서버에서 super_admin으로 확인된 계정만 접근할 수 있습니다." title="관리자 권한 필요" tone="danger" />
        <Button label="마이 화면으로 돌아가기" onPress={() => router.replace('/profile')} variant="secondary" />
      </Screen>
    );
  }

  return (
    <Screen eyebrow="FLICK 운영" title="Super Admin 콘솔">
      <StateNotice message="초기 상태는 조회 전용입니다. 수정·삭제 권한은 필요한 동안만 켜고 작업 후 다시 끄는 것을 권장합니다." title="서버 검증 관리자" tone="warning" />
      {notice ? <StateNotice {...notice} /> : null}
      <Button label="최신 상태 새로고침" loading={busy} onPress={() => void loadConsole()} variant="secondary" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 운영 권한</Text>
        <PermissionSwitch description="가입 이메일, 닉네임과 접속 시점을 조회합니다." disabled={busy} label="사용자 조회" onValueChange={(value) => void updatePermission('canViewUsers', value)} value={access.canViewUsers} />
        <PermissionSwitch description="비공개 기록을 포함한 최근 기록을 조회합니다." disabled={busy} label="기록 조회" onValueChange={(value) => void updatePermission('canViewReviews', value)} value={access.canViewReviews} />
        <PermissionSwitch description="사용자 글은 고치지 않고 공개 기록을 비공개로 전환합니다." disabled={busy} label="기록 수정(운영 조치)" onValueChange={(value) => void updatePermission('canModerateReviews', value)} value={access.canModerateReviews} />
        <PermissionSwitch description="사용자 기록과 연결된 질문·태그를 영구 삭제합니다." disabled={busy} label="기록 삭제" onValueChange={(value) => void updatePermission('canDeleteReviews', value)} value={access.canDeleteReviews} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>사용자 {users.length}명</Text>
        {!access.canViewUsers ? <Text style={styles.help}>사용자 조회 권한이 꺼져 있습니다.</Text> : users.length ? users.map((user) => (
          <View key={user.userId} style={styles.card}>
            <Text style={styles.cardTitle}>{user.displayName || '닉네임 없음'}</Text>
            <Text style={styles.body}>{user.email}</Text>
            <Text style={styles.help}>가입 {formatDate(user.createdAt)} · 최근 로그인 {formatDate(user.lastSignInAt)}</Text>
          </View>
        )) : <Text style={styles.help}>표시할 사용자가 없습니다.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 기록 {reviews.length}개</Text>
        {!access.canViewReviews ? <Text style={styles.help}>기록 조회 권한이 꺼져 있습니다.</Text> : reviews.length ? reviews.map((review) => (
          <View key={review.reviewId} style={styles.card}>
            <Text style={styles.cardTitle}>{review.movieTitle}</Text>
            <Text style={styles.help}>{review.ownerDisplayName || '닉네임 없음'} · {review.ownerEmail}</Text>
            <Text style={styles.help}>{review.mode.toUpperCase()} · {review.status === 'completed' ? '완료' : '작성 중'} · {review.visibility === 'public' ? '전체 공개' : '나만 보기'} · {review.rating ?? '-'}점</Text>
            {review.oneLine ? <Text style={styles.body}>{review.oneLine}</Text> : null}
            {review.bodyPreview ? <Text numberOfLines={5} style={styles.preview}>{review.bodyPreview}</Text> : null}
            <Text style={styles.help}>최근 변경 {formatDate(review.updatedAt)}</Text>
            {access.canModerateReviews && review.visibility === 'public' ? <Button label="비공개로 전환" onPress={() => void handlePrivate(review.reviewId)} variant="secondary" /> : null}
            {access.canDeleteReviews ? pendingDeleteId === review.reviewId ? (
              <View style={styles.dangerBox}>
                <Text style={styles.dangerText}>이 기록과 연결된 질문·태그를 영구 삭제할까요?</Text>
                <Button label="취소" onPress={() => setPendingDeleteId(null)} variant="ghost" />
                <Button label="영구 삭제 확인" loading={busy} onPress={() => void handleDelete(review.reviewId)} variant="secondary" />
              </View>
            ) : <Button label="기록 삭제" onPress={() => setPendingDeleteId(review.reviewId)} variant="ghost" /> : null}
          </View>
        )) : <Text style={styles.help}>표시할 기록이 없습니다.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>검토할 신고 {reports.length}건</Text>
        {!access.canModerateReviews ? <Text style={styles.help}>기록 수정 권한을 켜면 신고를 검토할 수 있습니다.</Text> : reports.length ? reports.map((report) => (
          <View key={report.reportId} style={styles.card}>
            <Text style={styles.cardTitle}>{report.movieTitle}</Text>
            <Text style={styles.help}>작성자 {report.authorDisplayName} · 신고자 {report.reporterDisplayName}</Text>
            <Text style={styles.body}>{reportLabels[report.reason] ?? report.reason}</Text>
            {report.detail ? <Text style={styles.preview}>{report.detail}</Text> : null}
            <Text style={styles.help}>{formatDate(report.createdAt)}</Text>
            <View style={styles.actionRow}>
              <Button label="신고 기각" onPress={() => void handleReport(report.reportId, 'dismiss')} style={styles.action} variant="ghost" />
              <Button label="기록 비공개 + 처리" onPress={() => void handleReport(report.reportId, 'make_private')} style={styles.action} variant="secondary" />
            </View>
          </View>
        )) : <Text style={styles.help}>현재 검토할 신고가 없습니다.</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>최근 관리자 활동</Text>
        {events.length ? events.map((event) => (
          <View key={event.eventId} style={styles.auditRow}>
            <Text style={styles.body}>{auditLabels[event.action] ?? event.action}</Text>
            <Text style={styles.help}>{formatDate(event.createdAt)}</Text>
          </View>
        )) : <Text style={styles.help}>아직 기록된 관리자 활동이 없습니다.</Text>}
      </View>
      <Button label="마이 화면으로 돌아가기" onPress={() => router.replace('/profile')} variant="ghost" />
    </Screen>
  );
}

function PermissionSwitch({ description, disabled, label, onValueChange, value }: { description: string; disabled: boolean; label: string; onValueChange: (value: boolean) => void; value: boolean }) {
  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionCopy}>
        <Text style={styles.cardTitle}>{label}</Text>
        <Text style={styles.help}>{description}</Text>
      </View>
      <Switch accessibilityLabel={label} disabled={disabled} onValueChange={onValueChange} thumbColor={colors.surface} trackColor={{ false: colors.border, true: colors.primary }} value={value} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { backgroundColor: colors.surface, borderRadius: radii.lg, gap: spacing.md, padding: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text },
  card: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  cardTitle: { ...typography.label, color: colors.text },
  body: { ...typography.body, color: colors.text },
  preview: { ...typography.caption, color: colors.textMuted },
  help: { ...typography.caption, color: colors.textMuted },
  permissionRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', paddingVertical: spacing.sm },
  permissionCopy: { flex: 1, gap: spacing.xs },
  dangerBox: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, gap: spacing.sm, padding: spacing.md },
  dangerText: { ...typography.label, color: colors.danger },
  auditRow: { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingVertical: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
