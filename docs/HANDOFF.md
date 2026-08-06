# HANDOFF

## 2026-08-07 다음 작업

- 방향이 모바일 반응형 웹/PWA 우선으로 변경되었다. Apple 로그인과 iOS 빌드는 후속 단계로 미룬다.
- Supabase `flick` 프로젝트 연결과 첫 migration 적용을 완료했다. `profiles`, `keywords`, `user_keywords` 및 RLS 정책이 생성되었고 초기 키워드 12개를 확인했다.
- Auth Site URL과 Redirect URL은 로컬 웹 개발 주소 `http://localhost:8081` 기준으로 설정했다. 배포 시 운영 HTTPS 주소로 변경해야 한다.
- Supabase가 활성화된 정적 웹 빌드에서도 브라우저 저장소를 서버에서 호출하지 않도록 인증 저장소를 SSR-safe하게 처리했고, check와 web export를 통과했다.
- 실제 이메일 Magic Link 로그인, 동일 브라우저 복귀, `profiles` 1건과 `user_keywords` 3건 저장, 새로고침 후 계정 세션 복구까지 확인했다.
- 데모 세션과 실제 계정 세션을 명확히 분리하고 마이 화면에 세션 초기화 동작을 추가했다. 모바일 반응형 웹 기준 1단계는 완료 상태다.

## 현재 상태

1단계 기반과 온보딩을 구현했다. Expo SDK 57, TypeScript strict mode, Expo Router, 공통 디자인 토큰, 모바일 우선 화면, 이메일 OTP 경계, 기기 내 데모 모드, 키워드 선택·복구·재설정과 Supabase 첫 migration이 포함된다.

## 다음 권장 작업

1. Supabase 프로젝트를 만들 때 `.env.example`의 공개 클라이언트 값만 로컬 환경에 넣는다.
2. `supabase/migrations/202608070001_stage1_profiles_and_keywords.sql`을 적용하고 이메일 OTP를 실계정으로 확인한다.
3. Apple Developer 계정 전에는 비활성 Apple 로그인 경계를 유지한다.
4. 다음 구현은 `기능 개발: 2단계 영화 발견`이다.

## 다음 작업자 주의사항

- Focus Quest 저장소 안에 FLICK 코드를 추가하지 않는다.
- 제공된 33쪽을 그대로 모두 구현 범위로 해석하지 않는다.
- AI 결과는 사용자 승인 전 저장·게시하지 않는 방향을 유지한다.
- 소셜 기능보다 개인 기록의 반복 사용성을 먼저 검증한다.
- iOS 화면을 우선하되 각 단계에서 반응형 웹이 깨지지 않게 검증한다.
- 단계별 완료 기준을 통과하기 전 다음 단계 기능을 섞지 않는다.

## 1단계 구현 경계

- 완료: Expo 앱 골격, 공통 토큰, 탭 라우팅, 인증 경계, 키워드 온보딩, 로컬 복구, Supabase 스키마 첫 migration
- 제외 유지: 실제 AI 호출, 영화 추천, 공개 피드, 결제, 배포
- 검증 완료: Expo 의존성 호환, TypeScript, lint, 4개 단위 테스트, 정적 웹 빌드
- 시각 검증 완료: 390px 전체 온보딩, 새로고침 복구, 취향 재설정, 320/480px 가로 넘침 없음

## 외부 연결과 남은 위험

- Supabase 프로젝트와 Apple Developer 계정이 없어 실 OTP와 iOS 네이티브 빌드는 실행하지 않았다.
- `npm audit --omit=dev`는 Expo 빌드 도구의 `uuid` 전이 의존성에서 moderate 10건을 보고한다. 자동 강제 수정은 Expo 46으로 파괴적 다운그레이드하므로 적용하지 않았고, Expo 상위 릴리스에서 추적한다.
- 앱 아이콘과 스토어 자산은 승인된 원본 FLICK 자산을 받은 뒤 교체한다.
- 현재 Windows PowerShell 실행 정책에서는 `npm.ps1`이 차단되므로 명령은 `npm.cmd`로 실행한다.
