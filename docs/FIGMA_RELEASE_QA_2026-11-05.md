# Figma 5단계 일괄 릴리스 검증

## 범위와 결과

1~3단계의 로컬 기록은 `FIGMA_IMPLEMENTATION_PLAN.md`, `EXPLORE_REDESIGN.md`, `FEED_REDESIGN.md`.4~5단계는 `PROFILE_REPORT_REDESIGN.md`. 중간 commit/push/외부 게시 없이 전체를 검증한 후 기존 GitHub main/EAS beta에 일괄 게시한다. 배포 식별자와 최종 commit은 HANDOFF 최신 항목에 남긴다.

| 검사 | 결과 / 환경 |
| --- | --- |
| 소스·빌드 | typecheck/lint,38파일288테스트, 웹47경로/97산출물 secret guard 통과 |
| 벡터 | 소개7·탐색18·피드20·리포트12 원본 SVG manifest 일치 |
| 설치·호환 | npm ci 성공, Expo57/Router57/RN0.86 유지, native JS 양 플랫폼 export 성공 |
| 로컬 UX | 1~3단계 흐름 및 Light3/Core1 완료·복원·프로필/리포트/내 피드/보관함 확인 |
| 역할 DB | 운영 Postgres의 실제 restricted authenticated A/B/anon 역할·positive control 검사 성공. 실제 사용자 JWT 두 개를 이용한 E2E와는 구분 |
| 기록 권한 | private/draft/자식 answers/tags 격리, 타인 insert/update/delete/owner 위조/save RPC 차단, 의도한 public completed 읽기 성공 |
| 사진·관리자 | DB Storage 정책에서 private/foreign path/reference 위조 차단, public 참조 positive control, non-admin 상승/privileged RPC 차단 |
| 새 피드 권한 | 소유자 v3 저장, 직접 테이블/헬퍼/anon 거절, 타인 편집 차단, 투표 유일성/질문 잠금/응답 식별자 비노출/답글 깊이/비공개 전환 차단 |
| 공개키 HTTP |19개 bounded probes에서 RLS-empty 또는 정확한 권한 거절. public key는 인증 사용자 JWT나 서버 비밀키가 아님 |
| 비밀 | .env.local ignored/untracked, 추적 env는 빈 .env.example만. source/index/history/build 패턴 검사. Gemini/TMDB/service-role 서버 경계 유지 |

## 운영 DB 승인 / 적용

- 사용자 승인: 새 피드 테이블/컬럼/RPC를 검증 후 기존 `vthswebqroygpbmxpqaj`에 적용. 기존 기록 삭제·공개 범위 확대·요금제 변경은 승인 범위가 아니다.
- 운영 migration ledger가 없으므로 `db push`/과거 SQL 재실행을 하지 않았다. exact `202611050001_feed_blocks.sql` 한 개만, 사전 migration+fixture 전체 ROLLBACK 성공 후 명시적 remote로 적용했다. timeout30s/lock3s와 PostgREST reload 포함.
- 적용 후 `feed_blocks.sql` 제한 역할 검사 성공. 새3테이블 RLS=true, anon/authenticated/PUBLIC 직접 테이블 grant0. 합성 계정·영화 잔존0. 기존 기록/프로필/Storage 정책은 넓히지 않았다.
- `record_isolation.sql`, `free_community.sql`, `figma_light_review.sql`, `figma_core_review.sql`도 rollback 검사 통과. 구 Light/Core 스크립트의 기존 회원 선택을 제거하고 랜덤 합성 회원/영화만 사용하도록 개선해 다시 실행했다. 최초 실행도 모든 쓰기는 rollback됐으며 기존 기록을 영구 변경하지 않았다.
- 재현: `node scripts/prepare-feed-preflight.mjs`는 임시 SQL만 만들며 운영 연결하지 않는다. **이미 적용된 운영에는 preflight/새 DDL을 다시 실행하지 않는다.** 재검사는 `supabase db query --remote=vthswebqroygpbmxpqaj --file supabase/tests/feed_blocks.sql --yes`(전부 rollback), postconditions는 `--read-only`로 조회한다. 로컬 격리 엔진18검사는 `npm run test:feed-db`.

## 의존성·비용·남은 한계

- 신규 npm 경고22개(high3/moderate17/low2) 중 URL decoder0.5.1, glob14.0.3, minimatch11.0.4로 high/moderate를 제거했다. query-string CJS/ESM 연결·원본 SHA 검증 유지, 별도 timeout child로 조작된 percent run 회귀 추가. audit 제외/강제 SDK 변경은 없다.
- 남은7개 **low**는 deepmerge4.3.1의 원인1개와 Expo build/config 전이 경고다. 공개앱의 리뷰 입력을 이 빌드 설정 병합기에 넣지 않으며 remote config/plugin을 받지 않는다. 공식 수정판이 없으므로 무리한 SDK 변경/로컬 은폐 패치를 하지 않았다. [원인 advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). CI는 기존대로 moderate 이상 실패하며 low 경고도 출력한다.
- 수정 근거: [decoder](https://github.com/advisories/GHSA-qr28-fpjm-wq7f), [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249). 키/설정 유출 부재를 패턴 검사만으로 보장하지 않는다.
- 새 유료 서비스/대상·요금제/AI 제공업체/영상 변환/SMTP/push를 연결하지 않았다. 기존 Core 무료 동의와 서버 guard 유지.12유형 무료 의미 분석 확인 기한(11월3일)은 자동 연장하지 않았고 신규 분석 가능하다고 주장하지 않는다. 무료 프로젝트 등급 재확인은 별도 운영 작업이다. 규칙 기반 통계/수동 기록은 유지된다.
- 실 JWT A/B 브라우저 통합·실제 Storage 업로드/signed URL 발급 HTTP E2E, 실제 Gemini 응답, 마이크/실기기 PWA·native 바이너리, DB/Auth/Storage 전체 백업·restore는 미실행이다. Git tag는 소스 롤백이지 사용자 데이터 백업이 아니다.
- 소개 원본 포스터 하나8MB 등 기존 디자인 이미지가 커 첫 방문 비용/속도 위험은 남아 있다. 사용자 제공 Figma 자산의 상업 사용권을 독립적으로 확인한 것은 아니다. 포스터/상황 사진 외 앱 UI는 기존/원본 SVG와 코드 텍스트·벡터로 구성했다. 결제 없이 사용자·서버 quota 모니터링을 계속해야 한다.
- 롤백은 이전 source HEAD `3ad201b`, 기존 EAS deployment `ypn609gfct`로 **코드/alias만** 복구한다. 새 피드 컬럼/테이블·사용자 참여 데이터는 drop하지 않는다. 기존 RPC를 보존해 구 웹과 공존한다. rollback 명령/최종 tag는 HANDOFF 참고.
