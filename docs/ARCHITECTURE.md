# ARCHITECTURE

## 확정된 플랫폼 전략

- 우선순위: iOS 앱 → 반응형 웹 → Android 앱
- 언어: TypeScript strict mode
- 앱·웹: React Native + Expo + Expo Router의 현재 안정 버전
- 웹: Expo Web 정적 출력과 모바일 우선 반응형 UI
- 패키지 관리: npm과 lockfile
- 백엔드: Supabase의 PostgreSQL, Auth, Storage, Edge Functions
- 영화 데이터: 서버 어댑터를 통한 TMDB 후보 사용
- AI: Supabase Edge Function의 서버 전용 공급자 어댑터. Core 연계 질문 테스트는 Gemini 무료 등급을 사용하고 모델명은 서버 환경설정으로 분리한다.

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
| `reviews` | user_id, movie_id, mode, watched_at, rating, body, visibility, status | 초안·비공개는 본인 전용, 완료된 공개 기록은 인증 사용자 읽기 |
| `review_answers` | review_id, question_key, answer | 부모 리뷰 공개 범위를 상속 |
| `review_keywords` | review_id, keyword_id, source | 리뷰 소유자 전용 |
| `review_questions` | review_id, question_key, question_text, options, source_rule | 리뷰 시점 질문·선택지 스냅샷, 소유자 전용 |
| `review_answer_tags` | review_id, question_key, tag_id | 질문별 사용자 선택 태그, 소유자 전용 |
| `ai_jobs` | user_id, review_id, status, model, token_usage, error_code | 본인 메타데이터, 서버 원문 관리 |
| `report_snapshots` | user_id, period, metrics, generated_at | 본인 전용 |
| `admin_access` | user_id, role, view/moderate/delete permission flags | 서버 검증 관리자 전용 |
| `admin_audit_events` | admin_user_id, action, target, metadata, created_at | 관리자 활동 메타데이터, 관리자 RPC 전용 |

모든 쓰기·수정·삭제는 Supabase RLS로 소유자를 강제한다. `visibility = public`이면서 `status = completed`인 기록과 자식 질문·답변·태그만 인증 사용자에게 읽기를 허용한다. 초안과 비공개 기록은 항상 소유자 전용이며 기본값은 `private`이다.

## 인증과 권한

- 웹과 초기 개발: Supabase Auth 이메일·비밀번호 가입/로그인, 최초 이메일 소유 확인, 비밀번호 복구
- iOS 배포: Sign in with Apple 추가
- Android 배포 시 Google 로그인 검토
- 클라이언트에 서비스 역할 키를 포함하지 않는다.
- 계정 삭제 시 사용자 기록·초안·리포트·AI 작업을 삭제하고 영화 공용 캐시는 유지한다.
- 슈퍼 관리자는 운영 DB에서 기존 인증 사용자와 연결한다. 개인 이메일이나 관리자 목록은 클라이언트 코드에 포함하지 않는다.
- 관리자 조회·권한 변경·기록 조치는 `security definer` RPC가 현재 계정과 개별 권한을 검사한 뒤 수행한다. 기반 관리자 테이블은 `anon`, `authenticated` 역할에 직접 개방하지 않는다.
- 기록 수정 권한은 사용자 본문 편집이 아닌 `public`에서 `private`으로의 운영 조치만 허용한다. 삭제는 별도 권한과 화면의 2단계 확인을 모두 요구한다.

## API 계약

| 계약 | 입력 | 성공 | 주요 실패 |
|---|---|---|---|
| `GET /movies/search` | query, page | movie summaries | provider_unavailable, rate_limited |
| `GET /movies/:id` | provider id | movie detail | not_found, stale_cache |
| `GET /recommendations` | keyword ids | movies + reason | insufficient_profile |
| `POST /reviews` | movie, mode, answers, visibility | saved review | validation, conflict |
| `POST /functions/v1/generate-core-question` | movie id, prior Q/A | next question | quota, timeout, unavailable |
| `POST /functions/v1/generate-core-review-draft` | movie id, five Q/A | keywords + editable draft | quota, timeout, invalid_output |
| `GET /reports/me` | period | deterministic metrics | insufficient_data |

클라이언트와 서버는 공유 TypeScript 스키마로 입력·응답을 검증한다. AI 응답은 구조화된 JSON으로 제한하고 저장 전 사용자가 수정·승인한다.

Core 연계 질문 함수는 Supabase JWT를 검증하고 영화 메타데이터를 서버에서 조회한다. 클라이언트는 이메일이나 사용자 ID를 Gemini에 보내지 않으며, 이전 질문과 최대 1,200자의 답변만 전달한다. 응답은 질문 한 문장 JSON으로 제한하고 8초 뒤 중단한다. 실패하면 클라이언트의 결정적 질문으로 복구한다.

Core 리뷰 초안 함수도 Supabase JWT와 영화 ID를 검증하고 Q1~Q5의 질문·답변만 Gemini에 전달한다. 응답은 키워드 3~5개와 편집 가능한 한국어 초안 JSON으로 제한하며, 이메일·사용자 ID는 전달하지 않는다. 생성은 별도 동의와 버튼 입력이 있어야 실행되고 결과는 자유 감상에만 채운다. 기존 자유 감상이 있으면 교체를 다시 확인하며 자동 완료·공개하지 않는다.

두 AI 함수는 `claim_ai_request` RPC로 사용자·기능별 한도를 원자적으로 선점한다. 연계 질문은 하루 20회·분당 6회, 리뷰 초안은 하루 5회·분당 2회이며 초과 시 Gemini를 호출하지 않는다. 이메일·한국 휴대전화·주민등록번호 패턴은 전송 전 차단하고, Gemini의 괴롭힘·혐오·성적·위험 콘텐츠 안전 기준은 `BLOCK_MEDIUM_AND_ABOVE`로 고정한다.

`ai_usage_events`에는 기능, 성공·실패 상태, 오류 코드, 모델, 토큰 수, 소요시간만 저장한다. 프롬프트·답변·생성 본문은 저장하지 않으며 각 사용자의 다음 호출 시 30일이 지난 이벤트를 삭제한다. RLS로 사용자는 자신의 메타데이터만 읽을 수 있고 쓰기는 서버 역할 RPC에만 허용한다.

4단계 MVP 리포트는 별도 AI·DB 스냅샷 없이 사용자의 완료 기록에서 결정적으로 계산한다. 완료 편수, 월별 기록, 평균 별점, 별점 분포, Light/Core 비율과 감정 TOP 3를 같은 규칙으로 웹·앱에서 생성한다. `report_snapshots`는 기록량 증가로 조회 비용이 확인될 때만 도입한다.

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
- 유료 전환 시 AI 모델과 월 비용 상한
- 웹 호스팅 제공자와 도메인
- 분석·오류 관측 제공자
- 공개 피드용 검색·모더레이션 구조
