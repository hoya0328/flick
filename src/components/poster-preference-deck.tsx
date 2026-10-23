import { type Href, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Animated, Image, Platform, PanResponder, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';
import { HomeIcon, homeFont, homeTheme } from '@/components/home-ui';
import { PosterArt } from '@/components/poster-art';
import { homeAssets } from '@/features/home/design-assets';
import type { Movie } from '@/features/discovery/movies';

type PosterPreferenceDeckProps = { movies: Movie[]; onLike: (movie: Movie) => void };

export function PosterPreferenceDeck({ movies, onLike }: PosterPreferenceDeckProps) {
  const [index, setIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [position] = useState(() => new Animated.ValueXY());
  const movie = movies[index % Math.max(movies.length, 1)];
  const openMovie = () => {
    if (movie) router.push(`/movie/${movie.id}` as Href);
    else router.push({ pathname: '/search', params: { query: '이터널 선샤인' } });
  };

  const decide = useCallback((liked: boolean) => {
    if (animating) return;
    if (!movie) {
      router.push({ pathname: '/search', params: { query: '이터널 선샤인' } });
      return;
    }
    if (liked) onLike(movie);
    setMenuOpen(false);
    setAnimating(true);
    Animated.timing(position, { duration: 160, toValue: { x: liked ? 420 : -420, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start(() => {
      position.setValue({ x: 0, y: 0 });
      setIndex((current) => current + 1);
      setAnimating(false);
    });
  }, [animating, movie, onLike, position]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => !animating && Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4,
    onPanResponderMove: Animated.event([null, { dx: position.x }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      if (Math.abs(gesture.dx) > 70) decide(gesture.dx > 0);
      else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start();
    },
    onPanResponderTerminate: () => { Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: Platform.OS !== 'web' }).start(); },
  }), [animating, decide, position]);

  const rotate = position.x.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-7deg', '0deg', '7deg'] });

  return <View accessibilityLabel="영화 포스터 추천. 왼쪽으로 넘기고 오른쪽으로 보고 싶어요에 저장할 수 있습니다." style={styles.section}>
    <View style={styles.backCard} />
    <Animated.View {...panResponder.panHandlers} style={[styles.posterWrap, { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={movie ? `${movie.title} 영화 상세 보기` : '이터널 선샤인 디자인 예시, 영화 검색'} onPress={openMovie} style={styles.artwork}>
        {movie ? <PosterArt fullBleed movie={movie} style={styles.poster} /> : <Image accessibilityLabel="이터널 선샤인 디자인 예시 포스터" resizeMode="cover" source={homeAssets.hero} style={styles.poster} />}
        <View style={[styles.shade, Platform.OS === 'web' && { backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,.9), transparent 38%)' } as ViewStyle]} />
      </Pressable>
      {!movie ? <Text style={styles.preview}>디자인 예시</Text> : null}
      <View style={styles.bottom}>
        <Pressable accessibilityRole="button" accessibilityLabel="다음 영화로 건너뛰기" disabled={animating} hitSlop={10} onPress={() => decide(false)} style={styles.skip}><Text style={styles.skipText}>건너뛰기</Text></Pressable>
        <Pressable accessibilityLabel="영화 상세 및 보고 싶어요 메뉴" accessibilityRole="button" hitSlop={10} onPress={() => setMenuOpen((current) => !current)} style={styles.more}><HomeIcon name="more" width={24} height={6} /></Pressable>
      </View>
      {menuOpen ? <View style={styles.menu}>
        <Text numberOfLines={2} style={styles.menuTitle}>{movie?.title ?? '이터널 선샤인 · 디자인 예시'}</Text>
        <Button label="영화 상세 보기" onPress={openMovie} variant="secondary" />
        {movie ? <Button label="보고 싶어요에 저장" onPress={() => decide(true)} /> : null}
        <Button label="닫기" onPress={() => setMenuOpen(false)} variant="ghost" />
      </View> : null}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  section: { marginLeft: 21, marginRight: 13, marginTop: 29, paddingRight: 8 },
  backCard: { backgroundColor: homeTheme.accent, position: 'absolute', right: 0, width: '90%', top: '6.5%', height: '87.4%', borderRadius: 20 },
  posterWrap: { position: 'relative', aspectRatio: 360 / 557.132, width: '100%' },
  artwork: { flex: 1, overflow: 'hidden', borderRadius: 20 },
  poster: { borderRadius: 20, height: '100%', width: '100%', maxHeight: undefined, aspectRatio: undefined, padding: 0 },
  shade: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, pointerEvents: 'none' },
  bottom: { position: 'absolute', bottom: 9, left: 10, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { borderColor: '#8A8A8A', borderWidth: 1, borderRadius: 20, minHeight: 24, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: '#D0D0D0', fontSize: 12, lineHeight: 17, fontFamily: homeFont },
  more: { minHeight: 32, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  preview: { position: 'absolute', top: 12, left: 12, color: '#FFFFFF', backgroundColor: '#00000080', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10 },
  menu: { position: 'absolute', bottom: 50, left: 14, right: 14, borderRadius: 16, padding: 16, backgroundColor: '#FFFFFF', gap: 8 },
  menuTitle: { color: homeTheme.ink, fontSize: 16, fontWeight: '700', marginBottom: 4 },
});
