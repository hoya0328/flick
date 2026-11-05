import { type Href, router } from 'expo-router';
import { type PropsWithChildren, type ReactNode, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DesignVector, type DesignVectorName } from '@/components/design-vector';
import { homeFont, HomePicture, HomeRail } from '@/components/home-ui';
import { useRecordingLauncher } from '../reviews/recording-launcher';
import type { Movie } from './movies';
import { exploreReason, movieTags, ratingFive, type ExploreFilters } from './explore-model';

export const exploreTheme = { accent: '#F8233C', text: '#0A0A0A', muted: '#6A7282', border: '#E5E7EB', pink: '#FFF5F6' };
const subscribe = () => () => {}, client = () => true, server = () => false;
export function useExploreWidth() {
  const { width } = useWindowDimensions();
  return Math.min(useSyncExternalStore(subscribe, client, server) ? width : 402, 402);
}
export function ExploreFrame({ children, standalone = false }: PropsWithChildren<{ standalone?: boolean }>) {
  return <SafeAreaView edges={['left', 'right']} style={ui.outer}><View style={ui.frame}>{children}{standalone ? <ExploreBottomNav /> : null}</View></SafeAreaView>;
}
export function ExploreBottomNav() {
  const launch = useRecordingLauncher(), width = useExploreWidth();
  const items: { label: string; icon: DesignVectorName; path: Href; shift: number }[] = [{ label: '홈', icon: 'exploreNavHome', path: '/(tabs)', shift: .0202 }, { label: '탐색', icon: 'exploreNavSearch', path: '/search', shift: -.0107 }, { label: '피드', icon: 'exploreNavFeed', path: '/feed', shift: .0048 }, { label: '마이', icon: 'exploreNavProfile', path: '/profile', shift: -.0261 }];
  return <View style={ui.nav}>
    {items.slice(0, 2).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: item.label === '탐색' }} onPress={() => router.replace(item.path)} style={[ui.navItem, { transform: [{ translateX: width * item.shift }] }]}><DesignVector name={item.icon} width={22} height={22} /><Text style={[ui.navLabel, item.label === '탐색' && { color: exploreTheme.accent }]}>{item.label}</Text></Pressable>)}
    <Pressable accessibilityRole="button" accessibilityLabel="새 감상 기록 작성" onPress={() => launch()} style={ui.navItem}><View style={ui.record}><DesignVector name="recordCircle" width={76.8} height={76.8} style={StyleSheet.absoluteFill} /><DesignVector name="recordSymbol" width={40} height={40} /></View></Pressable>
    {items.slice(2).map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.replace(item.path)} style={[ui.navItem, { transform: [{ translateX: width * item.shift }] }]}><DesignVector name={item.icon} width={22} height={22} /><Text style={ui.navLabel}>{item.label}</Text></Pressable>)}
  </View>;
}
export function ExploreButton({ label, onPress, secondary = false, disabled = false, busy = false, icon }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean; icon?: DesignVectorName }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={[ui.button, secondary && ui.secondary, (disabled || busy) && { opacity: .55 }]}>{busy ? <ActivityIndicator color={secondary ? exploreTheme.accent : '#FFFFFF'} /> : icon ? <DesignVector name={icon} width={14.6739} /> : null}<Text style={[ui.buttonText, secondary && { color: exploreTheme.text }]}>{label}</Text></Pressable>;
}
export function ExploreMessage({ title, children, onRetry }: PropsWithChildren<{ title: string; onRetry?: () => void }>) {
  return <View style={ui.message}><Text accessibilityRole="header" style={ui.title}>{title}</Text><Text style={ui.body}>{children}</Text>{onRetry ? <ExploreButton label="다시 불러오기" secondary onPress={onRetry} /> : null}</View>;
}
export function ExploreSection({ title, children, onMore, style, caption, headingSize = 20 }: PropsWithChildren<{ title: string; onMore?: () => void; style?: import('react-native').StyleProp<import('react-native').ViewStyle>; caption?: string; headingSize?: number }>) {
  return <View style={[ui.section, style]}><View style={ui.sectionHeader}><Text accessibilityRole="header" style={[ui.heading, { fontSize: headingSize }]}>{title}</Text>{onMore ? <Pressable accessibilityRole="button" accessibilityLabel={`${title} 더보기`} onPress={onMore} hitSlop={10} style={ui.more}><DesignVector name="exploreMore" width={9.41421} /></Pressable> : null}</View>{caption ? <Text style={ui.caption}>{caption}</Text> : null}{children}</View>;
}
export function ExploreChips({ values, active, onPress, small = false }: { values: readonly string[]; active?: string; onPress?: (value: string) => void; small?: boolean }) {
  return <View style={[ui.chips, small && { gap: 4 }]}>{values.map((value, index) => onPress ? <Pressable accessibilityRole="button" accessibilityState={{ selected: active === value }} key={`${value}-${index}`} onPress={() => onPress(value)} style={[ui.chip, small && ui.smallChip, active === value && ui.activeChip]}><Text style={[ui.chipText, small && ui.smallChipText, active === value && { color: '#FFFFFF' }]}>{value}</Text></Pressable> : <View key={`${value}-${index}`} style={[ui.chip, small && ui.smallChip]}><Text style={[ui.chipText, small && ui.smallChipText]}>{value}</Text></View>)}</View>;
}
export function ExplorePoster({ movie, width, height, radius = 20 }: { movie: Movie; width: number; height: number; radius?: number }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  return movie.posterPath && failedPath !== movie.posterPath ? <Image source={{ uri: `https://image.tmdb.org/t/p/w500${movie.posterPath}` }} accessibilityLabel={`${movie.title} 포스터`} resizeMode="cover" onError={() => setFailedPath(movie.posterPath)} style={{ width, height, borderRadius: radius, backgroundColor: '#E5E7EB' }} /> : <View accessibilityLabel={`${movie.title} 포스터 정보 없음`} style={{ width, height, borderRadius: radius, backgroundColor: '#2C2733', padding: 9, justifyContent: 'space-between' }}><Text numberOfLines={3} style={{ ...ui.title, color: '#FFFFFF', fontSize: Math.min(width / 6, 17) }}>{movie.title}</Text><Text style={{ ...ui.small, color: '#FFFFFFB0' }}>FLICK</Text></View>;
}
export function MovieRating({ movie, light = false }: { movie: Movie; light?: boolean }) {
  return <View accessibilityLabel={`TMDB 평점 ${ratingFive(movie)}, 5점 환산`} style={ui.rating}><DesignVector name={light ? 'exploreStarWhite' : 'exploreStar'} width={15} /><Text style={[ui.ratingText, light && { color: '#FFFFFF' }]}>{ratingFive(movie)}</Text></View>;
}
export const openExploreMovie = (movie: Movie) => router.push({ pathname: '/movie/[id]', params: { id: movie.id } });
export function ExploreMovieRow({ movie, ids, compact = false }: { movie: Movie; ids: string[]; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${movie.title} 영화 상세 보기`} onPress={() => openExploreMovie(movie)} style={[ui.movieRow, compact && ui.compactRow]}>
    <ExplorePoster movie={movie} width={compact ? 60 : 70} height={compact ? 85 : 102} radius={10} />
    <View style={{ flex: 1, gap: compact ? 5 : 7, minWidth: 0 }}><View style={ui.row}><Text numberOfLines={1} style={[ui.title, { flex: 1 }]}>{movie.title}</Text>{!compact ? <MovieRating movie={movie} /> : null}</View>
      {!compact ? <Text style={ui.small} numberOfLines={1}>{movie.details?.directorNames.join(' · ') || movie.genres.slice(0, 2).join(' · ')} · {movie.releaseDate?.slice(0, 4) || '연도 미상'}</Text> : null}
      {!compact ? <Text numberOfLines={2} style={[ui.body, { fontSize: 13, lineHeight: 19.5 }]}>{exploreReason(movie, ids)}</Text> : null}
      <ExploreChips values={movieTags(movie).slice(0, compact ? 4 : 5)} small />{compact ? <MovieRating movie={movie} /> : null}
    </View>
  </Pressable>;
}
export function ExploreMovieRail({ movies, ids }: { movies: Movie[]; ids: string[] }) {
  return <HomeRail label="추천 영화, 가로로 넘겨 보기">{movies.map(movie => <Pressable key={movie.id} accessibilityRole="button" accessibilityLabel={`${movie.title} 영화 상세 보기`} onPress={() => openExploreMovie(movie)} style={{ width: 140, gap: 6 }}><ExplorePoster movie={movie} width={140} height={200} /><Text numberOfLines={1} style={ui.title}>{movie.title}</Text><MovieRating movie={movie} /><Text numberOfLines={2} style={[ui.body, { fontSize: 12, lineHeight: 18, minHeight: 36 }]}>{exploreReason(movie, ids)}</Text><ExploreChips values={movieTags(movie).slice(0, 2)} small /></Pressable>)}</HomeRail>;
}
export function ExploreDialog({ title, children, onClose, footer }: PropsWithChildren<{ title: string; onClose: () => void; footer?: ReactNode }>) {
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={ui.scrim}><Pressable accessibilityLabel="창 닫기" accessibilityRole="button" onPress={onClose} style={StyleSheet.absoluteFill} /><View accessibilityViewIsModal style={ui.dialog}><View style={ui.row}><Text accessibilityRole="header" style={[ui.heading, { flex: 1 }]}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="창 닫기" onPress={onClose} style={{ padding: 8 }}><DesignVector name="cancel" width={18} /></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>{children}</ScrollView>{footer ?? <ExploreButton label="닫기" secondary onPress={onClose} />}</View></View></Modal>;
}
export function ExploreFilterDialog({ filters, genres, onApply, onClose }: { filters: ExploreFilters; genres: string[]; onApply: (filters: ExploreFilters) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(filters);
  return <ExploreDialog title="영화 필터" onClose={onClose} footer={<ExploreButton label="필터 적용" onPress={() => { onApply(draft); onClose(); }} />}><View style={{ gap: 18, paddingVertical: 15 }}><Text style={ui.title}>정렬</Text><ExploreChips values={['추천순', '평점순', '최신순']} active={{ recommend: '추천순', rating: '평점순', recent: '최신순' }[draft.sort]} onPress={value => setDraft({ ...draft, sort: value === '추천순' ? 'recommend' : value === '평점순' ? 'rating' : 'recent' })} /><Text style={ui.title}>장르</Text><ExploreChips values={['전체', ...genres]} active={draft.genre || '전체'} onPress={value => setDraft({ ...draft, genre: value === '전체' ? '' : value })} /><Text style={ui.title}>TMDB 평점 · 5점 환산</Text><ExploreChips values={['모든 평점', '4.0 이상']} active={draft.rating === 'all' ? '모든 평점' : '4.0 이상'} onPress={value => setDraft({ ...draft, rating: value === '모든 평점' ? 'all' : '4' })} /></View></ExploreDialog>;
}
export { HomePicture };
export const ui = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center' }, frame: { flex: 1, width: '100%', maxWidth: 402, backgroundColor: '#FFFFFF' },
  section: { marginTop: 40, gap: 20 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 21, minHeight: 24 },
  heading: { fontFamily: homeFont, fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -.2, color: '#000000' },
  more: { marginLeft: 'auto', width: 36, minHeight: 24, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontFamily: homeFont, fontSize: 16, lineHeight: 24, fontWeight: '600', color: '#0A0A0A' },
  body: { fontFamily: homeFont, fontSize: 14, lineHeight: 22.75, color: '#364153' },
  small: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: '#6A7282' },
  caption: { fontFamily: homeFont, fontSize: 13, lineHeight: 19.5, color: '#6A7282', paddingHorizontal: 21, marginTop: -12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 34, paddingHorizontal: 17, paddingVertical: 7, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 20, justifyContent: 'center' },
  chipText: { fontFamily: homeFont, fontSize: 15, lineHeight: 19, fontWeight: '500', color: '#000000' },
  smallChip: { minHeight: 24, borderWidth: 0, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: '#F3F4F6' }, smallChipText: { fontSize: 11, lineHeight: 16.5, fontWeight: '400', color: '#6A7282' }, activeChip: { backgroundColor: '#F8233C', borderColor: '#F8233C' },
  button: { minHeight: 53, borderRadius: 50, backgroundColor: '#F8233C', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, secondary: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1 },
  buttonText: { fontFamily: homeFont, fontSize: 17, lineHeight: 26, fontWeight: '600', color: '#FFFFFF' },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 5 }, ratingText: { fontFamily: homeFont, fontSize: 14, lineHeight: 21, fontWeight: '500', color: '#0A0A0A' },
  movieRow: { flexDirection: 'row', gap: 20, minHeight: 144, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }, compactRow: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 20, padding: 12, gap: 19, minHeight: 109 },
  message: { marginHorizontal: 21, borderRadius: 20, padding: 17, backgroundColor: '#F9FAFB', gap: 10 },
  nav: { height: 89, flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 10, paddingTop: 14, paddingBottom: 24 }, navItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 3 }, navLabel: { fontFamily: homeFont, fontSize: 9.5, color: '#99A1AF', lineHeight: 14 }, record: { position: 'absolute', top: -31.2, width: 76.8, height: 76.8, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', alignItems: 'center', padding: 18 }, dialog: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, width: '100%', maxWidth: 390, maxHeight: '88%', gap: 16 },
});
