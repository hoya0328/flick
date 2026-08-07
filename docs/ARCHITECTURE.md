# ARCHITECTURE

## 확정된 플랫폼 전략

- 우선순위: iOS 앱 → 반응형 웹 → Android 앱
- 언어: TypeScript strict mode
- 앱·웹: React Native + Expo + Expo Router의 현재 안정 버전
- 웹: Expo Web 정적 출력과 모바일 우선 반응형 UI
- 패키지 관리: npm과 lockfile
- 백엔드: Supabase의 PostgreSQL, Auth, Storage, Edge Functions
- 영화 데이터: 서버 어댑터를 통한 TMDB 후보 사용
- AI: 서버 전용 공급자 어댑터. 초기 후보는 OpenAI이며 모델명과 비용 상한은 환경설정으로 분리한다.

Expo Router는 iOS·Android·웹 라우팅과 딥링크를 한 구조로 공유한다. Windows에서도 EAS Build/Submit으로 iOS 빌드와 제출이 가능하므로 별도 Swift·웹 코드베이스보다 현재 우선순위와 비용에 적합하다.

## 프로젝트 경계

```text
src/app/                 화면과 라우트
src/features/            auth, discovery, review, report 기능 단위
src/components/          공통 UI와 디자인 시스템
src/lib/                 API 클라이언트, 검증, 오류, 분석 이벤트
assets/                  원본 FLICK 자산
supabase/migrations/     재현 가능한 DB 변경
supabase/functions/      영화 API와 AI 서버 함수
tests/                   단위·통합·핵심 흐름 테스트
```

클라이언트는 화면 상태와 사용자 입력만 소유한다. 영화 공급자 키와 AI 키, 프롬프트, 사용량 제한은 Edge Function이 소유한다. 데이터베이스가 기록의 최종 원본이며 로컬 저장소는 미완성 초안과 재시도 큐에만 사용한다.

## 핵심 사용자 흐름과 상태

1. 인증 → 키워드 온보딩 → 홈
2. 홈/검색 → 영화 상세 → 보고 싶어요 또는 기록 시작
3. 영화·감상일 확인 → Light/Core 선택 → 중간 저장 → 사용자 승인 → 완료
4. 완료 기록 → 캘린더·리포트 갱신 → 다음 추천

각 흐름은 `loading`, `empty`, `offline`, `retryable error`, `permission denied`, `success` 상태를 제공한다. AI 오류와 영화 API 오류는 기록 저장을 막지 않는다.

## 데이터 모델

| 엔티티 | 핵심 필드 | 소유·공개 범위 |
|---|---|---|
| `profiles` | user_id, display_name, locale, onboarding_at | 본인 읽기·수정 |
| `keywords` | id, label, category, color | 전체 읽기, 관리자 수정 |
| `user_keywords` | user_id, keyword_id, weight | 본인 전용 |
| `movies` | provider_id, title, poster_path, metadata, cached_at | 전체 읽기, 서버 갱신 |
| `watchlist` | user_id, movie_id, status | 본인 전용 |
| `reviews` | user_id, movie_id, mode, watched_at, rating, body, visibility, status | 기본 본인 전용 |
| `review_answers` | review_id, question_key, answer | 리뷰 소유자 전용 |
| `review_keywords` | review_id, keyword_id, source | 리뷰 소유자 전용 |
| `review_questions` | review_id, question_key, question_text, options, source_rule | 리뷰 시점 질문·선택지 스냅샷, 소유자 전용 |
| `review_answer_tags` | review_id, question_key, tag_id | 질문별 사용자 선택 태그, 소유자 전용 |
| `ai_jobs` | user_id, review_id, status, model, token_usage, error_code | 본인 메타데이터, 서버 원문 관리 |
| `report_snapshots` | user_id, period, metrics, generated_at | 본인 전용 |

모든 사용자 테이블은 Supabase RLS로 `auth.uid() = user_id`를 강제한다. 공개 리뷰는 별도 읽기 정책을 추가하며 비공개가 기본값이다.

## 인증과 권한

- 웹과 초기 개발: 이메일 OTP
- iOS 배포: Sign in with Apple 추가
- Android 배포 시 Google 로그인 검토
- 클라이언트에 서비스 역할 키를 포함하지 않는다.
- 계정 삭제 시 사용자 기록·초안·리포트·AI 작업을 삭제하고 영화 공용 캐시는 유지한다.

## API 계약

| 계약 | 입력 | 성공 | 주요 실패 |
|---|---|---|---|
| `GET /movies/search` | query, page | movie summaries | provider_unavailable, rate_limited |
| `GET /movies/:id` | provider id | movie detail | not_found, stale_cache |
| `GET /recommendations` | keyword ids | movies + reason | insufficient_profile |
| `POST /reviews` | movie, mode, answers, visibility | saved review | validation, conflict |
| `POST /ai/review-guide` | review id, current answers | questions/keywords/draft | quota, timeout, unsafe_output |
| `GET /reports/me` | period | deterministic metrics | insufficient_data |

클라이언트와 서버는 공유 TypeScript 스키마로 입력·응답을 검증한다. AI 응답은 구조화된 JSON으로 제한하고 저장 전 사용자가 수정·승인한다.

## 반응형·접근성

- 320~480px: 기본 단일 열, 하단 탭, 44pt 이상 터치 영역
- 481~767px: 넓은 단일 열과 확장 카드
- 768px 이상: 최대 콘텐츠 폭 960px, 탐색과 상세의 선택적 2열
- 텍스트·핵심 행동은 WCAG AA 대비를 충족한다.
- 키보드 탐색, 스크린리더 이름, 동적 글자 크기, 모션 감소를 지원한다.
- 플랫폼 차이는 `.ios.tsx`, `.android.tsx`, `.web.tsx`로 최소화하고 도메인 로직은 공유한다.

## 배포와 운영

- 환경: local, preview, production을 분리한다.
- 비밀정보: Supabase/Expo 서버 환경변수에 저장하고 저장소에는 `.env.example`만 둔다.
- DB: 모든 변경은 순방향 migration과 롤백 메모를 포함한다.
- 백업: 공개 베타 전 Supabase 일일 백업 또는 별도 논리 백업을 확보한다.
- iOS: EAS Build → TestFlight → App Store 심사
- 웹: 동일 커밋의 Expo Web 정적 산출물을 관리형 CDN에 배포
- Android: iOS·웹 안정화 뒤 EAS Android 빌드
- 릴리스 실패 시 직전 앱 빌드와 웹 버전으로 롤백하고 DB는 호환 가능한 migration만 배포한다.

## 지연한 결정

- 최종 영화 데이터 상업 라이선스
- AI 모델과 월 비용 상한
- 웹 호스팅 제공자와 도메인
- 분석·오류 관측 제공자
- 공개 피드용 검색·모더레이션 구조
