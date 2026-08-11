import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { type PublicReviewCard as ReviewCard } from '@/features/community/community-service';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type PublicReviewCardProps = {
  review: ReviewCard;
  busy?: boolean;
  onLike: (review: ReviewCard) => void;
  onSave: (review: ReviewCard) => void;
};

export function PublicReviewCard({ review, busy = false, onLike, onSave }: PublicReviewCardProps) {
  const core = review.mode === 'core';
  return (
    <View style={[styles.card, core && styles.coreCard]}>
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, core && styles.coreBadge]}>{core ? 'CORE MAGAZINE' : 'LIGHT REVIEW'}</Text>
        <Text style={styles.author}>{review.authorDisplayName}</Text>
      </View>
      <Pressable
        accessibilityHint="공개 감상 기록을 엽니다"
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/review/[id]', params: { id: review.reviewId } })}
        style={({ pressed }) => pressed && styles.pressed}>
        <Text numberOfLines={2} style={core ? styles.coreTitle : styles.title}>{review.movieTitle}</Text>
        <Text style={styles.meta}>{review.watchedAt}{review.rating ? ` · ★ ${review.rating}` : ''}</Text>
        {review.oneLine ? <Text numberOfLines={core ? 3 : 2} style={core ? styles.coreQuote : styles.quote}>“{review.oneLine}”</Text> : null}
        <Text numberOfLines={core ? 5 : 3} style={styles.excerpt}>{review.spoiler ? '스포일러가 포함된 기록입니다. 상세 화면에서 확인해 주세요.' : review.bodyExcerpt || '질문과 감정 태그로 남긴 감상 기록이에요.'}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Button disabled={busy} label={`공감 ${review.likeCount}`} onPress={() => onLike(review)} style={styles.action} variant={review.viewerLiked ? 'primary' : 'secondary'} />
        {core ? <Button disabled={busy} label={`저장 ${review.saveCount}`} onPress={() => onSave(review)} style={styles.action} variant="secondary" /> : null}
        <Button label={`댓글 ${review.commentCount}`} onPress={() => router.push({ pathname: '/review/[id]', params: { id: review.reviewId } })} style={styles.action} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  coreCard: { backgroundColor: '#202127', borderColor: '#202127', paddingVertical: spacing.xxl },
  badgeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  badge: { ...typography.caption, color: colors.primary, fontWeight: '800', letterSpacing: 0.8 },
  coreBadge: { color: '#FF9DAA' },
  author: { ...typography.caption, color: colors.textMuted },
  title: { ...typography.heading, color: colors.text, marginBottom: spacing.xs },
  coreTitle: { ...typography.title, color: colors.surface, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted },
  quote: { ...typography.body, color: colors.text, fontWeight: '700', marginTop: spacing.md },
  coreQuote: { fontSize: 21, fontWeight: '800', lineHeight: 30, color: colors.surface, marginTop: spacing.lg },
  excerpt: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  pressed: { opacity: 0.72 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { flexGrow: 1, minHeight: 42, paddingHorizontal: spacing.md },
});
