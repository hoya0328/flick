import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { HomeIcon, HomePicture, homeFont, homeText, homeTheme } from '@/components/home-ui';
import type { PublicReviewCard } from '@/features/community/community-service';
import type { EditorialCuration } from '@/features/discovery/discovery-insights';
import { homeAssets } from '@/features/home/design-assets';

export const previewMovies = [
  { title: '악마는 프라다를 입는다 2', image: homeAssets.devil, rating: '3.3', tags: ['우아', '완벽'] },
  { title: '햄넷', image: homeAssets.hamnet, rating: '3.7', tags: ['고뇌', '퍼포먼스'] },
  { title: '슈퍼 마리오 갤럭시', image: homeAssets.mario, rating: '3.3', tags: ['우주', '화려한'] },
];

export const previewKeywords = ['몽환적인', '우주', '경이', '사랑', '미장센', 'OST', '위로', '빛바랜', '판타지', 'SF'];

type PreviewHandler = (title: string) => void;
type ReviewProps = { review?: PublicReviewCard; width: number; onPreview: PreviewHandler; busy?: boolean; onLike: (review: PublicReviewCard) => void };

function Author({ name, image, light = false, preview = false }: { name: string; image?: ImageSourcePropType; light?: boolean; preview?: boolean }) {
  return <View style={styles.author}>
    {image ? <Image accessible={false} source={image} style={light ? styles.lightAvatar : styles.avatar} /> : <View style={[styles.avatar, styles.avatarFallback]}><Text style={styles.initial}>{name.slice(0, 1)}</Text></View>}
    <Text numberOfLines={1} style={[styles.authorText, light && styles.authorLight]}>{name}{preview ? ' · 디자인 예시' : ''}</Text>
  </View>;
}

export function HomeReviewCard({ review, width, onPreview, onLike, busy }: ReviewProps) {
  const sample = !review;
  const title = review?.movieTitle ?? '에브리씽 에브리웨어 올앳원스';
  const open = () => review ? router.push({ pathname: '/review/[id]', params: { id: review.reviewId } }) : onPreview(title);
  const tags = ['혼돈', '멀티버스', '허무', '다정함', '가족'];
  return <View style={[styles.review, { width }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${sample ? '디자인 예시' : '공개 리뷰'} 보기`} onPress={open}>
      <View style={styles.cover}>
        <HomePicture source={review?.posterPath ? { uri: `https://image.tmdb.org/t/p/w500${review.posterPath}` } : sample ? homeAssets.lightCover : null} label={title} width={width} height={143} radius={0} />
        <View style={styles.authorOverlay}><Author name={review?.authorDisplayName ?? '솜사탕덕후'} image={sample ? homeAssets.lightAvatar : undefined} light preview={sample} /></View>
      </View>
      <View style={styles.reviewCopy}>
        <Text numberOfLines={1} style={styles.reviewTitle}>{title} ›</Text>
        <Text style={styles.small}>{review ? `${review.watchedAt} · Light 기록` : '다니엘 콴·다니엘 샤이너트 · 2022'}</Text>
        <View style={styles.divider} />
        <View style={styles.rating}><HomeIcon name="star" width={16} /><Text style={styles.small}>{review?.rating?.toFixed(1) ?? (sample ? '4.5' : '평점 없음')}</Text></View>
        <Text numberOfLines={2} style={[homeText.body, styles.reviewBody]}>{review?.spoiler ? '스포일러가 포함된 기록입니다. 상세에서 확인해 주세요.' : review?.bodyExcerpt || review?.oneLine || (sample ? 'B급 쌈마이 코미디의 껍데기를 뒤집어쓴 채 철학적 허무주의를 패버리는 미친 영화. 내 영화 관람 인생에서 가장 위대한 돌멩이를 만났다.' : '질문과 감정 태그로 남긴 감상이에요.')}</Text>
        <View style={styles.tags}>{sample ? tags.map((tag, index) => <View key={tag} style={[styles.tag, { backgroundColor: ['#C02AEE', '#008CFF', '#1E222A', '#F8233C', '#FFAA00'][index] }]}><Text style={styles.tagText}>{tag}</Text></View>) : <View style={[styles.tag, { backgroundColor: homeTheme.accent }]}><Text style={styles.tagText}>Light</Text></View>}</View>
      </View>
    </Pressable>
    <View style={styles.reactions}>
      <Pressable accessibilityLabel={`공감 ${review?.likeCount ?? 0}`} accessibilityRole="button" accessibilityState={{ selected: review?.viewerLiked ?? false }} disabled={busy} onPress={() => review ? onLike(review) : onPreview(title)} style={styles.reaction}><HomeIcon name="heart" width={13} height={12} tint={review?.viewerLiked ? homeTheme.accent : undefined} /><Text style={styles.small}>{review ? review.likeCount : '—'}</Text></Pressable>
      <Pressable accessibilityLabel="리뷰 댓글 보기" accessibilityRole="button" onPress={open} style={styles.reaction}><HomeIcon name="comment" width={12} height={12} /><Text style={styles.small}>{review ? review.commentCount : '—'}</Text></Pressable>
      <View accessibilityLabel="조회수는 집계 준비 중입니다" style={styles.reactionEnd}><HomeIcon name="eye" width={13.4} height={9} /><Text style={styles.small}>—</Text></View>
    </View>
  </View>;
}

export function HomeMagazineCard({ review, alternate = false, onPreview }: { review?: PublicReviewCard; alternate?: boolean; onPreview: PreviewHandler }) {
  const sample = !review;
  const title = review?.oneLine || review?.movieTitle || (alternate ? '헤일메리 프로젝트' : '이별과 만남이 스쳐지나가는 곳, 사랑을 가득 담아.');
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${sample ? '디자인 예시' : '매거진'} 보기`} onPress={() => review ? router.push({ pathname: '/review/[id]', params: { id: review.reviewId } }) : onPreview(title)} style={styles.magazine}>
    <HomePicture source={review?.posterPath ? { uri: `https://image.tmdb.org/t/p/w500${review.posterPath}` } : sample ? alternate ? homeAssets.hailMaryCover : homeAssets.magazineCover : null} label={title} width={311} height={160} />
    <View style={styles.magazineCopy}>
      <Author name={review?.authorDisplayName ?? (alternate ? 'MICHI' : '솜사탕덕후')} image={sample ? alternate ? homeAssets.hailMaryAvatar : homeAssets.magazineAvatar : undefined} preview={sample} />
      <Text numberOfLines={1} style={homeText.title}>{title}</Text>
      <Text numberOfLines={1} style={[homeText.muted, styles.subtitle]}>{review?.spoiler ? '스포일러 포함 · 상세에서 확인' : review?.bodyExcerpt || (alternate ? '홀로 살아갈 수 있는 생명은 없다' : '끊임없는 만남과 이별에 대하여')}</Text>
    </View>
  </Pressable>;
}

const expertExamples = [
  { image: homeAssets.expertDirector, title: '아이들의 목소리가 들려왔다', subtitle: '윤가은 감독 코멘터리', perspective: '🎬 감독의 시선' },
  { image: homeAssets.expertCamera, title: '어둠의 역사를 어떻게 바라볼까', subtitle: '홍경표 촬영감독 코멘터리', perspective: '🎥 촬영의 시선' },
  { image: homeAssets.expertActor, title: '나 행복. 우리 친구. 행성들...', subtitle: '라이언 고슬링 배우 코멘터리', perspective: '🎭 배우의 시선' },
];

export function HomeExpertCard({ curation, exampleIndex = 0, onPreview }: { curation?: EditorialCuration; exampleIndex?: number; onPreview: PreviewHandler }) {
  const example = expertExamples[exampleIndex % expertExamples.length]!;
  const title = curation?.title ?? example.title;
  return <Pressable accessibilityLabel={`${title} ${curation ? '전문가 콘텐츠' : '디자인 예시'} 보기`} accessibilityRole="button" onPress={() => curation ? router.push({ pathname: '/curation/[id]', params: { id: curation.curationId } }) : onPreview(title)} style={styles.expert}>
    <View>
      <HomePicture source={curation ? curation.posterPaths[0] ? { uri: `https://image.tmdb.org/t/p/w500${curation.posterPaths[0]}` } : null : example.image} label={title} width={160} height={160} />
      <View style={styles.perspective}><Text style={styles.perspectiveText}>{curation ? '전문가의 시선' : example.perspective}</Text></View>
    </View>
    <Text numberOfLines={1} style={homeText.title}>{title}</Text>
    <Text numberOfLines={1} style={[homeText.muted, styles.subtitle]}>{curation?.curatorName ?? example.subtitle}</Text>
    {!curation ? <Text style={styles.previewLabel}>디자인 예시 · 원문 준비 중</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  review: { borderRadius: 20, borderWidth: 1, borderColor: '#D9D9D9', overflow: 'hidden', backgroundColor: '#FFFFFF' },
  cover: { height: 143, overflow: 'hidden' },
  authorOverlay: { position: 'absolute', bottom: 12, left: 19, backgroundColor: '#00000066', borderRadius: 12, paddingHorizontal: 5, paddingVertical: 2 },
  author: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 20 },
  avatar: { width: 12.2, height: 12.2, borderRadius: 8 },
  lightAvatar: { width: 18.75, height: 18.75, borderRadius: 10 },
  avatarFallback: { backgroundColor: '#FAD6DC', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#A31025', fontSize: 8, lineHeight: 11 },
  authorText: { color: homeTheme.ink, fontSize: 10, fontFamily: homeFont, maxWidth: 250 },
  authorLight: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  reviewCopy: { paddingHorizontal: 18, paddingTop: 10 },
  reviewTitle: { color: '#1C1C1C', fontSize: 18, fontWeight: '600', lineHeight: 28, fontFamily: homeFont, letterSpacing: -0.6 },
  small: { color: '#7E7E7E', fontSize: 11, lineHeight: 18, fontFamily: homeFont },
  divider: { height: 1, backgroundColor: '#EEEEEE', marginTop: 9, marginBottom: 10 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reviewBody: { height: 40, marginTop: 8 },
  tags: { flexDirection: 'row', gap: 7, marginTop: 16, minHeight: 24, flexWrap: 'wrap' },
  tag: { borderRadius: 18, paddingHorizontal: 9, minHeight: 24, justifyContent: 'center' },
  tagText: { color: '#FFFFFF', fontSize: 11, lineHeight: 16, fontFamily: homeFont },
  reactions: { marginHorizontal: 18, borderTopColor: '#E5E5E5', borderTopWidth: 1, marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36, minWidth: 44 },
  reactionEnd: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 },
  magazine: { width: 311, gap: 5 },
  magazineCopy: { paddingHorizontal: 6, gap: 1 },
  subtitle: { fontSize: 13, lineHeight: 20, letterSpacing: -0.6 },
  expert: { width: 160, gap: 3 },
  perspective: { position: 'absolute', right: 8, top: 8, backgroundColor: homeTheme.accent, borderRadius: 50, paddingHorizontal: 6, height: 18, justifyContent: 'center' },
  perspectiveText: { color: '#FFFFFF', fontSize: 9, fontFamily: homeFont, lineHeight: 14 },
  previewLabel: { color: homeTheme.muted, fontSize: 9, lineHeight: 13 },
});
