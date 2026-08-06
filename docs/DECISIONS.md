# DECISIONS

## 2026-08-07 웹 우선 전환

- 첫 출시 우선순위를 앱스토어 배포가 아닌 모바일 반응형 웹/PWA로 변경한다.
- Expo와 Expo Router의 공통 코드베이스는 유지해 향후 iOS 앱 전환 가능성을 보존한다.
- 1단계 완료 조건에서 Apple 로그인과 iOS 빌드를 제외하고, Supabase 이메일 로그인·데이터 저장·모바일 웹 검증을 포함한다.
- 신규 Supabase 프로젝트는 클라이언트에서 publishable key를 사용하고 secret/service-role key는 사용하지 않는다.

## 결정

- Focus Quest와 분리된 `C:\Users\letsh\Documents\Click`를 신규 서비스 기획 루트로 사용한다.
- 물리 폴더는 안전하게 `Click`으로 유지하고 표시 이름은 작업명 `FLICK`를 사용한다.
- 제품의 중심은 영화 정보 탐색이 아니라 감정 기반 발견과 감상 기록의 반복 루프다.
- 초기 MVP는 개인 기록 가치 검증에 집중하고 공개 커뮤니티는 후순위로 둔다.
- AI는 사용자 글을 대체하지 않고 질문, 키워드 정리, 초안을 보조한다.
- Light와 Core를 상황에 따라 선택하는 두 기록 모드로 정의한다.
- 취향 리포트 1차 버전을 MVP의 핵심 보상 화면에 포함한다.
- 북극성 지표는 월간 의미 있는 감상 기록 완료 수로 둔다.
- 플랫폼 우선순위는 iOS 앱 → 반응형 웹 → Android 앱으로 둔다.
- 개발 언어는 TypeScript, 앱·웹 프레임워크는 React Native + Expo + Expo Router로 정한다.
- 백엔드의 초기 선택은 Supabase이며 DB·Auth·Storage·Edge Functions를 사용한다.
- 영화와 AI 외부 서비스는 서버 어댑터 뒤에 두어 공급자를 교체할 수 있게 한다.
- 1단계 구현은 Expo SDK 57 안정 버전과 npm lockfile을 사용한다.
- 인증 세션은 네이티브에서 SecureStore, 웹에서 AsyncStorage에 저장한다.
- Supabase 환경이 없을 때는 외부 전송 없는 기기 내 데모 모드로 온보딩을 검증한다.
- 실제 로그인 데이터는 Supabase RLS 정책과 서버 migration을 적용한 뒤 저장한다.
- 영화 공급자는 TMDB로 정하고 앱은 Edge Function만 호출한다. 공급자 토큰은 서버 비밀값으로만 둔다.
- 검색·추천은 Supabase 영화 캐시를 우선 복구 경로로 사용하며, 보고 싶어요는 사용자별 RLS가 적용된 `watchlist`에 저장한다.
- TMDB 필수 고지는 Credits 화면에 항상 노출한다.

## 가정

- 첫 사용자는 20~30대의 모바일 중심 영화 관객이다.
- 서비스명은 브랜딩 근거인 `Flick + Click`을 따라 임시로 `FLICK`라 표기한다.
- 현재 Windows 개발 환경에서는 EAS 클라우드 빌드를 사용한다.
- 초기 팀 규모는 1인 또는 소규모이며 단일 TypeScript 코드베이스의 유지비를 우선한다.

## 미결정

- 공식 서비스명과 상표 사용 가능성
- Apple Developer 계정과 최종 iOS bundle identifier
- 웹 호스팅 제공자와 도메인
- TMDB API 토큰 발급과 `movies-discovery` Edge Function 운영 배포
- 예고편 공급자와 사용 범위
- AI 모델, 비용 상한, 개인정보 보관 정책
- 콘텐츠 공개 기본값과 커뮤니티 운영 범위
- 수익 모델과 출시 목표 시점

## 서비스 설정

- 독립 Git 저장소의 기본 브랜치는 `main`으로 사용한다.
- `FLICK.code-workspace`에서 프로젝트를 열고 공식 Codex 확장 `openai.chatgpt`를 권장한다.
- 배포 프로젝트와 호스팅 ID는 아직 만들지 않는다.
- 비밀정보, 환경 파일, 의존성, 캐시, 빌드 결과는 Git에서 제외한다.
