import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Href, Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { DesignVector } from '@/components/design-vector';
import { homeFont } from '@/components/home-ui';
import { ExploreButton, ExploreDialog, ExploreFrame } from '@/features/discovery/explore-ui';
import { ProfileAvatar, ProfilePoster } from '@/features/profile/profile-ui';
import { getMyProfileDetails, type ProfileDetails } from '@/features/profile/profile-service';
import { pointDescriptions, ratingBars, recordingInsights, reportShareText, rewatchChoices } from '@/features/reports/report-model';
import { tasteTypes } from '@/features/reports/taste-engine';
import { useTwelveTaste } from '@/features/reports/use-twelve-taste';
import { listReviews, type ReviewRecord } from '@/features/reviews/reviews';
import { todayDate } from '@/features/reviews/review-logic';
import { useRecordingLauncher } from '@/features/reviews/recording-launcher';
import { useSession } from '@/features/session/session-provider';
const red = '#F8233C';
export default function TasteReportRoute() {
  const session = useSession();
  if (session.status === 'loading') return <ExploreFrame><ActivityIndicator color={red} /></ExploreFrame>;
  if (session.mode === 'none' || session.status === 'error') return <Redirect href="/welcome" />;
  if (!session.onboardingComplete) return <Redirect href="/onboarding" />;
  return <Report key={`${session.mode}:${session.email}`} />;
}
function Report() {
  const session = useSession(), mode = session.mode === 'supabase' ? 'supabase' : 'demo', launch = useRecordingLauncher();
  const key = `flick.report.visible.v2.${mode}.${encodeURIComponent(session.email ?? 'demo')}`;
  const [records, setRecords] = useState<ReviewRecord[] | null>(null), [profile, setProfile] = useState<ProfileDetails | null>(null), [visible, setVisible] = useState(true), [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading'), [message, setMessage] = useState(''), [share, setShare] = useState(false);
  const generation = useRef(0), saving = useRef(false);
  const taste = useTwelveTaste(records, mode), report = taste.report;
  const narrative = useMemo(() => recordingInsights(records ?? []), [records]);
  const rewatch = useMemo(() => rewatchChoices(records ?? [], session.selectedKeywords, todayDate())[0], [records, session.selectedKeywords]);
  const bars = ratingBars(report), rated = bars.reduce((sum, item) => sum + item.count, 0), maxKeyword = Math.max(1, ...report.topKeywords.map(item => item.count));
  const name = profile?.displayName ?? session.nickname ?? 'FLICK 사용자';
  const load = useCallback(async () => { const token = ++generation.current; setStatus('loading'); try { const [rows, details, saved] = await Promise.all([listReviews(mode), getMyProfileDetails(mode), AsyncStorage.getItem(key).then(value => value ?? AsyncStorage.getItem('flick.stage5.personalization-enabled'))]); if (token !== generation.current) return; setRecords(rows); setProfile(details); setVisible(saved !== 'false'); setStatus('ready'); setMessage(''); } catch { if (token === generation.current) { setStatus('error'); setMessage('취향 리포트를 불러오지 못했어요. 기존 기록은 변경하지 않았습니다.'); } } }, [key, mode]);
  useFocusEffect(useCallback(() => { void load(); return () => { generation.current++; }; }, [load]));
  async function toggle() { if (saving.current) return; saving.current = true; const token = generation.current; try { await AsyncStorage.setItem(key, String(!visible)); if (token === generation.current) setVisible(!visible); } catch { if (token === generation.current) setMessage('표시 설정을 저장하지 못했어요. 다시 시도해 주세요.'); } finally { saving.current = false; } }
  const shareText = reportShareText(name, report);
  async function shareSummary() { try { await Share.share({ message: shareText, title: 'FLICK 취향 리포트' }); setShare(false); } catch { setMessage('공유 창을 열지 못했어요. 미리보기의 텍스트를 선택해 복사할 수 있습니다.'); } }
  return <ExploreFrame><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 70 }}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="마이페이지로 돌아가기" onPress={() => router.replace('/profile')} hitSlop={10}><DesignVector name="exploreBack" width={12.5663} style={{ transform: [{ rotate: '180deg' }] }} /></Pressable><Text accessibilityRole="header" style={s.headerTitle}>취향 리포트</Text><Pressable accessibilityRole="button" accessibilityLabel="취향 리포트 공유 미리보기" disabled={status !== 'ready'} onPress={() => setShare(true)} hitSlop={10}><DesignVector name="reportShare" width={20.8008} /></Pressable></View>
    {message ? <Text accessibilityRole="alert" style={[s.note, { margin: 21, color: '#B30A23' }]}>{message}</Text> : null}
    {status === 'loading' ? <ActivityIndicator color={red} style={{ margin: 40 }} /> : status === 'error' ? <View style={{ padding: 21 }}><ExploreButton label="다시 불러오기" secondary onPress={() => void load()} /></View> : !visible ? <ReportCard title="취향 결과를 숨겼어요"><Text style={s.body}>기록과 선택값은 지우지 않았어요. 언제든 아래에서 다시 볼 수 있습니다.</Text></ReportCard> : <>
      <View style={s.hero}>
        <Text style={s.heroCount}>{report.totalMovies}편의 영화를 바탕으로 당신의 취향을 분석했어요.</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 19 }}><ProfileAvatar path={profile?.avatarPath ?? null} name={name} size={28} /><Text style={s.heroName}>{name}</Text></View>
        <Text accessibilityRole="header" style={s.heroTitle}>{report.primary ? tasteTypes[report.primary].name : '취향을 발견하는 중'}</Text>
        <Text style={s.heroSummary}>{report.primary ? tasteTypes[report.primary].summary : '서로 다른 영화 3편의 유효한 감상 근거가 필요해요.'}</Text>
        <Text style={s.heroBody}>{report.primary ? tasteTypes[report.primary].description : '영화의 여운을 기록하며 나의 취향을 발견해 보세요.'}</Text>
        <Words words={report.topKeywords.slice(0, 4).map(item => item.label)} white />
        {report.status === 'provisional' ? <Text style={s.heroFoot}>임시 유형</Text> : report.status === 'mixed' ? <Text style={s.heroFoot}>복합 유형</Text> : null}
      </View>
      <ReportCard title="자주 사용한 키워드" right={`${report.totalMovies}편`}>
        {report.topKeywords.length ? report.topKeywords.map(item => <View key={item.label} style={{ gap: 10, marginTop: 16 }}><View style={s.between}><Text style={s.keyword}>{item.label}</Text><Text style={s.small}>{item.count}편</Text></View><View style={s.track}><View style={[s.fill, { width: `${item.count / maxKeyword * 100}%` }]} /></View></View>) : <Text style={[s.body, { marginTop: 16 }]}>선택한 감상 키워드가 아직 없어요.</Text>}
      </ReportCard>
      <ReportCard title="감상 포인트 TOP 3">
        {report.topPoints.length ? report.topPoints.map((item, index) => <View key={item.label} style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}><View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><DesignVector name={index ? 'reportRankOther' : 'reportRankFirst'} width={40} style={StyleSheet.absoluteFill} /><Text style={[s.rank, { color: index ? '#364153' : '#FFFFFF' }]}>{index + 1}</Text></View><View style={{ flex: 1, gap: 4 }}><View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Text style={s.point}>{item.label}</Text><Text style={s.small}>{Math.round(item.percent)}%</Text></View><Text style={s.note}>{pointDescriptions[item.label] ?? '직접 감상 포인트로 선택한 항목이에요.'}</Text></View></View>) : <Text style={[s.body, { marginTop: 16 }]}>Light에서 좋았던 감상 포인트를 선택하면 보여드려요.</Text>}
      </ReportCard>
      <ReportCard title="점수별 키워드">
        <KeywordBox title="높은 별점 · 4점 이상" words={report.highKeywords.map(item => item.label)} /><KeywordBox title="낮은 별점 · 2.5점 이하" words={report.lowKeywords.map(item => item.label)} />
      </ReportCard>
      <ReportCard title="별점 분포">
        <View accessibilityLabel={`별점 분포 ${bars.map(bar => `${bar.label}점 구간 ${bar.count}편`).join(', ')}`} style={s.chart}>{bars.map(bar => <View key={bar.label} style={s.barSlot}><Text style={s.note}>{bar.count}</Text><View style={[s.bar, { height: rated ? Math.max(bar.count ? 4 : 0, bar.percent * 1.48) : 0 }]} /><Text style={s.barLabel}>{bar.label}</Text></View>)}</View>
        <Text style={s.average}>평균 별점 <Text style={{ color: red, fontSize: 20, fontWeight: '700' }}>{report.meanRating ?? '—'}</Text></Text><Text style={[s.note, { textAlign: 'center', marginTop: 8 }]}>{rated}개 평가 · 가장 많이 준 별점 <Text style={{ color: red }}>{report.modalRatings.length ? report.modalRatings.map(value => `★${value}`).join(' · ') : '아직 없어요'}</Text></Text>
      </ReportCard>
      <ReportCard title="가볍게 기록에서 발견한 것"><Text style={[s.body, { marginTop: 16 }]}>{narrative.lightSummary}</Text><View style={{ gap: 10, marginTop: 16 }}>{narrative.lightLines.map((line, index) => <View key={index} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}><View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}><DesignVector name="reportRankSmall" width={20} style={StyleSheet.absoluteFill} /><Text style={{ ...s.note, color: '#FFFFFF', fontWeight: '700' }}>{index + 1}</Text></View><Text style={[s.small, { flex: 1 }]}>{line}</Text></View>)}</View></ReportCard>
      <ReportCard title="집중 리뷰에서 발견한 것"><Text style={[s.body, { marginTop: 16 }]}>{narrative.coreSummary}</Text><View style={{ gap: 10, marginTop: 16 }}>{narrative.coreLines.length ? narrative.coreLines.map(line => <View key={line} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><DesignVector name="reportBullet" width={6} /><Text style={[s.small, { flex: 1 }]}>{line}</Text></View>) : null}</View></ReportCard>
      <ReportCard title="지금 보면 다르게 느껴질 영화">{rewatch ? <><Pressable accessibilityRole="button" accessibilityLabel={`${rewatch.record.movie.title} 영화 상세`} onPress={() => router.push({ pathname: '/movie/[id]', params: { id: rewatch.record.movieId } })} style={{ flexDirection: 'row', gap: 16, marginTop: 16 }}><ProfilePoster path={rewatch.record.movie.posterPath} title={rewatch.record.movie.title} width={60} height={86} style={{ borderRadius: 10 }} /><View style={{ flex: 1, gap: 7 }}><Text numberOfLines={1} style={s.point}>{rewatch.record.movie.title}</Text><Text style={s.note}>{rewatch.days}일 전 기록</Text><Words words={rewatch.keywords} /><View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><DesignVector name="reportStar" width={16.9454} /><Text style={s.small}>{rewatch.record.rating}</Text></View></View></Pressable><Text style={[s.small, { marginTop: 12 }]}>{rewatch.reason}</Text><Pressable accessibilityRole="button" onPress={() => launch({ movieId: rewatch.record.movieId, title: rewatch.record.movie.title })} style={{ marginTop: 14 }}><Text style={s.link}>다시 기록하기 &gt;</Text></Pressable></> : <Text style={[s.body, { marginTop: 16 }]}>별점 4점 이상으로 기록한 영화가 아직 없어요.</Text>}</ReportCard>
      <View style={{ alignSelf: 'center', marginTop: 24 }}><ExploreButton label="리뷰 더 쓰기" onPress={() => launch()} /></View>
    </>}
    {status === 'ready' ? <View style={{ margin: 21, gap: 12 }}><Pressable accessibilityRole="button" onPress={() => void toggle()}><Text style={s.link}>{visible ? '개인화 결과 숨기기' : '개인화 결과 다시 보기'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/taste-details' as Href)}><Text style={s.link}>리포트 자세히 보기</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/explore-list?ratio=100' as Href)}><Text style={s.link}>취향 밖 한 걸음</Text></Pressable></View> : null}
  </ScrollView>{share ? <ExploreDialog title="공유할 취향 요약 확인" onClose={() => setShare(false)}><Text style={[s.body, { marginVertical: 12 }]}>아래 요약만 공유합니다. 개별 비공개 기록·질문 답변·리포트 URL은 포함하지 않아요.</Text><Text selectable style={s.small}>{shareText}</Text><View style={{ marginTop: 18 }}><ExploreButton label="공유 화면 열기" onPress={() => void shareSummary()} /></View></ExploreDialog> : null}</ExploreFrame>;
}
function Words({ words, white = false }: { words: string[]; white?: boolean }) { return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: white ? 18 : 0 }}>{words.map(word => <View key={word} style={{ backgroundColor: white ? '#FFFFFF' : '#F3F4F6', borderRadius: 14, paddingHorizontal: 10, paddingVertical: white ? 4.5 : 3, maxWidth: '100%' }}><Text style={[s.note, { color: '#364153', fontSize: white ? 12 : 11 }]}>{word}</Text></View>)}</View>; }
function KeywordBox({ title, words }: { title: string; words: string[] }) { return <View style={{ minHeight: 82, backgroundColor: '#F9FAFB', borderRadius: 20, padding: 16, gap: 14, marginTop: 15 }}><Text style={[s.small, { fontWeight: '600' }]}>{title}</Text>{words.length ? <Words words={words.slice(0, 4)} /> : <Text style={s.note}>해당 별점 구간의 키워드가 아직 없어요.</Text>}</View>; }
function ReportCard({ title, children, right }: PropsWithChildren<{ title: string; right?: string;  }>) {
  return <View style={[s.card, { borderWidth: 1, borderColor: '#E5E7EB' }]}><View style={s.between}><Text accessibilityRole="header" style={s.sectionTitle}>{title}</Text>{right ? <Text style={s.note}>{right}</Text> : null}</View>{children}</View>;
}
const s = StyleSheet.create({
  header: { marginTop: 81, height: 54, paddingBottom: 12, paddingHorizontal: 23, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, headerTitle: { fontFamily: homeFont, fontSize: 20, fontWeight: '700', lineHeight: 24, color: '#000000' },
  hero: { backgroundColor: red, paddingHorizontal: 39, paddingTop: 21, paddingBottom: 22 }, heroCount: { fontFamily: homeFont, fontSize: 13, lineHeight: 19.5, color: '#FFFFFF' }, heroName: { fontFamily: homeFont, fontSize: 15, lineHeight: 22.5, fontWeight: '700', color: '#FFFFFF' }, heroTitle: { fontFamily: homeFont, fontSize: 28, lineHeight: 42, fontWeight: '700', color: '#FFFFFF', marginTop: 21 }, heroSummary: { fontFamily: homeFont, fontSize: 15, lineHeight: 22.5, fontWeight: '600', color: '#FFFFFF', marginTop: 8 }, heroBody: { fontFamily: homeFont, fontSize: 13, lineHeight: 21.125, color: '#FFFFFF', marginTop: 12 }, heroFoot: { fontFamily: homeFont, fontSize: 11, lineHeight: 16.5, color: '#FFFFFF', marginTop: 16 },
  card: { marginHorizontal: 21, marginTop: 20, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 15, backgroundColor: '#FFFFFF', overflow: 'hidden' }, between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap' }, sectionTitle: { fontFamily: homeFont, fontSize: 16, lineHeight: 24, fontWeight: '700', color: '#0A0A0A' }, body: { fontFamily: homeFont, fontSize: 14, lineHeight: 22.75, color: '#1E2939' }, small: { fontFamily: homeFont, fontSize: 13, lineHeight: 21.125, color: '#364153' }, note: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, color: '#6A7282' }, keyword: { fontFamily: homeFont, fontSize: 14, lineHeight: 21, fontWeight: '500', color: '#0A0A0A' }, point: { fontFamily: homeFont, fontSize: 15, lineHeight: 22.5, fontWeight: '600', color: '#0A0A0A' }, rank: { fontFamily: homeFont, fontSize: 16, lineHeight: 24, fontWeight: '700' }, track: { height: 7, borderRadius: 10, backgroundColor: '#F9FAFB', overflow: 'hidden' }, fill: { height: 7, borderRadius: 10, backgroundColor: red },
  chart: { height: 188, flexDirection: 'row', gap: 16, alignItems: 'flex-end', marginTop: 8 }, barSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 }, bar: { width: '100%', backgroundColor: red, borderTopLeftRadius: 5, borderTopRightRadius: 5 }, barLabel: { fontFamily: homeFont, fontSize: 12, lineHeight: 18, fontWeight: '500', color: '#364153' }, average: { fontFamily: homeFont, fontSize: 15, lineHeight: 30, fontWeight: '600', color: '#0A0A0A', marginTop: 12, textAlign: 'center' }, link: { fontFamily: homeFont, fontSize: 14, lineHeight: 21, fontWeight: '600', color: red },
});
