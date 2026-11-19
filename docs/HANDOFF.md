# HANDOFF

## 2026-11-20 Figma 로그인 · 회원가입 디자인

- 빨간 테두리43:495 안 신규 로그인51:422와 메모51:700을 직접 읽어 원본 SVG·폰트·색·수치를 반영했다. 회원가입은 공통UI로4필드 확장, 기본화면 소개/탭/개발용 데모 버튼은 제외하고 실제 전시 게스트 연결은 유지. `AUTH_DESIGN_2026-11-20.md` 참고.
- 필드 오류 스크롤/포커스·한국어 통신 오류·중복 요청 잠금·공유 경로 복귀 유지. 타입/린트/365회귀/49경로 빌드·30경로 smoke·독립 브라우저 UI 검수 성공. 인증 요청은 전부 mock이며 실제 계정/메일/DB/기한/AI 변경 없음. 기존 발표·QR 미커밋 자료는 보존한다. 최종 게시 결과는 전용 문서에 기록한다.

## 2026-11-19 완료 리뷰 외부 검증 결과

- GitHub 소스 `c77f9a1`, 기존 beta `4yiqhch61k` 게시 완료. 새 기본 읽기/공유 경로는 `/review?id=<ID>`, 기존 동적 주소는 호환 유지. 외부30경로200·번들 일치·새 리뷰 직진입/새로고침 콘솔 오류0, 타입/린트/357회귀/49경로 빌드 통과. `FIGMA_REVIEW_READERS_2026-11-19.md` 최종 결과 참조. 보안 작업은 계속 중지 상태다.

## 2026-11-19 Figma 빨간 박스 완료 리뷰 읽기 화면

- 사용자 지시로 보안 작업은 중지하고 Daybreak를 사용하지 않는다. Figma `43:495` 안 Light/Core 화면과 메모4개를 기준으로 완료 리뷰 전용 읽기 화면을 구현했다. 상세 `FIGMA_REVIEW_READERS_2026-11-19.md`.
- 완료 기록 목록·마이 캘린더·작성 완료는 `/review/[id]`로, 본인 연필만 기존 편집기로 연결. Light는 키워드·실제 답변·리뷰, Core는 사진·서식 보존 본문. 불필요한 완료 버튼/AI 안내/편집 입력 UI 제거, 공개 커뮤니티 기능은 글 아래 유지. DB/의존성/요금제/전시 기한 변경 없음.
- 로컬 데모 저장·재열기·연필 편집·키워드 수정·스포일러·Core 문단 서식·320/402/1280폭·콘솔 검수 완료. 실제 계정 데이터/AI/사진 업로드 테스트는 하지 않았다. 타입·린트·전체355회귀/48경로 빌드 성공 후 공유 경계 회귀1개를 추가했다. 최종 게시 결과는 전용 문서에 기록한다.

## 2026-11-19 2번 보안 의존성 / 3번 메일 보류

- 사용자 후속 선택으로 SMTP는 보류. 계정/발송 공급자/도메인/인증 정책/메일 전송 변경 없음, 기존 게스트 체험 유지. 의존성만 수정·검증해 기존 GitHub/beta 대상으로 게시한다.
- node-forge 공식1.4.3을 override/lock 및 npm ci로 실제 설치, Expo signing consumer 확인. picomatch2.3.2/4.0.7의 3개 경로에 원본 SHA 기반의 반복 extglob fail-closed 가드·postinstall/start/check/build 강제 검증 추가. wildcard/중첩/prefix·casefold 모호성 차단, 정상 프로젝트 패턴 보존, 관련14회귀.
- npm audit는 **HIGH34 잔존**(omit-dev24), moderate0/forge 경고 제거. 공식 picomatch 수정판 없음. CI는 회귀/빌드를 먼저 실행한 뒤 기존 동일 임계치 감사로 실패하며 경고/실패를 숨기지 않는다. 로컬 완화를 upstream 보안판/전체 통과라고 표현하지 않는다.
- 상세 [SECURITY_DEPENDENCIES_2026-11-19.md](SECURITY_DEPENDENCIES_2026-11-19.md). 이전 발표·QR·백업 자료 미커밋은 보존하고 실제 비공개 백업을 게시하지 않는다. 최종 검사와 source/deployment는 전용 문서 최신 항목을 따른다.

## 2026-11-18 앱 문구·모바일 정밀 검수

- 사용자 휴대폰 사진 기준의 불필요한 설명 제거와 카드 경계·반응형·서체 정리를 완료했다. 상세 범위/검수는 [UI_POLISH_2026-11-18.md](UI_POLISH_2026-11-18.md).
- 실제 계정의 기존8편 및 다른 작성자의 공개 리뷰는 조회만 확인했다. 별도8084 데모에서 Light/Core 각1편의 작성·편집·비공개 로컬 저장을 검증했다. 운영 데이터·권한·AI 무료 조건은 변경하지 않는다.
- 320/402/430/1280px 주요7경로28조합 가로 넘침0px, 실제320px 카드·402px 댓글 검수, TypeScript/lint/318테스트/48경로 웹 export·비밀정보 검사를 통과했다. GitHub/beta 게시 식별자는 전용 검수 문서에 확정한다. GitHub CI의 기존 의존성 보안 감사35건은 별도 잔여 사항이며 전체 CI 성공으로 안내하지 않는다.
- 기존 발표 자료와 이전 점검 문서의 미커밋 변경은 이 코드 게시에 섞지 않는다. 다음 작업은 실제 모바일 Safari 피드백 수집이며, 픽셀 동일·실기기 E2E 전체를 완료했다고 주장하지 않는다.

## 2026-11-05 무료 전시 준비 (최신)

- 요청/운영 변경 승인: `/exhibition` 독립 게스트 체험 + 공유 AI 한도 + 기존 EAS beta 게시. 앞선 비용 검토의 '미구현' 상태를 이 항목으로 대체한다. 결제 설정은 변경하지 않았다.
- 승인된 새 migration `202611050002_exhibition.sql` +003(차단 요청 로그 증가 방지)+004(전시 선정 영화만 조회·저장)만 각각 rollback 사전검증 후 운영에 적용. 기존 migration ledger 없음 → `db push` 전체 재실행 금지. 별도 private 기록/UID, 일반 테이블 mutation guard, Storage restrictive policy. 전시/무료 AI 검증 만료 **2026-11-12 19:15:14 KST**. 실제 전시일은 미정이므로 개막 전에 무료 플랜/기간 재확인 필요.
- 가입 제한 hook와 anonymous만 대시보드에서 적용했다. 전체 config push는 자동 검토 차단으로 실행 안 됨; 이메일 확인/MFA/기존 URL은 그대로. `config diff --remote=vthswebqroygpbmxpqaj` declared update=0. Auth Before User Created는 `public.exhibition_before_user_created` enabled.
- 운영 네 함수 업데이트: generate-core-question, generate-core-review-draft, analyze-taste-review, movies-discovery. 기존 gateway JWT verification=true 유지, 서버 `/auth/v1/user` 검증 유지. 게스트 외부 TMDB 갱신·추가 취향 AI는 차단; Light/Core AI는 공유 claim 게이트 사용.
- 검증: isolated PGlite exact DDL/roles, 운영 rollback 전후 exhibition + record_isolation + feed_blocks + figma_core/light SQL 통과. rollback fixture Auth residue0 / client quota 우회 불가 / 기존 테이블 전체 guard 검사 통과. Hosted postgres는 AuthAdmin으로 SET ROLE 불가하므로 production hook body+ACL과 로컬 실제 AuthAdmin 테스트를 구분한다.
- **추가 실사용 검증 사용자 승인 후** 외부 beta에서 게스트 **1개만** 생성했다. Light 4.5별점→태그/skip/질문1회교체→Q5 새로고침 복원→실제 Gemini 초안 **1회**→대표키워드2개로 수정/예문 본문편집→비공개 저장→체험 종료/첫 화면 복귀 성공. 오늘 공유400→399/개인8→7 차감. 서버에 승인된 비공개 예시1건과 익명 계정1개를 남겼으며, 브라우저 세션과 임시 초안은 종료했다. 이 보존 계정과 rollback fixture residue0는 구분한다. 실제 Core Gemini 연계질문 HTTP/동시부하는 미실행(기존 회귀/DB는 통과).
- `npm run check`:40파일307테스트/type/lint 통과. 웹48routes·빌드 시 secret guard 통과. 로컬 390px overflow없음, 필수 안내/성인 동의/AI 선택 토글 확인. npm audit 현재 **low2**, critical/high/moderate0; 기존 deepmerge CJS own-property 보완 유지. 실제 휴대폰/동시부하/오늘 Expo 월잔여량은 미검증.
- **GitHub/외부 게시 완료:** 앱 구현 `6b5e773`, [CI42010756054](https://github.com/hoya0328/flick/actions/runs/42010756054) 성공. 기존 beta deployment **owipwwm4lx**, JS `entry-fd38fdd0912bc27151a164307329eab6.js`, PWA `8a0b3e2a7990e09b`; 공개 URL과 JS bytes=검증 로컬 export 확인. rollback tag `rollback/exhibition-before-2026-11-05`=`077e9bf` push 완료. 직전 web `11sk5uwt71`.
- 추가003/004는 서버 쿼터/전시 선정작만 변경하며 앱 번들 재배포는 불필요하다. 최신 검사 `node scripts/check-exhibition-release.mjs`는 공개키만으로 새 private 테이블5개 접근 거부와 anonymous활성/email확인유지·beta200·JS일치를 확인한다. 스크린샷은 ignored `tmp/exhibition-qa/beta-saved.png`(예문뿐, 사용자 비밀 없음).
- 운영/한계/중지 방법은 `EXHIBITION_IMPLEMENTATION.md`. 다음: 개막일 확정 → Free/기간 재확인 → 실제 휴대폰·현장 Wi-Fi 리허설. 유료 연결은 금지 상태 유지.

## 2026-11-05 졸업 전시 무료/비용 검토(기능 변경 없음)

- 사용자:약일주일·일100명 미만,무료 한도/필요 비용/전시 고려 사항 확인 요청. 실제 AI Studio Klick Free:Gemini3.5FlashLite15RPM/250KTPM/500RPD. 최대700명,Light1/Core3종료4/Core5완주6호출. 모두Core면83명/일 이론상한,70Light/30Core100명은250호출/일. 실패/변경/추가분석·분당제한·공유프로젝트를 빼고 인원을 보장하지 않는다.
- 운영 집계 읽기만 수행:DB21.7MB/계정2/완료17,사진4/.38MB→코드160장 중156여유. Auth emailAutoconfirm=false로 인증 필요. 실제 customSMTP와Expo월잔여량은 미확인(Expo브라우저로그인필요). AI로그소규모21성공(초안7/질문14) 평균으로 전체예산을 보장하지 않는다.
- 보고서 `EXHIBITION_CAPACITY_2026-11-05.md`, 재현용 읽기 SQL `supabase/tests/exhibition_capacity.sql`. AI일/분쿼터·비용 예산$5~15·FreeDB/Hosting 유지·무료SMTP/게스트는 **제안/미구현**. 현재12유형 추가AI30회/일·기록된11월3일확인기한,사진160,유형3편/대표8편·Gemini연령/무료데이터 조건도 전시 준비 대상이다.
- 설정·과금·키·사용자 데이터·기능·외부 배포 변경 없음. 이번 검토 문서는 로컬 기록만 하고 GitHub push/배포하지 않는다. 사용자가 전시 준비 개발/예산을 선택하면 P0부터 진행한다. QR은 아직 생성하지 않았다.

## 2026-11-05 보안 재검사 / low7 원인 CJS 보완

- **저장/게시 완료:** 구현 `fe2a291`, [GitHub CI41996588797](https://github.com/hoya0328/flick/actions/runs/41996588797) 성공(재설치 보완·audit·type/lint·300테스트·웹). 기존 beta deployment `11sk5uwt71`에 반영했다. 외부 welcome/profile/report/feed/manifest/sw200, 외부 JS SHA256=검증 로컬 JS 확인. 화면 코드/런타임 번들은 이전과 동일하며 운영 서버 정책/기록을 바꾸지 않았다. 후속 커밋은 결과 문서뿐이다.
- rollback tag `rollback/security-recheck-before-2026-11-05`=`edd009d`도 GitHub에 저장했다. 이전 웹 `4eqmlnnd9n`. public 스키마 CREATE 권한은 anon/authenticated 모두false로 추가 확인했다. 잔여 경고와 미검증 범위는 아래/검사 문서를 유지한다.

- 사용자 요청: low7 포함 재검사와 발견 문제 수정. 시작 clean `edd009d`. 현재 계약/근거는 `SECURITY_RECHECK_2026-11-05.md`. registry 경고는 deepmerge4.3.1 원인1+전이6이고 최신 공식 수정판 없음. 실제 Expo CJS의 반환 객체 prototype poisoning을 재현하고3개 data-property 쓰기로 최소 보완했다. audit는 숨기지 않아 **low7 유지, high/moderate/critical0**.
- `security-deepmerge.mjs`: 원본 SHA/실제 Expo consumer/실경로/버전 검사, 변조 시 거절. postinstall 적용, start/web/check/build 검사. SDK/lock/패키지 버전 유지. 정상 병합과 공격6종·보완 누락/변조·설치 재현12테스트 추가. npm ci·39파일300테스트/typecheck/lint·웹47경로 빌드 통과. 기존과 같은 bundle `entry-982b7369139e4303feb8c114aa0fa4fc.js`, PWA `009a745c07935fac`.
- source/history/build 비밀값 검사 성공. 공개키 HTTP19+인증 없는Edge5=24개 차단. 운영 record_isolation/feed_blocks/free_community의 실제 restricted role 합성 rollback 모두 통과, 잔존auth/movie0. private bucket=true, 민감 테이블RLS=true, fixed search_path 누락0. DB정책·키·실계정 데이터·AI/과금 설정 변경 없음.
- 실제JWT A/B·signed media/업로드HTTP E2E·실기기·전체복원/침투는 미검증. 이번 보완은 Expo CJS entry 한정, 새 UMD/index consumer/SDK 변경 시 재검토. 공식 수정판 출시 시 교체하고 회귀 재실행. 기존 release 전7경고 문구는 당시 기준이며 이번에는 exploit 보완을 추가했다.
- source rollback `edd009d`, 기존 beta `4eqmlnnd9n`. 사용자 기본 게시 절차에 따라 검증 후 기존 GitHub/beta 반영, 최종 식별자는 아래에 확정한다. 실행코드 화면 변경은 없다.

## 2026-11-05 Figma 4~5단계 완료 / 최종 일괄 게시

- **최종 완료:** 구현 `c3a5b6b`를 GitHub main에 push했고 [CI41988714417](https://github.com/hoya0328/flick/actions/runs/41988714417)에서 설치/audit/typecheck/lint/288테스트/웹 빌드 전부 성공했다. 기존 EAS beta에 deployment `4eqmlnnd9n`을 한 번 게시했다. 고정 주소 https://flick-film-journal--beta.expo.app 유지. 후속 커밋은 이 배포 결과를 적는 문서 변경뿐이다.
- 외부12개 경로(welcome/intro/search/profile/report/details/Light/Core/feed/manifest/sw/offline) HTTP200. 실제 외부 JS SHA256이 로컬 검증 bundle `entry-982b7369139e4303feb8c114aa0fa4fc.js`와 일치한다. 기존 beta 데모 세션의 실제1개 기록/데이터 부족 리포트, 프로필→내 피드, 기록 플로팅→Light 검색, 새 피드·영화/투표/질문 카드 확인. 외부 profile320/402 넘침0·브라우저 콘솔 error/warn0. 실제 계정 쓰기/AI 요청은 안 했다. 새 익명 브라우저 E2E는 별도8084에서 실행했으며 기존 beta 데모를 익명 세션으로 오인하지 않는다.
- 최종 외부 증거 ignored `tmp/figma-stage45-20261105/beta-report-402.png`, `beta-recording-sheet-402.png`; 로컬 최종 `final-report-320/402/1280.png`, `final-profile-402.png`, `light-question-402.png`. 임시8084 탭/서버 종료, viewport 복구. 외부 결과와 로컬8083 탭 유지/정적 preview 실행 중(새 수정 후 재빌드 필요).
- 롤백 tag `rollback/figma-five-before-2026-11-05`=`3ad201b`도 GitHub 저장. 웹은 `npx eas-cli@27.4.1 deploy:alias --help`로 현재 문법을 확인해 기존 identifier `ypn609gfct`를 beta에 재연결한다. 소스만 복원해도 운영 DB 새 참여 데이터를 drop하지 않는다. 이 작업은 비용/유료 가입이나 새로운 배포 대상을 만들지 않았다.
- 다음 선택 작업: 실제 일반 사용자 두 계정 JWT/Storage HTTP E2E, 실기기 PWA/native/접근성, 독립 DB/Auth/Storage 복원 리허설, Gemini 무료 등급 재확인. low7개 원인 deepmerge의 공식 수정판 추적, 소개 포스터 최적화·사용권 확인. 완료된 화면 개발과 이 운영 한계를 구분한다.

- 사용자 최신 지시대로1~5단계와 로컬 통합 gate를 끝낸 후 GitHub/기존 beta 일괄 게시를 진행한다. 배포 식별자 확정 전에는 외부 완료로 안내하지 않는다. 이전 소스 main `3ad201b`, EAS `ypn609gfct`, 대상 `d701494e-4875-45b4-b9c4-feb15dac3e85`/alias `beta`.
- 구현/자산/개인정보/초안 복구 계약: `PROFILE_REPORT_REDESIGN.md`. 프로필 내 피드/보관함, 실제12유형 리포트/그래프/Light·Core 근거/반별점/공유 미리보기·숨김, 상세/동의 보존, 기록 배치/gradient/태그·모달, 계정별 백업/JSON 방어/저장 후 정리 실패 보완.
- check38파일288테스트, isolated feed SQL18검사, npm ci 재현, 웹47경로/97산출물 비밀 검사, iOS/Android JS export 성공. 웹 `entry-982b7369139e4303feb8c114aa0fa4fc.js`, PWA `009a745c07935fac`. source/history secret guard 성공. npm high/moderate0; deepmerge 원인 low7개는 미수정판/빌드 설정 경계로 문서화했다.
- 로컬8083 데모 Light3편/Core1편 완료·초안 저장/새로고침 복원·Q1~Q5/수동 매거진 편집·대표 키워드 제거/추가·캘린더4·평균4.9·유효3편 임시 장면형·12유형 상세·공유 집계/숨김 복원·내 피드/보관함 확인. 리포트/프로필320·402·1280 넘침0. 익명 별도8084에서 report/details/Light/Core/profile 로그인 차단 확인. 증거 ignored tmp/figma-stage45-20261105.
- 사용자 승인 후 `202611050001_feed_blocks.sql`만 명시적 remote `vthswebqroygpbmxpqaj`로 적용했다. SHA256 `a36da7817365790c605d67373d4188a9df129c9b4e47b6c5c7ed2aab76ca1092`. migration ledger 없음→db push/과거 전체 replay 금지. 사전/사후 restricted role·RLS/direct grant/postcondition 통과. 공개키 HTTP19개 차단, synthetic auth/movie 잔존0.
- 기존 record_isolation/free_community/Light/Core rollback 검사 통과. 구 Light/Core 검증이 기존 회원을 fixture owner로 선택하는 점을 발견해 합성 계정/영화로 변경 후 재실행했다. 첫 실행도 전부 rollback됐으며 기존 기록 영구 변경 없음. 실 JWT A/B·signed URL/업로드 HTTP·Gemini 생성/기기 권한/OS 공유·기기 바이너리/전체 DB 복원은 미검증이다.
- 무료 정책: 비디오/유료 티켓/유료 AI는 UI 안내만.12유형 무료 AI 확인 기한(11월3일) 자동 연장 없음. 규칙 리포트와 수동 기록 유지. 기존 계정 미표시 전역 로컬 백업은 원본 보존/자동 불러오기 금지, 서버 초안 유지.
- 최종 외부/CI/Git 결과는 아래에 확정한다. 롤백은 소스 tag/기존 EAS alias만, 새 테이블·참여 데이터 삭제 금지. 상세 한계와 재현은 `FIGMA_RELEASE_QA_2026-11-05.md`.

## 2026-11-05 Figma 3단계 로컬 완료 / 다음4단계

- **우선 지시 유지:** 다섯 단계와 최종 통합·보안 검증 전 stage/commit/push/tag/외부 배포 금지. 1·2단계의 미커밋 변경을 보존했으며 main HEAD `3ad201b`, 기존 beta deployment `ypn609gfct`는 그대로다. 운영 DB/키/정책/사용자 데이터를 변경하지 않았다.
- 화면·데이터·권한·무료 경계는 `FEED_REDESIGN.md`. 원본26:208의7개 화면/카드를 대조해 새 인기/팔로우 피드·상세·작성, 영화/투표/익명 질문 블록·댓글/한 단계 답글/공감·사진/저장/신고·내 글/저장한 글·7일 휴지통·계정별 수동 초안을 연결했다. 기존 Light/Core/랭킹/큐레이션/컬렉션은 `feed-library.tsx`로 이동하고 section 링크와 신고 사유/댓글 작성자 프로필 연결을 보존한다.
- 비디오는 원본 버튼과 비용/쿼터 미승인 안내만 제공한다. 업로드·변환/유료 API·새 AI를 연결하지 않았다. 인기/검색은 불러온 최근20개씩의 데이터 안에서만 계산/검색한다고 표시한다. 메시지 슬롯은 다른 콘텐츠 메뉴/DM 준비 안내다.
- 새 `202611050001_feed_blocks.sql`은 **운영 미적용**. Postgres/WASM 메모리 DB에 실제 community baseline+새 migration을 실행해 합성 authenticated/anon A/B/C 역할로18개 검사 성공. 새 테이블 직접 접근/anon RPC/타인 편집/사진 위조 차단, 중복 투표/한 번의 팔로워 익명 응답, 응답 DTO 식별자 비노출, 답글 깊이/공감/삭제 표식, 잠금/숨김 후 재응답 거절/응답50개 제한/비공개 전환을 검사했다. 설치/실행은 해당 계약 문서와 `npm run test:feed-db` 참고. 제품 dependency/lock 변경 없이 ignored tmp에 PGlite0.5.15만 사용했다.
- 실계정은 새 capability 미설치 시 기존 RPC로 기존 글/사진/공감/루트 댓글을 유지한다. 새 투표·질문·답글·댓글 공감은 최종 DB 적용 대기 메시지로 실패하며 새 블록을 버려 저장하지 않는다. 새 기능 전체는 지금 **로컬 데모와 격리 DB에서만 검증**된 상태다. 운영 전 실제 JWT 두 계정·Storage signed URL/소유권 및 migration 전체 조합 검증/필요한 변경 승인 게이트가 남았다.
- 최종 `npm run check`: 원본 SVG20개+기존 자산 일치, typecheck/lint,36개 파일265개 테스트 성공(3단계34개 추가), source secret guard439개 성공. `npm run build:web`:46경로/산출물96파일 secret guard 성공. 최종 번들 `entry-a3de324526d23d20cf6fb2171563d659.js`, PWA cache `02f42fded07dbbd9`. 개발 빌드의 NO_COLOR/FORCE_COLOR 안내는 브라우저 오류와 구분한다.
- 브라우저8083 데모: 투표/변경(인원1 유지), 익명 동의 누락 안내/응답 저장, 타인 메뉴의 편집/삭제 없음, 빈 댓글 포커스/저장/답글/댓글 공감, 본문 누락 스크롤·포커스, 영화·투표·질문 동시 작성/공개 확인/저장, 참여 후 투표 변경 거절, 비공개 전환·내 글 조회, 삭제 이중 확인→휴지통→비공개 복원, 미완성 초안 저장/복원/명시적 버리기, 기존 Light 섹션/일상 복귀, 비디오 미연결 안내를 확인했다. 실제 계정/게시물/사진 업로드·신고 제출/AI는 실행하지 않았다.
- 피드·상세·작성 각각320/402/1280px 넘침0. 최종 bundle 로드·브라우저 콘솔 error/warn0. 작성 질문 카드는 source와 동일한 x21/y366/359×118, 입력 x35/331×39를 측정했다. 네이티브 키보드/기기 글꼴 래스터화·실데이터 줄바꿈까지 오차0이라고 주장하지 않는다. OS 상태바/키보드 비트맵은 그리지 않는다. 증거는 ignored `tmp/figma-stage3-20261105`의 원본2장, `final-feed-*`, `final-detail-*`, `final-editor-*`, `editor-restored-402.png`.
- 새 비로그인8084 origin에서 `/post/<id>`→returnTo를 보존한 welcome, `/post-edit`→welcome 차단을 확인했다. 임시 탭8은 닫고 서버8084(session59634)를 종료했다. 실제 사용자8081 저장소를 건드리지 않았다. 최종 `/feed` 결과 탭6 유지/임시 viewport 복구. 기존 정적 preview8083(session85011)는 실행 중이며 변경 후 재빌드/새로고침 필요.
- 다음: **4단계 프로필/취향 리포트(`15:335`)**, 기존12유형 엔진·무료/동의 조건 유지. 이후5단계 기록 잔여/전체 통합·계정 격리/보안 검증, 승인된 운영 DB 적용, 롤백 기준 확인 후 GitHub+기존 beta 일괄 게시. 아직4·5단계나 최종 운영 검증을 완료한 것으로 안내하지 않는다.

## 2026-11-05 Figma 2단계 로컬 완료 / 다음3단계

- 우선 지시 유지: **5단계와 최종 회귀·보안 검증이 모두 끝나기 전 stage/commit/push/tag/배포 금지**. 1단계 미커밋 작업을 보존하며 main HEAD3ad201b·외부 beta deployment `ypn609gfct`를 변경하지 않았다. 새 서버/유료 서비스를 연결하지 않았다.
- 2단계 범위와 한계는 `EXPLORE_REDESIGN.md`. `/search` 허브, `/explore-list` 목록/URL 필터·검색, 기존 `/movie/[id]` 상세를 재구성했다. 무료 후보 혼합·완료 기록/초기 취향 기반 이유·상황/니치·취향 밖 공개·공개 컬렉션·연관 영화, 기존 기록 시트/보고 싶어요/컬렉션/상세 메타·OTT·출처 진입을 연결했다. 공개 리뷰/매거진은 기존 최신50개 중 일치분으로 명시한다.
- 데이터/권한: DB/RLS/RPC/Edge Functions/계정/기록을 변경하지 않았다. 예시 UUID를 실후보에 섞지 않고 실계정 예시 저장을 막는다. 개인화/보고 싶어요 비동기 결과를 계정별로 분리한다. 공감/댓글 요약 카드는 기록 상세에서 기존 동작을 사용한다. 개인정보·동의·무료 AI 기한을 테스트로 바꾸지 않았다.
- 원본 자산: 상황 사진3개+SVG18개, 기존 폰트·벡터 렌더러·rail 재사용. 내비게이션 대응 활성/비활성 상태도 원본으로 보완했다. `npm run design:check`를 check/build에 연결해 소개7개와 탐색18개 XML·intrinsic 크기를 검사한다. 기기 문자 렌더링/OS chrome/실데이터 줄바꿈까지 오차0이라고 주장하지 않는다.
- 최종 검증: `npm run check` typecheck/lint·34개 파일231개 테스트 성공(2단계22개 추가). `npm run build:web`46경로·source406/output96파일 secret guard 성공. 최종 번들 `entry-1f4fafa9c45a9959a5b72572bd96bc9c.js`, PWA cache `d65849298e3e8ba3`. `git diff --check` 성공(CRLF 안내만 있음), lockfile/의존성 변경 없음.
- 로컬 브라우저: 비율0/100/70 키보드 조절·새로고침 복원, 상황→목록, SF/4.0/정렬 필터·URL 복원, 취향 밖 영화 공개, 기존 `/search?query=`→검색 목록, 빈 검색0편/초기화8편, 인셉션 상세→기록 시트→Light 영화 확인, 데모 보고 싶어요 실계정 게이트를 확인했다. 실제 계정 쓰기/공감/사진/공유 제출/실제 OTT 최신성·실기기/native 바이너리는 미검증이다.
- 320px 목록/상세·허브, 402px 허브, 1280px 허브 가로 넘침0. 최종 콘솔 error/warn0·최종 번들 로드, 상황 이미지3개160×160 로드 성공. 402px 대표 제목 y470은 source와 일치, 키워드 섹션 제목은 source796/실제797로1px 차이가 있다. Figma 샘플이 아닌 실제/데모 데이터와 빈 상태에 따라 카드 길이는 달라진다. 증거는 ignored `tmp/figma-stage2-20261105`의 ref3장, `final-hub-402.png`, `final-hub-320.png`, `list-320.png`, `detail-320.png`, `detail-402.png`.
- 익명 게이트는 새 loopback8084 origin의 `/explore-list`→welcome으로 확인했다. QA 탭은 닫고 해당 임시 서버는 종료한다. 사용자 실제8081 저장소는 변경하지 않았다. `http://localhost:8083/search` 결과 탭을 유지하고 임시 viewport를 복구했다. 8083 정적 미리보기(session85011)는 계속 실행한다. 수정 후에는 재빌드/새로고침이 필요하다.
- 다음: **3단계 피드·상세·작성·첨부/투표/익명 질문·댓글/답글**. 먼저 Figma 문맥·기존 데이터/RPC/권한을 대조하고 운영 적용은5단계 일괄 게시 게이트와 필요한 승인에 맞춘다. 현재1·2단계 변경/문서/자산을 함께 보존한다.

## 2026-11-05 Figma 5단계 · 1단계 로컬 완료 / 게시 보류

- **우선 지시:** `FIGMA_IMPLEMENTATION_PLAN.md`의 5단계를 단계별 로컬 실행/검증한다. 전 단계 및 최종 회귀·보안 검증 후에만 GitHub commit/push와 기존 beta 배포를 한 번에 한다. 이번 단계에는 stage/commit/push/tag/배포하지 않았다. main HEAD3ad201b와 기존 외부 beta `ypn609gfct`는 그대로다.
- 1단계: 원본 스플래시·소개4장, 벡터7개/포스터4개, 다음/건너뛰기/예시 체험, 인증·필수 취향 설정을 거치는 일회성 Light/Core 진입. 기존 사용자·공유 링크 우선순위/서버 권한/실제 기록은 보존했다. 30분 의도와 기기 소개 표식만 로컬 저장한다.
- 최종 `npm run check`: typecheck/lint·32개 파일209개 테스트 통과. `build:web`:45경로·소스/출력 secret guard 통과. manifest7개 원본 크기/XML 일치, `git diff --check` 통과. 최종 번들 `entry-4c9869ea9a2450b9530e210c07eeceab.js`, PWA cache `6b4bc3e5fe1d9a58`.
- 브라우저 정적 빌드: 다음/예시 체험·Core→로그인 안내→로컬 데모→취향→Core·홈 재방문·Light·건너뛰기, 320/402/1280px 넘침0/긴 소개 스크롤/직접 page3·4 hydration·콘솔 error/warn0. 실제 계정/AI/마이크/서버 데이터 쓰기는 하지 않았다. OS chrome은 앱 콘텐츠와 구분하고 영화 포스터 원본을 유지한다. 실기기 검증은 미실행.
- 실행 중: `npm run preview:web`, localhost8083, exec session85011. 사용자 결과 탭 `http://localhost:8083/intro`를 유지하고 viewport를 복구했다. 원래 사용자8081 브라우저 저장소는 바꾸지 않았다. 우리가 시작했던 dev8082(session85022)는 정적 최종 빌드 전에 종료했다. preview는 HMR가 없으므로 후속 수정 후 build:web/새로고침한다.
- 로컬 QA 증거: ignored `tmp/figma-stage1-20261105`. 다음 작업은 **2단계 탐색/영화 목록·상세**. 이전 검토 문서와 현재 미커밋 작업을 보존하고 이후 단계도 게시하지 않는다. 최초 원본/자산 맥락과 구현 계약은 plan 및 `assets/figma-intro/README.md`에 남겼다.

## 2026-11-05 Figma 회색 5개 구역 구현 대조 (검토만)

- 최신 비교는 `FIGMA_GAP_AUDIT_2026-11-05.md`. Figma 파일의 리뷰2:453/프로필15:335/피드26:208/탐색26:776/스플래시+온보딩26:1619를 현재 beta 데모 UI와 소스3ad201b에 대조했다. 홈1:27은 회색 구역 밖이다.
- 리뷰 핵심·프로필 기본·12유형 계산은 재사용 가능. 새 온보딩4장/스플래시, 탐색 허브·추천비율·목록/상세, 피드 새 UI·영화/투표/익명질문/비디오·일상 답글/댓글 공감, 리포트 상세 UI·분리 서술 인사이트가 주요 잔여다. 고정 실험실 투표/리뷰 답글은 피드 새 기능과 별개다.
- Figma5개 구역 및 앱 대표 화면을 ignored `tmp/figma-audit-20261105`에 저장·열어 확인했다. 데모이므로 실계정 피드/저장·AI 실제 호출은 미검증. 코드/DB/사용자 데이터 변경·Git push·배포 없이 검토 문서만 로컬 작성했다. 추천 다음 단계는 온보딩→탐색/영화상세→피드→리포트/잔여 마감이며 사용자 개발 지시를 기다린다.

## 2026-10-28 공개키·계정 격리 확인 및 공통 검사 등록

- 사용자가 공개 Supabase 키로 타인 기록 조회/수정이 가능한지 확인하고 모든 프로젝트의 보안 검사에 같은 항목을 넣도록 요청했다. `ACCOUNT_ISOLATION_QA.md`가 최신 결과와 한계다. 운영 프로젝트의 공개키만 사용한 실제 HTTP12개 모두 거절/빈 결과. 관리자 조회 RPC의400은 명시적 `admin_view_reviews_required`이며401만 기대하는 잘못된 판정을 보완했다.
- `supabase/tests/record_isolation.sql`은 랜덤 합성 A/B·Light/Core/private/public/draft 및 사진 메타데이터를 한 ROLLBACK 트랜잭션에서 검증했다. 실제 authenticated/anon 역할·auth.uid를 assert하고 소유자 생성/수정/삭제 양성 대조, 타인의 조회/수정/삭제·owner 위조·답변/태그·저장 RPC·관리자 승격·사진 폴더 위조 차단과 의도된 공개 읽기를 모두 통과했다. 최종 합성 계정/영화 잔여0. 실제 사용자 데이터·서버 정책·키는 바꾸지 않았다.
- `scripts/check-anonymous-access.mjs` 문법·secret guard와 보안 계약/키 보호 회귀25개 통과. 앱 코드 변경이 없어 기존 외부 `beta` deployment `ypn609gfct`를 유지하며 새 배포는 하지 않는다. 두 실제 회원 JWT 브라우저 로그인·실파일 signed URL 만료는 미실행이며 DB 역할 검사와 구분한다.
- 개인 공통 AGENTS에 `보안 검사 / 보안 점검` → `$check-security`, 새 개인 skill 및 기존 check-release의 보안 기준을 추가했다. 두 skill 공식 validator 통과. 사용자 기본 Python에 YAML이 없어 무료 PyYAML6.0.3을 ignored `tmp/skill-validator-deps`에만 격리해 검증했고 프로젝트/시스템 의존성은 바꾸지 않았다. 새 기기에는 개인 지침/skill 이관이 필요하다.

## 2026-10-28 API 키 위치 점검·업로드 차단

- 최종 게시: 구현 `8af4dc9` main push 및 [CI40542736766](https://github.com/hoya0328/flick/actions/runs/40542736766) 전체 성공(secret gate/설치/audit0/typecheck/lint/195테스트/웹 빌드). 이 PC의 `core.hooksPath=.githooks` 연결 후 실제 commit에서 staged16파일 검사, push에서 이력732blob 검사가 통과했다. 기존 hook 설정/활성 hook은 없었다. 새 clone은 별도 연결이 필요하다.
- 기존 EAS 프로젝트의 `beta`에 deployment `ypn609gfct`를 게시했다. 별칭의 이전 응답이 남아 같은 deployment에 `--alias beta --id ypn609gfct`로 재연결했고 새 target/`--prod`는 사용하지 않았다. 최종 고유·beta 번들 HTTP200 및 로컬 SHA256 일치, 알려진 비밀 패턴0을 확인했다. beta 브라우저에서도 `entry-ab9617db3530a0e918dbeaf2dada004c.js`·콘솔 error0. 고유 배포의 `/.env`403, `/.env.local`404, `/.env.production`404로 env 내용 미제공을 확인했다. 공개용 키 사용은 정상이며 실제 데이터·동의·권한 변경은 없다.
- UI QA는 로컬 로그인/기존 홈 복원·외부 로그인 화면만 읽기 전용 확인했다. 증거는 ignored `tmp/secret-guard-beta-20261028.png`. 로컬8081은 실행 상태로 유지하고 임시 viewport를 복구한다. 신규 유료 도구/요금제/키 회전은 없다.
- 사용자 요청: `.env`/API 키 위치 설명, Git 업로드 및 유출 방어. 실제 로컬 `.env.local`은 공개 Supabase URL/publishable 두 값만 있고 기존에도 ignored였다. 추적 env는 빈 `.env.example`뿐이다. 운영 Supabase secret 이름 목록만 읽어 Gemini/TMDB/service-role 등록을 확인했다. 키 값·CLI 인증 저장소는 출력하지 않았다. 관련 계약은 `SECRETS_MANAGEMENT.md`.
- 변경: `.gitignore`에 env 백업/변형·인증서·서비스 계정 파일을 추가했다. Node secret guard는 추적/미추적 소스·staged index·도달 가능한 Git 이력·웹 출력 및 공개 env allowlist를 검사한다. source/check/build 전후/CI 게이트, local start/web 게이트, 공개용 키 자리의 서버 키를 거부하는 런타임 검사를 추가했다. 서버 함수/키/DB/RLS·호스팅 식별자 변경은 없다.
- 검증: typecheck/lint·31파일195테스트 및 웹43경로 성공. 이력716개 blob 및 웹86개 파일에서 알려진 비밀키 패턴 미검출. 새 합성 회귀는 키 종류·민감 경로·실제 gitignore·로컬 env·Git index와 워킹 파일 차이·빌드 결과 및 값 없는 오류를 검사한다. 확정 CI/배포·로컬 hook 연결 결과는 아래 추가한다. 최종 bundle `entry-ab9617db3530a0e918dbeaf2dada004c.js`, PWA cache `ed00fe8656106ce9`.
- 한계: 형식 기반 검사는 완전한 유출 부재를 보장하지 않는다. 이미 노출된 실제 비밀키는 ignore/파일 삭제로 회수되지 않으며 먼저 폐기/재발급해야 한다. 이번 검사에서 실제 노출은 발견하지 않아 키 회전·Git 이력 재작성은 하지 않는다. 새 clone의 hook 연결 방법을 문서에 남겼다.

## 2026-10-28 남은 의존성 보안 경고 수정

- 최종 게시 완료: 보안 수정 `eca5c4d`, 공유 로그인 hydration 보완 `3619771`을 main에 push했다. 최종 구현 CI [40535913021](https://github.com/hoya0328/flick/actions/runs/40535913021) 전체 성공(설치·전체 audit·typecheck/lint·173테스트·웹 빌드). 기존 프로젝트/`beta`에 최종 deployment `44gom371yg`를 게시했고 외부 DOM 번들 `entry-c64d8773e71fe6a61b624981d29aa306.js` 일치를 확인했다. 직전 보안-only deployment는 `hqvmxxkgrr`다. 유료 연결·요금제 변경은 없다.
- 최종 외부 QA: 새 탭에서 공유 `/welcome?returnTo=...` 직접 진입과 일반 `/welcome`의 안내·데모 표시 분기 정상, 콘솔 error0으로 #418 해소를 확인했다. URL 인코딩 한글 검색 입력 복원 정상(외부 demo이므로 실제 인증 검색 결과를 검증한 것은 아님). 320/402px 가로 넘침0. 증거는 ignored `tmp/security-beta-20261028.png`. 로컬8081 재가동 및 기존 홈 복원을 확인했다. 임시 viewport는 복구한다. 실제 계정 데이터·동의·프로필 공개·권한은 변경하지 않았다.
- 추가 QA 보완: 외부 `/welcome?returnTo=...` 직접 진입의 SSR/클라이언트 문구 차이(#418)를 `useSyncExternalStore` hydration snapshot으로 보완했다. 인증·returnTo 검증은 그대로다. 회귀2개 추가 후 typecheck/lint·30파일173테스트 및 웹43경로 성공. 최종 번들 `entry-c64d8773e71fe6a61b624981d29aa306.js`, PWA cache `20607dae1860e106`. 루트·manifest·SW·offline·192/512아이콘 HTTP200도 확인했다.
- 사용자가 남은 경고 설명·무료 수정·외부 배포를 요청했다. 현재 계약/근거는 `SECURITY_REMEDIATION.md`. 이전 전체 audit13개(high5/moderate8), 운영-only10개를 실제 patched decoder/image-size/Zod/UUID/Vitest/Vite로 수정했다. audit 제외/무시 또는 SDK 강제 변경은 없다. Expo57.0.20/Router57.0.19/RN0.86.2와 운영 데이터·권한·AI 조건·호스팅 프로젝트는 유지했다.
- 설치 재현: `npm ci` 완전 재설치 성공(887개). postinstall에서 query-string7.1.3 원본 SHA·실제경로·decoder0.5 버전을 검증하고 CJS→ESM 한 줄 연결을 재적용한다. Node22.12+/24+ 필요, `--ignore-scripts` 금지. `check`/`build:web` 전 무수정 check가 있으며, CI의 전체 audit는 moderate 이상이면 실패한다.
- 로컬 검증: typecheck/lint·30개 파일171개 테스트 통과. 보안 회귀16개는 한글/이모지/복귀 URL, malformed UTF-8, 손상 ICNS/HEIF, 실제 CLI Zod4/plugin/output/MCP schema, 실제 Metro PNG/SVG, Xcode UUID, SHA 변조/패치 누락 fail-closed를 포함한다. 공격성 입력은 timeout/heap 제한 child 또는 합성 fixture에만 사용했다.
- 전체 `npm run security:audit` 및 완전 재설치 결과 알려진 취약점0건. 웹43개 경로를 빌드했다. 병렬 Metro 캐시 읽기 경고는 full-crawl fallback으로 회복됐고 서버를 멈춘 `--clear` 최종 빌드에서도 같은 `entry-193d5e61f79866bdb92250631d6df956.js`가 생성됐다. 캐시 역직렬화 경고는 재발하지 않았다. 최종 외부 검증/배포 식별자는 아래에 추가한다.
- 무료 native JS 검증: `expo export --platform ios --platform android --no-bytecode` 성공, iOS1415/Android1551모듈·47자산. 결과는 ignored `tmp/security-native-20261028`. 실제 native 바이너리 빌드·기기 실행·스토어 배포는 아니며 유료 EAS Build를 호출하지 않았다.
- 브라우저: 로컬 실계정 기존8개 완료 기록·취향 카드 유지, 엄격한 returnTo→비공개/없는 공개 프로필 안내, URL에 인코딩한 ‘센과 치히로의 행방불명’ 검색 입력 복원, 320px 넘침0·콘솔 error0을 확인했다. 실제 기록/프로필 공개/계정 권한/AI 동의를 테스트로 변경하지 않았다.
- 롤백: `rollback/security-before-2026-10-28` (`9231b64`), 직전 웹 `98eadriv28`. 롤백하면 의존성 경고도 돌아올 수 있다. 새 무료 보안 도구/기존 CI만 사용하며 유료 서비스나 요금제는 추가하지 않는다. 알려진 npm 경고0은 전체 침투/백업·복원/실기기 검증 완료라는 뜻이 아니다.

## 2026-10-27 무료 커뮤니티·PWA v1

- 최종 게시: 기능 `9238856`, 공유 링크 보완 `ad08d84`, UI/legacy 회귀 보완 `a5fe425`를 기존 GitHub main에 push했다. 최종 구현 CI [40525646538](https://github.com/hoya0328/flick/actions/runs/40525646538) 성공. 기존 EAS 프로젝트 `d701494e-4875-45b4-b9c4-feb15dac3e85`, `beta`를 유지하고 최종 deployment `98eadriv28`의 번들 `entry-40a59864f76914aaef30600dfbea5728.js`를 외부 DOM과 HTTP에서 확인했다. 신규 유료 연결/요금제 변경은 없다.
- 외부 최종 QA: demo의 새 일상/팔로잉 탭·실계정 로그인 게이트, 공유200 진입→공개 프로필 로그인 안내→returnTo 유지, manifest/SW/offline/192·512아이콘200을 확인했다. 320/402px 가로 넘침0·중첩 button0, 최종 새 외부 탭 콘솔 오류0. 공개/글 작성·관리 권한을 실제 계정에 켜거나 테스트 글을 남기지 않았다. 증거는 ignored `tmp/free-community-feed-beta-20261027.png`. 임시 뷰포트는 복구하고 로컬 서버8081은 유지한다.

- 구현: 공개 동의형 프로필/검색/링크·팔로우/본인 관계 목록·일상/팔로잉 피드 CRUD/사진/공감/댓글/저장/신고·7일 private 복원·인앱 알림/읽음·보관함 연결·PWA 설치 안내/오프라인 안내. 실제 읽기/쓰기 권한은 RPC에서 검증한다. 기존 Light/Core/12유형·AI 무료 조건은 유지했다. 사용자 계약/운영 한계는 `FREE_COMMUNITY.md`, `FREE_RELEASE_QA.md`.
- 서버: 사용자가 SQL 운영 반영과 계정 삭제 함수 갱신을 각각 승인했다. 기존 `vthswebqroygpbmxpqaj`에 migration003 및 `delete-account`를 적용했다. 신규 공개/일상 신고 관리 권한은 OFF이며 관리자 기존 권한은 유지했다. 실제 사용자 기록/프로필 공개/권한은 QA로 바꾸지 않았다.
- 검증: typecheck/lint·29개 파일155개 테스트, 웹43개 경로. 운영 적용 전 동일 DDL+합성 데이터 ROLLBACK 검증, 적용 후 `supabase/tests/free_community.sql` 전체 통과 및 모두 ROLLBACK. 본인CRUD/사진/비공개·중복관계·팔로잉·댓글·알림 격리·moderation·휴지통·anon·합성 cascade를 검증했다. 사진 포함 계정 탈퇴는 HTTP mock만 실행했다. 배포된 삭제 함수의 OPTIONS200/인증 없는 POST401도 확인했다. legacy null 프로필 표시와 홈 카드 버튼 중첩을 보완하고 회귀 테스트를 추가했다. 홈402/1280px 가로 넘침0·중첩 button0·새 검증 탭 콘솔 오류0.
- 공유: 외부 static dynamic 경로는 HTTP404 fallback이어도 클라이언트 화면/로그인 안내가 정상 로드됨을 확인했다. 생성 프로필 링크는 이를 피하도록 정적200 루트+엄격한 `returnTo`로 보완했다. 로그인/온보딩 후 공개 프로필로 복귀하며 demo는 실제 커뮤니티 인증 게이트를 우회하지 않는다. 새 호스팅/SSR 전환은 하지 않았다.
- UI: 로컬 실제 계정의 기존8개 완료 기록과12유형 결과 유지, 팔로워/팔로잉0, 공개 OFF/운영 권한 OFF를 확인했다. 320px 글 작성의 빈 본문 안내·스크롤/포커스, 공개 동의 안내, 알림/검색/일상 피드 빈 상태에서 가로 넘침0px. 실제 공개 프로필이나 시험 게시물을 사용자 계정에 만들지 않았다. 최종 외부 증거/배포 식별자는 아래에 추가한다.
- 보안: 기존 전이 패키지9개 호환 갱신으로 critical을 제거했다. Expo57/Router57/RN0.86 보존. 남은 npm 운영 감사 경고10개(high4/moderate6)는 `FREE_RELEASE_QA.md`에 경로와 한계를 기록했으며 강제 SDK 변경은 하지 않았다. 로컬 서버는 `--localhost --port8081`로 재시작했다.
- 운영 위험: 운영 전체 DB/Auth/Storage 백업·격리 restore, 실기기 PWA 설치, 일회용 실제 Auth/Storage 탈퇴 E2E는 미실행이다. Git 소스와 사용자 JSON 내보내기를 전체 데이터 백업으로 안내하지 않는다. Storage→Auth 삭제는 원자적이지 않아 부분 실패를 명시한다. 관리자·감사·편집 콘텐츠 소유 계정은 사진 정리 전에 보호한다.
- 롤백: `rollback/free-community-before-2026-10-27` (`95ba833`)와 직전 EAS `tz82llyq8q`. 새 데이터/테이블을 삭제하지 않고 코드/웹만 복원한다. 새 RPC는 구버전 클라이언트와 공존하며 기존 signed URL 만료는최대60초다.
- 다음: 실제 베타 사용자 공개 동의/피드 피드백, 무료 AI 확인 기한(11월3일22:32:51 KST) 재확인, 별도 SDK 보안 패치 호환 검토, 개인정보를 보호하는 로컬 전체 백업/restore 리허설. 유료 SMTP·OS push·유료 AI·새 배포 대상은 연결하지 않았다.

## 2026-10-27 12유형 취향 리포트

- 최종 게시: 구현 `8f33d40` 및 `rollback/taste-before12-2026-10-27`를 GitHub main/태그에 push했다. 기존 EAS 프로젝트 `d701494e-4875-45b4-b9c4-feb15dac3e85`, `beta` 주소를 유지하며 deployment `tz82llyq8q`, 외부 번들 `entry-102def7dcf72c8e5662a95e29dfd3c43.js`를 DOM에서 확인했다. `/taste-insights`와 `/profile`에서 사용할 수 있다.
- 최종 UI 검증: 로컬 실제 계정 320/402px 카드·상세, 외부 데모 320/402px 데이터 부족·12비중·원문 미전송 안내를 확인했다. 가로 넘침 0px, 최종 외부 콘솔 오류 0건. 외부에서는 데모로 검증하고 실제 Gemini·본인 캐시 검증은 로컬의 동일 운영 Supabase 계정으로 수행했다. 이전 Light/Core 저장 SQL 회귀도 통과했고 모든 SQL QA 쓰기는 롤백했다. 외부 증거는 ignored `tmp/twelve-taste-beta-20261027.png`; 임시 뷰포트는 복구하고 로컬 서버는 유지한다.

- 사용자 최초 명세 v1.0과 12유형 유지 확정에 따라 구현했다. 전체 계약/한계/무료 운영은 [TASTE_TYPES.md](TASTE_TYPES.md). 화면은 기존 마이페이지 카드와 `/taste-insights`에 연결하고, 기존 기록·추천·계정 흐름은 보존한다.
- 규칙 엔진: 질문 맥락/실제 선택/Light 감상 요소, 고유 영화·모드별 최신 완료 기록, 40:60, 별점/품질/최신성, 3/8편 상태와 6%p·긍정 근거 4편 조건. 12비중·키워드 TOP5·Light 포인트 TOP3·고/저별점 표현·별점 분포를 실제 데이터로 표시한다. 없는 저장 이유/불명확한 수정 매거진 출처는 추측하지 않는다.
- 기존 무료 Supabase에 `202610270002_twelve_taste.sql` 및 `analyze-taste-review`를 적용했다. 기본 꺼진 별도 동의, 본인 전용 캐시, 인용 원문 검증, 캐시 경합/동의 철회/삭제, 원문 수정 무효화, 별점/생성 매거진 변경 시 캐시 재사용. 기록 저장 완료 이후 비동기로 분석하며 오류는 저장을 막지 않는다. 기존 데이터 최초 분석은 한 개씩 진행한다.
- 무료만 허용: 실제 AI Studio Klick 무료 등급 재확인. 계정 5/UTC일·2/분, 전체 30/UTC일. 플래그 확인 유효 기한은 2026-11-03 22:32:51 KST다. 무료 제공량/기한/연결 실패는 안내와 키워드 분석으로 복구한다. 유료 대체/자동 업그레이드/검색/Batch/유료 큐는 없다. 운영자가 결제 등급을 바꾸면 먼저 무료 플래그를 해제한다.
- 사용자가 로컬 실제 계정에서 직접 원문 분석에 동의하고 Core 한 개 분석을 실행했다. 실제 Gemini 성공 1건, 오류 0건, 서버 인용 검증/캐시 저장을 확인했다. 새로고침 후 완료 영화 8편 중 분석 가능 3→4편, Core 의미 분석 1편과 실제 비중이 갱신됐다. 사용자의 동의·결과를 임의로 철회/삭제하거나 추가 원문을 자동 일괄 전송하지 않았다.
- 검증: typecheck/lint, 26개 파일 134개 Vitest. 계산의 12유형·질문 부정 맥락·중복/수정/삭제·미매핑·별점/캐시/무료 차단 등을 검증했다. 실제 두 계정 SQL QA는 본인/공개 리뷰라도 타 계정 분석 차단·조작/근거 위조·원문 경합·동의 철회·리뷰 삭제 FK·중복/계정/전체 한도 통과. SQL QA 변경은 모두 롤백했다. 자동 테스트는 모델 의미 판정 정답률의 검증과 구분한다.
- 웹은 33개 경로 빌드. 402px 마이페이지의 실제 12유형 카드와 상세 진입을 확인했다. 최종 게시 결과는 이 항목 상단에 기록했다.
- 롤백: `rollback/taste-before12-2026-10-27` (`baba0d2`). 추가 데이터는 삭제하지 않고 소스/호스팅만 되돌린다. 무료 신규 호출만 중단하려면 `TASTE_FREE_AI_VERIFIED=false`로 설정한다. 다음 운영 작업은 무료 기한 재확인 및 베타 분류 정확도 평가다.

## 2026-10-27 마이페이지 Figma v1

- 최종 게시: 코드 `0604067`과 롤백 태그를 기존 GitHub main에 push했다. 기존 EAS 프로젝트/`beta` 별칭을 유지하며 deployment `1uvve224wv`, 외부 주소 `https://flick-film-journal--beta.expo.app/profile`, 번들 `entry-c5e94748d281cdc6a0385d24bea09f55.js`를 외부 DOM에서 확인했다. 새 유료 연결이나 배포 대상은 만들지 않았다.
- 외부 데모에서 프로필 소개 저장→새로고침 유지→기존 값 복구, 내 피드 준비 안내, 보관함 섹션을 검증했다. 외부 320/402px, 로컬 320/402/430px에서 가로 넘침 0px이며 최종 외부 탭 콘솔 오류는 0건이다. 증거는 ignored `tmp/profile-beta-proof-20261027.png`; 임시 뷰포트는 복구하고 로컬 서버는 사용자 테스트용으로 유지한다. 운영 프로필 실제 저장/사진 업로드는 사용자 계정 변경을 피하려고 UI에서 실행하지 않고 SQL 롤백 QA로 검증했다.
- 다음: 사용자 실제 계정으로 마이페이지 사용성 피드백을 받고, 보류된 12유형/일상 피드/팔로우의 범위가 확정되면 별도 작업한다. 현재 화면이 구버전이면 외부 beta 페이지를 새로고침한다.

- 범위: [PROFILE_REDESIGN.md](PROFILE_REDESIGN.md). `15:336` 캘린더·`15:501` 내 피드·`15:662` 보관함과 로그인된 댓글 #9~14를 확인했다. 원본 SVG 9개를 추가하고 기존 폰트·402px 캔버스·탭바를 유지했다. 실제 데이터/사용자 사진/포스터만 사용하며 디자이너 샘플 통계·게시물은 복제하지 않는다.
- 완료: 닉네임/소개/사진 편집, 완료 기록 기반 통계·키워드·감상 요소, 현지 자정·앱 복귀 시 오늘 갱신, 월 이동·날짜별 내 Light/Core 조회, 관심 영화·저장 리뷰·Core/편집 매거진·컬렉션 보관함. 로딩/빈 상태/실패 재시도/12개 단위 더보기를 제공한다.
- 기존 계정·비밀번호·취향 설정·관리자·내보내기·계정 삭제는 `/account-settings`로 보존했다. 내 피드는 준비 안내와 기존 내 리뷰 관리 링크만 제공한다. 12유형/팔로우/알림/프로필 컬렉션 확장은 보류다. 공유는 사용자 확인 후 닉네임+서비스 소개만 전송하고 개인 기록·이메일·소개·사진을 포함하지 않는다.
- 기존 무료 Supabase에 `202610270001_profile_and_saved_content.sql`을 적용했다. 새 프로필 저장 RPC와 저장함 조회 RPC는 본인 전용이며 저장한 원문이 숨김/삭제되면 제외한다. 편집 큐레이션의 보관/해제를 추가했다. `profiles.display_name`이 닉네임 기준이며 프로필 사진은 기존 비공개 사진 업로드 한도를 공유한다. 파일 선택 후 저장을 취소한 사진은 자동 삭제하지 않는다.
- 검증: typecheck/lint·24개 파일 102개 테스트, 33개 정적 웹 경로 빌드. SQL 실제 2계정 검증은 프로필/사진 소유권·입력 제한·본인 보관함·페이지·Light/Core 분리·비공개 전환·중복 저장·저장 해제를 통과했고 모든 테스트 쓰기는 롤백했다. 실제 계정 닉네임/소개/사진은 QA에서 변경하지 않았다.
- 로컬 실제 계정에서 기존 완료 8개·보관 영화 9개·다중 감상일 기록 2개를 확인했다. 320px 닉네임 오류의 입력란 포커스/안내와 공유 미리보기도 확인했다. 실제 공유 전송·사진 업로드·비밀번호 변경·계정 삭제는 실행하지 않았다.
- 롤백 소스: `rollback/profile-before-figma-2026-10-27` (`8886699`). 데이터는 삭제하지 않는다.

## 2026-10-26 집중 기록 Figma v1

### 최종 게시

- 구현 `ffac78f`, 완료 상태 보존 `b9065e6`, 사진 권한/공개 JSON 검증 `f0a04f6`을 GitHub main에 push했다. 변경 전 태그 `rollback/core-before-figma-2026-10-26`도 GitHub에 보관했다.
- 기존 EAS 프로젝트 `d701494e-4875-45b4-b9c4-feb15dac3e85`, beta 주소 `https://flick-film-journal--beta.expo.app` 유지. 최종 deployment `oq05n3889r`, 번들 `entry-b8e87b413a62cc44f276778eaf4f39bb.js`를 외부 DOM에서 확인했다.
- 외부 320px에서 별점 키보드 조절·질문 1회 변경 잠금·한 답변 후 그만하기→매거진→새로고침 복원을 확인했다. 320/402px 모두 가로 넘침 0px, 콘솔 오류 0건이다. 외부 검증은 데모/기본 가이드로 수행했고 실제 Gemini Q1~Q5·매거진·사진·저장은 로컬의 사용자 로그인 계정으로 같은 운영 Supabase에서 검증했다.
- 로컬의 완료 기록에서 초안 저장 후 나가기를 실행한 뒤 서버의 completed/private 상태가 유지됨도 재확인했다. 사용자의 비공개 `[개발 테스트]` 기록 1건과 테스트 배너 사진 1장은 보존했다. 실제 사용자 기록/계정은 삭제하지 않았다.
- 화면 증거는 ignored `tmp/core-beta-proof-20261026.png`에만 저장했다. 로컬 개발 서버는 사용자의 이어지는 테스트를 위해 유지하며, 임시 모바일 뷰포트는 검사 후 원상 복구한다.

- 확정 범위·보류·무료 정책: [CORE_REDESIGN.md](CORE_REDESIGN.md). 새 `/core-record`는 영화/별점 → 최대 5개 연계 질문 → 답변별 코멘트 → 계속/그만하기 → 매거진 → 안전한 문단 편집/사진/공개 범위 → 저장을 제공한다. 그만하기는 현재 답변으로 생성하며 제목+본문 최대 1,000자다.
- 기존 Light와 구형 Core는 보존한다. 새 기록은 `core_flow`/`save_core_review`를 쓰며 보관함·공개 읽기 전용 상세·홈 대표 사진을 연결했다. 계정 전환 시 편집기를 재마운트하고 계정별 로컬 백업을 분리한다.
- 기존 Free Supabase `vthswebqroygpbmxpqaj`에 `202610260001`/`202610260002`/`202610260003`를 적용했다. `core-photos`는 비공개, 장당 JPEG 250KB/계정 누적 16장/전체 160장, 매거진당 대표 1+본문 3장. 사진을 빼도 원본 저장소는 자동 삭제하지 않는다. 서명 URL은 비공개 전환 후 최대 60초까지 유효할 수 있다.
- 실제 AI Studio Klick 무료 등급을 확인했다. `CORE_FREE_AI_VERIFIED=true`를 설정하고 기존 두 함수에 새 모드를 추가 배포했다. `gemini-3.5-flash-lite`만 허용하며 질문 20/일·6/분, 매거진은 기존 초안 5/일·2/분을 공유한다. 무료 확인 실패/한도/장애는 유료 대체 없이 수동 편집으로 복구한다. 외부 음성·유료 이미지·검색 서비스는 연결하지 않았다.
- 실제 로그인 계정으로 Q1~Q5 코멘트 성공 5건과 매거진 성공 1건을 확인했다. 초기 8초 제한에서 지연 1건을 발견해 새 모드에만 코멘트 25초/매거진 30초, 클라이언트 35초 제한을 적용했다. 무료 응답은 여전히 느리거나 제한될 수 있다. 처음 실패한 답변은 보존됐다.
- 실제 브라우저에서 427자 AI 초안 생성 → 제목 수정/굵게/기울임/인용 → 1,000자 초과 차단 → 대표 사진 업로드 → 426자 비공개 완료 저장 → 보관함 → 다시 열기·새로고침 복원을 확인했다. QA 기록 제목은 `[개발 테스트] 곁을 내어주며 자라나는 이야기`, 사용자 계정의 나만 보기 1건으로 남기고 공개하지 않았다. 테스트 사진은 기존 공개 포트폴리오 배너이며 실제 사용자 사진은 업로드하지 않았다.
- DB 롤백 QA: 1개 답변 조기 완료, 반점 별점, 짧은 답변·잘못된 JSON 타입·소수 인덱스·분량·타인 사진 거부, 타 계정 수정/비공개 조회 차단, 공개 사진 조회 및 재비공개 차단. 기존 Light SQL 회귀도 통과했고 모든 SQL 테스트 쓰기는 롤백했다.
- 검증: TypeScript·lint, 23개 파일 95개 Vitest, 31개 정적 웹 경로 빌드 통과. Figma 원본 SVG 8개를 추가했으며 기존 벡터 원본 동기화 테스트도 통과한다. 402px 모바일 화면에서 편집기/요약을 확인했다.
- 제한: 서식은 선택한 문단 전체에 적용(문자 범위별 혼합 서식은 아님). 사진 선택은 모바일 웹 지원, 네이티브는 안내 UI. 마이크는 기기에 이미 설치된 한국어 로컬 인식만 가능하며 미지원 환경에서는 안내한다. 실제 마이크 권한/음성 수집은 QA에서 실행하지 않았다. 프로필/12유형은 보류 유지.
- 롤백 소스: `rollback/core-before-figma-2026-10-26` (`874a1fa`). DB 추가 컬럼·함수와 새 기록은 삭제하지 않고 소스/호스팅 버전만 검토된 롤백으로 되돌린다. 기존 EAS beta 대상 유지.
- GitHub 및 외부 배포 결과는 아래 최종 게시 항목에 기록한다.
- 사진 공개 정책은 리뷰 작성자와 실제 사진 소유자가 같은 경우만 허용한다. 인증 사용자가 자기 리뷰를 직접 UPDATE해서 타인 사진 경로를 붙이는 RPC 우회도 실제 롤백 QA로 차단했다. 공개 `core_flow` JSON은 읽을 때 별도 검증해 잘못된 타입·외부 URL·비정상 enum 객체가 독자의 화면을 깨뜨리지 않게 한다.
- 완료 기록을 다시 열고 초안 저장/나가기를 해도 기존 완료·공개 상태를 초안으로 내리지 않도록 보강했다. 수정 중인 내용은 기기 백업에 남고, 최종 기록 완료를 눌러야 서버 원본이 바뀐다.

## 2026-10-23 Figma 치수 재대조·SVG 전환

- 홈·기록 방식 선택창·검색/확인/별점·질문·로딩·대표 키워드/본문 화면을 Figma 원본 노드와 대조했다. 기준 폭 402px, 실제 OS safe inset만 반영하며 핵심 치수·의도적 예외는 [UI_FIDELITY.md](UI_FIDELITY.md)에 기록했다.
- 31개 원본 Figma SVG + 전문가 태그 3개 Twemoji SVG를 `DesignVector`로 통일했다. 로딩은 더 이상 PNG를 사용하지 않는다. 벡터 경로와 원본 viewBox를 유지하며 인스턴스별 ID 분리로 필터 충돌을 막는다. Inter/Pretendard를 로컬 제공하고 라이선스를 포함했다.
- 대표 키워드/Light 태그는 15px·36px로 수정하고 영화별 리뷰 카드에는 기존 대표 키워드 저장/표시를 유지했다. 문구·버튼·접근 권한·AI 동의·개인정보 안내는 보존했다. 검색 대기 상태와 저장 중 상태를 분리해 복원 시 저장 버튼이 잠기는 경쟁 상태도 수정했다.
- 22개 파일 84개 테스트, typecheck·lint를 통과했다. 402×904에서 별점 267×51 (x67.5,y386), 다음 360×53 (x21,y750)를 실측했다. 데모로 별점 드래그 5점·질문별 1회 변경 잠금·Q3/Q4 건너뛰기·Q5 후 키워드 종합을 검증했다. 320px 복원 화면에서 작성 완료가 활성화되고 가로 넘침은 0px였다. 430px 홈은 402px 중앙 캔버스·Light 카드 359×371·가로 넘침 0px·콘솔 오류 0건을 확인했다.
- 실제 계정 로그인/AI 재호출/운영 DB 저장은 이번 UI QA에서 수행하지 않았다. DB·API·권한은 변경하지 않았다. 데모 QA 초안은 로컬 기기에만 남는다.
- 코드 `8a15ad4`와 롤백 태그를 GitHub main에 push하고 기존 EAS beta에 배포했다. deployment `qlujbl3n9c`, 외부 고정 주소 `https://flick-film-journal--beta.expo.app`, 최종 번들 `entry-01c2b908b8cdab2acf4abb53ee6f7e7c.js`를 실제 외부 DOM에서 확인했다. 외부 402×779 기록 선택창의 Light/Core 버튼은 각각 x21,y635 / x21,y704, 360×56px였으며 가로 넘침 0px·콘솔 오류 0건이었다. 화면 증거는 ignored `tmp/ui-fidelity-proof.png`에만 보존한다. 이전 소스는 태그 `rollback/ui-before-vector-fidelity-2026-10-23`에서 복구할 수 있다.


## 2026-10-23 로고 회전·대표 키워드 표시 수정

- 로딩 마크를 `loading-mark.tsx`로 분리하고 원본 Figma 노드의 `assets/figma-review/loading-logo.png` 한 개로 교체했다. 94px 정사각형 중심에서 등속 회전하며 동작 줄이기 설정 변경을 반영한다.
- 홈 리뷰 카드의 고정 `Light` 태그 대신 사용자가 저장한 대표 키워드를 표시한다. `listPublicReviewFeed`는 기존 RPC 뒤에 ID 제한·public/completed 필터가 있는 메타데이터 단일 배치 조회를 수행한다. 피드·공개 상세에도 공통 `ReviewKeywords`를 적용했다. 빈 선택은 유지하며 스포일러 카드의 태그는 상세 안내로 감춘다.
- 화면 QA는 실제 컴포넌트와 가상 데이터만 사용하는 로컬 `tmp/review-display-qa/`에서 진행했다. 다른 회전 각도에서도 중심이 (201,160)에 고정되고 transform origin은 (47,47), 자연 이미지 크기는 94×94였다. 카드 하단이 `색채·잔상·몽환적인` 선택 순서로 표시되고 콘솔 오류는 없었다. QA 파일·화면 증거는 공개 저장소나 배포에 포함하지 않는다.
- Vitest에 기존 TypeScript의 `@` 별칭을 연결해 공개 피드 서비스의 실제 배치 결합도 테스트한다. DB·권한·AI 함수는 변경하지 않았다.
- 검증: typecheck·lint·21개 파일 81개 테스트와 30개 웹 경로 빌드를 통과했다. 실제 Supabase의 대표 키워드 JSON 경로 조회는 200이며 비로그인 결과는 0행이었다. 인증 계정의 실제 공개 리뷰 표시는 자동 서비스 결합 테스트와 가상 데이터 컴포넌트 QA로 검증했으며, 현재 브라우저 세션은 데모다.
- 코드 커밋 `71a4a92`를 GitHub main에 push하고 기존 EAS beta에 배포했다. deployment `ja0n76dq0u`, 최종 번들 `entry-1eb5bdadbf21d22de7ae4f6346e74593.js`를 외부 beta DOM에서 확인했다. 원본 로고 자산도 외부에서 200으로 제공된다. 이전 deployment `887dbhy3g1` 및 기존 Git 이력은 유지한다. QA 서버·탭과 임시 뷰포트는 정리했다.


## 2026-10-23 Figma Light 리뷰

- `/light-record`에 모드 선택→영화 확인→0.5점 드래그 별점→5개 질문→로딩→키워드·본문 종합→저장을 구현했다. Core 리디자인·음성·티켓 OCR은 제외한다. 상세 계약은 [LIGHT_REVIEW_REDESIGN.md](LIGHT_REVIEW_REDESIGN.md).
- `202610230001_figma_light_review.sql`을 기존 무료 Supabase 프로젝트에 트랜잭션으로 적용했다. 소유자 전용 새 저장 RPC와 `light_flow`는 구형 기록/API를 보존한다. 공유 AI 초안 Edge Function도 갱신했고 편집기 전체 코드가 로컬 소스와 일치함을 확인했다.
- 운영 DB 롤백 QA는 0.5점·5개 skipped·빈 감상/비정상 별점 거부·타 계정 private 조회/수정 차단을 통과했다. 실제 계정의 Gemini 생성 성공 응답은 아직 확인하지 않았다. 현재 브라우저 앱 세션은 데모이므로 계정 로그인 후 동의→생성으로 최종 확인한다.
- AI Studio의 Klick 프로젝트가 무료 등급임을 확인했으며 결제 연결이나 요금제 변경은 하지 않았다. 무료 초안은 Core와 일 5회·분 2회 한도를 공유한다.
- 변경 전 GitHub 태그: `rollback/review-before-figma-2026-10-23` (`ea014b4`). 이전 EAS deployment `vtqvwsek5r`는 유지한다. DB를 삭제하는 롤백은 금지한다.
- 검증: typecheck·lint·18개 파일 71개 테스트·30개 웹 경로 빌드 통과. 402px에서 대표 키워드 추가/제거·3개/5개 제한·직접 입력·본문 편집·완료→보관함→재열기·새로고침 복원을 확인했다. 반점 별점도 취향 리포트 분포에 포함한다. 증거 PNG 2개는 공개 GitHub에 올리지 않고 로컬 `docs/assets/light-review-*-2026-10-23.png`에만 보관한다.
- 코드 커밋 `bcd6453`을 GitHub main에 push하고 EAS beta에 배포했다. deployment `887dbhy3g1`, 고정 주소 `https://flick-film-journal--beta.expo.app`, 최종 번들 `entry-b2cceda4007401e1af6502834884e1a0.js`이다. 외부 주소의 하단 모드 선택→새 Light 경로를 확인했다. AI 함수의 비인증 요청은 401로 차단된다.
- 외부 beta의 402px 화면에서 실제 별점 드래그·평가 문구 변경→Q1 선택/Q2~Q5 건너뛰기→종합→작성 완료→보관함 저장→기록 재열기도 확인했다. 임시 뷰포트 설정은 해제했다. 실제 Gemini 성공 응답 확인만 로그인 후 추가 QA 대상으로 남긴다.


## 2026-10-23 Figma 홈 리디자인

- Figma 파일 `7o0aA5nN2muGSgSEdtsYw7`, 프레임 `1:27`을 기준으로 홈을 구현했다. 비교표·자산 출처·데이터 원칙과 롤백은 `docs/HOME_REDESIGN.md`를 참고한다.
- 원본 로고·투명 아이콘, 큰 스와이프 포스터, 영화/키워드 가로 레일, Light 리뷰, Core 매거진, 전문가 콘텐츠, 붉은 미니게임 카드를 적용했다. 웹 Pretendard는 공식 배포본을 로컬에서 제공하며 OFL 라이선스를 포함했다.
- 하단에 `/feed` 탭을 추가해 기존 공개 리뷰·저장·랭킹·큐레이션·컬렉션에 연결했다. `/archive`는 마이와 피드에서 계속 접근할 수 있다. 개인 기록·인증·RPC·DB는 변경하지 않았다.
- 공개 데이터가 없는 영역은 `디자인 예시`로 표시한다. 예시 공감·댓글·저장은 서버에 쓰지 않으며, 부족하거나 7일 넘게 오래된 집계를 이번 주 순위로 만들지 않는다. 알림·메시지는 준비 안내, 히든 블록은 기존 실험실 경로를 유지한다.
- 변경 전 `f5d5309`를 GitHub의 `rollback/home-before-figma-2026-10-23` 태그에 push했다. 이전 EAS 배포 `bch4ll8imz`도 보존한다.
- 최종 `npm.cmd run check`: TypeScript·lint·17개 파일 61개 테스트 통과. `npm.cmd run build:web`: 새 피드를 포함한 정적 29개 경로 통과.
- 데모에서 320/402/1280px 문서 가로 넘침 0px, 이미지 로드, Figma 슬롯 크기, 홈→제목 검색, Light 더보기→피드, 미니게임, 알림 안내·닫기를 확인했다. 실제 사용자 기록 작성·변경은 수행하지 않았다.
- 구현 커밋 `670d8a2`와 하단 메뉴 표시 보완 `bf0a40b`를 GitHub `main`에 push했다. 최종 EAS deployment identifier는 `vtqvwsek5r`, 고유 URL은 `https://flick-film-journal--vtqvwsek5r.expo.app`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 첫 후보 배포 `4ndu3ixwcc`는 최종 수정본이 아니다.
- 최종 외부 번들 `entry-978555684aab193eea70998d135af2cf.js`와 로컬 빌드가 일치한다. 402px 외부 데모에서 이미지 전체 로드·가로 넘침 0px, 기록 탭의 다섯 메뉴 접근성 이름 유지→홈 복귀→이모지 게임, Light 더보기→피드 로그인 경계를 확인했다. 브라우저 콘솔 오류 0건, `/`, `/feed`, 글꼴 URL의 HTTP 200을 확인했다.
- 외부 검증 이미지는 `docs/assets/home-figma-2026-10-23.png`다. 로컬 `http://localhost:8081` 개발 서버는 계속 실행 중이며 실제 사용자 기록 작성/변경은 수행하지 않았다. 새 과금·AI 호출·DB migration은 없다.


## 2026-08-12 이모지 Windows 호환성 보완

- 사용자 화면에서 `듄` 문제의 모래벌레 `🪱`가 빈 네모로 표시되는 것을 확인했다. 원인은 일부 Windows 브라우저의 최신 유니코드 이모지 미지원이다.
- 해당 문자만 바꾸지 않고 100문제 전체에서 최신 호환성 위험 이모지 20종을 기본 도형·동물·기호로 교체했다.
- 호환성 위험 문자가 문제 데이터에 다시 들어오지 못하도록 회귀 테스트를 추가했다. 로컬 Windows 화면에서 수정된 `듄` 힌트 `🏜️ 🐍 👑 🌶️` 네 개가 모두 렌더링되고 콘솔 오류가 없음을 확인했다.
- `npm.cmd run check`: TypeScript, lint, 16개 파일 58개 테스트 통과. 정적 웹 27개 경로 빌드를 통과했다. 기능 커밋 `818ad3f`를 GitHub `main`에 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `clxnftlgf1`이다. 외부 경로가 HTTP 200을 반환하고 최종 번들에 `듄`의 안전한 힌트가 포함되며 `🪱`가 제거된 것을 확인했다.

## 2026-08-11 이모지 영화 미니게임 구현

- 메인 상단에 작은 `이모지로 영화 맞히기` 카드를 추가하고 로그인 없이 `/emoji-quiz`로 진입하게 했다.
- 직접 구성한 100문제를 제공한다. 10·30·50문제 또는 1~100문제 직접 설정, 세션 내 중복 없는 무작위 출제, 공백·구두점·등록 별칭을 고려한 정답 판정을 구현했다.
- 빈 답변은 입력 위치에 안내하고, 정답·오답 후 실제 제목과 다음 행동을 보여준다. 진행률·점수·최종 정답률·문제 수별 기기 최고 점수를 제공한다.
- 서버·로그인·AI·신규 과금은 사용하지 않는다. 기존 5E 서버 퀴즈와 보상 상태에도 영향을 주지 않는다.
- 로컬에서 직접 설정 2문제 세션으로 빈 입력→별칭 정답→오답→결과→재도전 흐름과 메인 카드, 콘솔 오류 0건을 확인했다.
- `npm.cmd run check`: TypeScript, lint, 16개 파일 57개 테스트 통과. `npm.cmd run build:web`: `/emoji-quiz`를 포함한 정적 웹 27개 경로 통과. 기능 커밋 `b1c2cd1`을 GitHub `main`에 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `ovi83ewirq`이며 외부 고유 URL에서 네 가지 문제 수 선택·10문제 시작·입력 화면과 콘솔 오류 0건을 확인했다.

## 2026-08-11 5D·5E 구현

- `/taste-insights`에 완료 기록 기반 취향 유형·네 가지 감상 신호·반복 패턴·다시보기·취향 밖 추천을 추가했다. 완료 기록 3편 전에는 유형을 단정하지 않고 필요한 편수를 표시한다.
- 5D는 리뷰 본문이나 AI 호출 없이 선택 키워드·Light 태그·별점·기록 방식·감상 시점만 결정적으로 계산한다. 개인화 숨김/복구는 기록을 지우지 않고 기기 설정으로 보존한다.
- `/experiments`에 서버 판정 영화 퀴즈 3개, 히든 컬러 블록 해금, 고정 선택지 주간 투표를 추가했다. 비로그인·데모는 로그인 안내만 제공한다.
- `202608110004_stage5de_personalization_experiments.sql`을 운영 Supabase에 적용했다. 퀴즈·진행·투표·응답 네 테이블과 인증 RPC를 제공하며 원본 테이블 직접 권한은 회수했다.
- 운영 DB에서 인증 사용자로 오답→정답 해금과 첫 투표 고정을 트랜잭션 검증했다. 두 번째 투표가 반영되지 않는 집계를 확인한 뒤 검증 데이터는 롤백했다.
- `npm.cmd run check`: TypeScript, lint, 14개 파일 52개 테스트 통과. `npm.cmd run build:web`: `/taste-insights`, `/experiments`를 포함한 정적 웹 26개 경로 통과.
- 로컬 화면에서 데이터 부족 설명, 개인화 숨김·복구, 5E 로그인 경계와 콘솔 오류 0건을 확인했다.
- 기능 커밋 `de4b9fc`를 GitHub `main`에 push하고 최신 정적 산출물을 EAS Hosting `beta`에 배포했다. deployment identifier는 `vw39hlnxfu`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 고유 배포 URL에서 최종 문구까지 소스와 일치함을 확인했고 `/taste-insights`의 설명·개인화 제어와 `/experiments` 로그인 경계에서 콘솔 오류는 0건이었다.

## 2026-08-11 5C 구현

- 홈에 최근 7일 인기 영화·최다 선택 키워드 랭킹과 니치·전문가 큐레이션 섹션을 추가했다. 표본 5건 미만이면 순위를 숨기고 기간·표본 부족 이유를 표시한다.
- 탐색 화면에 12개 감정 선택 진입점을 추가하고, 선택 감정에 맞춘 결과와 추천 이유를 영화 카드에 노출한다.
- `202608110003_stage5c_discovery_editorial.sql`을 운영 Supabase에 적용했다. 랭킹 스냅샷 2개 테이블, 편집 큐레이션 2개 테이블과 공개·관리자 RPC를 제공한다.
- Super Admin 전용 `/admin-curations`에서 랭킹 수동 갱신, 니치·전문가 초안 작성, 영화 검색·추가·제외, 공개·비공개·삭제를 관리한다. 전문가 공개는 작성자·출처·권리 확인, 모든 공개는 영화 1편 이상을 서버에서 강제한다.
- 원본 테이블의 `anon`, `authenticated` 직접 권한을 회수했다. 실제 관리자 계정으로 첫 랭킹 스냅샷 생성이 성공했고 비관리자 관리자 RPC 호출은 `admin_required`로 차단됐다.
- `npm.cmd run check`: TypeScript, lint, 12개 파일 48개 테스트 통과. `npm.cmd run build:web`: `/admin-curations`, `/curation/[id]`를 포함한 정적 웹 24개 경로 통과.
- 로컬 390×844에서 감정 선택→추천 이유 노출과 가로 넘침 0px를 확인했다. 비로그인 `/admin-curations`는 `/welcome`으로 복귀하고 큐레이션 상세는 로그인 안내만 제공한다.
- 기능 커밋 `aefa732`를 GitHub `main`에 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `wsufsqvier`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 외부 390×844에서 감정 선택→추천 이유, 가로 넘침 0px, 콘솔 오류 0건과 `/admin-curations` 비로그인 차단을 확인했다.

## 2026-08-11 5B 구현과 외부 배포

- 홈에 공개 Light 리뷰 카드, Core 매거진, 공개 사용자 컬렉션 섹션을 추가했다. 기존 5A 공감·댓글·답글·저장 상세 흐름과 영화 상세 이동을 재사용한다.
- `202608110002_stage5b_collections.sql`을 운영 Supabase에 적용했다. 컬렉션·영화 연결·저장 관계와 공개/내 목록/저장 목록/상세/생성·수정·삭제/추가·제외/저장 RPC를 제공한다.
- 컬렉션은 비공개가 기본이며 내부 테이블의 `anon`, `authenticated` 직접 권한을 회수했다. 소유자만 수정·삭제·영화 추가·제외할 수 있고 공개 컬렉션만 다른 인증 사용자가 조회·저장할 수 있다.
- 영화 상세→내 컬렉션 선택→영화 추가, 컬렉션 공개→다른 사용자 저장→저장 목록 재조회 흐름을 연결했다. 한 컬렉션에는 중복 없이 최대 100편을 담는다.
- 운영 DB에서 인증 역할로 RPC 전용 생성·추가·공개·저장·제외를 트랜잭션 검증한 뒤 롤백 0건을 확인했다. 직접 테이블 조회는 권한 거부로 차단됨을 확인했다.
- `npm.cmd run check`: TypeScript, lint, 11개 파일 44개 테스트 통과. `npm.cmd run build:web`: 컬렉션 3개 경로를 포함한 정적 웹 22개 경로 통과.
- 로컬 390px에서 `/collections` 로그인 보호와 `/collection-picker` 잘못된 접근 복구 화면의 가로 넘침이 없음을 확인했다.
- 기능 커밋 `423a0c4`를 GitHub `main`에 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `yrykwqtxbe`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 외부 `/collections`에서 390px 가로 넘침 없음과 콘솔 오류 0건을 확인했다.

## 2026-08-11 5A 구현

- 운영 Supabase에 `202608110001_stage5a_public_content.sql`을 적용했다. 좋아요·저장·댓글·신고·비식별 세션 이벤트 테이블과 공개 피드·상호작용·관리자 신고 처리 RPC가 생성됐다.
- 모든 새 테이블의 `anon`, `authenticated` 직접 권한을 회수하고, RPC가 인증·공개 완료 상태·본인 작업·관리자 수정 권한을 검사한다.
- 공개 기록 상세에 공감·저장, 500자 댓글, 한 단계 답글, 본인 댓글 삭제, 중복 방지 신고를 연결했다. 기록 본문 편집·삭제 권한은 작성자에게만 유지된다.
- 보관함의 통합 기록 관리에서 전체 날짜·Light/Core·초안/완료·공개범위 필터, 이어쓰기, 공개 링크 공유와 2단계 삭제를 제공한다.
- Super Admin 콘솔에 열린 신고 목록과 기각·기록 비공개 전환을 추가했다. 조치 결과는 기존 관리자 감사 로그에 기록한다.
- 공개 기록 조회→영화 상세→새 기록 시작과 공감·저장·댓글·신고 이벤트를 임의 세션 ID로 측정한다. 이메일·사용자 ID·본문은 이벤트 테이블에 저장하지 않는다.
- 운영 공개 완료 기록 2건을 확인했고, 다른 인증 사용자 역할로 피드 조회·상태 조회·공감·저장·댓글·신고·측정을 실행한 뒤 트랜잭션 롤백으로 검증 데이터를 남기지 않았다.
- `npm.cmd run check`: TypeScript, lint, 10개 파일 40개 테스트 통과. `npm.cmd run build:web`: `/admin`, `/review/[id]`를 포함한 정적 웹 19개 경로 통과.
- 로컬 390px 보관함에서 가로 넘침 없이 통합 필터·초안 이어쓰기·삭제 2단계 확인을 검증했다.

## 2026-08-11 차기 기능 기획 정리

- 디자이너가 전달한 17개 기능을 현재 구현과 비교해 5A~5E로 재배치했다. 상세 범위와 완료 기준은 `docs/ROADMAP.md`의 `5단계 - 발견과 커뮤니티 확장`에 기록했다.
- 다음 구현 시작점은 5A다. 먼저 통합 기록 관리의 누락 범위를 확인하고, 공개 피드·좋아요·댓글·답글·저장·신고의 DB/RLS 계약과 전환 측정을 설계해야 한다.
- 랭킹을 첫 작업으로 시작하지 않는다. 실제 공개 콘텐츠와 상호작용 데이터가 쌓인 뒤 최근 7일 집계로 제공한다.
- 기존 감정 기반 추천·아카이브·Light/Core 리포트는 폐기하지 않고 확장한다.
- 이번 작업은 기획과 순서 확정만 수행했으며 기능 코드·DB·배포는 변경하지 않았다.

## 2026-08-10 Super Admin 콘솔 구현

- 운영 Supabase에 `202608100002_super_admin_console.sql`을 적용했다. `admin_access`, `admin_audit_events`와 서버 검증 RPC를 추가하고 두 테이블의 클라이언트 직접 접근을 차단했다.
- 요청받은 기존 인증 계정을 운영 대시보드에서 `super_admin`으로 지정했다. 개인 이메일은 migration·앱 번들·Git 기록에 포함하지 않았다.
- 초기 권한은 사용자 조회·기록 조회 ON, 기록 비공개 전환·기록 삭제 OFF다. 관리자는 마이 화면의 `Super Admin 콘솔`에서 네 권한을 각각 켜고 끌 수 있다.
- 사용자 목록은 이메일·닉네임·가입일·최근 로그인, 기록 목록은 소유자·영화·상태·공개 범위·별점과 제한된 본문 미리보기를 제공한다.
- 수정 권한은 공개 기록을 비공개로 전환하는 운영 조치만 제공한다. 삭제는 2단계 확인 뒤 실행하며, 모든 조회·권한 변경·운영 조치·삭제를 감사 로그에 기록한다.
- 비밀번호 조회, 사용자 로그인 대행, 사용자 계정 삭제는 의도적으로 제외했다.
- `npm.cmd run check`에서 TypeScript, lint, 9개 파일 36개 테스트를 통과했고 `/admin`을 포함한 정적 웹 19개 경로 빌드를 통과했다.
- GitHub `main` 커밋 `10ddbab`을 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `ri3gaovbdl`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 로그아웃 상태의 `/admin` 직접 접근이 로그인 화면으로 차단되는 것을 확인했다.

## 2026-08-10 이메일·비밀번호 계정 구현

- 환영 화면을 Magic Link에서 로그인/회원가입 탭으로 교체했다. 회원가입은 닉네임, 이메일, 비밀번호, 비밀번호 확인을 검증한다.
- `/reset-password` 복구 경로와 마이 화면의 닉네임·비밀번호 변경을 추가했다. 기존 계정은 비밀번호 재설정으로 기록 손실 없이 전환한다.
- 로그인 시 원격 `profiles`와 `user_keywords`를 다시 불러와 다른 기기에서도 닉네임과 온보딩 상태를 복원한다.
- 운영 Supabase에 `202608100001_password_accounts_and_nicknames.sql`을 적용했다. 신규 가입 허용, Email provider, Confirm email 활성 상태를 확인했다.
- 비밀번호는 Supabase Auth에만 저장되고 사용자 데이터 RLS 및 계정 cascade 삭제 정책은 변경하지 않았다.
- `npm.cmd run check`: TypeScript, lint, 8개 파일 33개 테스트 통과.
- GitHub `main` 커밋 `52dcf89`을 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `t0daxxtvns`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다.
- 외부 beta에서 로그인/회원가입 탭, 닉네임 필수 안내, 비밀번호 복구 만료 링크 안내를 확인했다.

## 2026-08-07 다음 작업

- 방향이 모바일 반응형 웹/PWA 우선으로 변경되었다. Apple 로그인과 iOS 빌드는 후속 단계로 미룬다.
- Supabase `flick` 프로젝트 연결과 첫 migration 적용을 완료했다. `profiles`, `keywords`, `user_keywords` 및 RLS 정책이 생성되었고 초기 키워드 12개를 확인했다.
- Auth Site URL과 Redirect URL은 로컬 웹 개발 주소 `http://localhost:8081` 기준으로 설정했다. 배포 시 운영 HTTPS 주소로 변경해야 한다.
- Supabase가 활성화된 정적 웹 빌드에서도 브라우저 저장소를 서버에서 호출하지 않도록 인증 저장소를 SSR-safe하게 처리했고, check와 web export를 통과했다.
- 실제 이메일 Magic Link 로그인, 동일 브라우저 복귀, `profiles` 1건과 `user_keywords` 3건 저장, 새로고침 후 계정 세션 복구까지 확인했다.
- 데모 세션과 실제 계정 세션을 명확히 분리하고 마이 화면에 세션 초기화 동작을 추가했다. 모바일 반응형 웹 기준 1단계는 완료 상태다.
- 2단계 영화 발견 화면, 검색, 상세, 보고 싶어요, 감상 영화 선택, 추천 이유, 포스터 스와이프 실험과 Credits를 구현했다.
- Supabase에 `movies`와 사용자별 `watchlist` 테이블·RLS·검증용 영화 캐시 8편을 적용했다.
- 실제 계정으로 검색 → 상세 → 보고 싶어요 저장 → 기록 준비 흐름을 확인했다.
- TMDB Read Access Token을 Supabase 비밀값으로 등록하고 `movies-discovery` Edge Function을 운영 배포했다.
- 실시간 TMDB 추천 20편과 포스터, `Dune Part Two` 검색, 동적 영화 캐시, 상세와 보고 싶어요 저장을 실제 계정으로 확인했다.
- 2.5단계 DB migration을 적용했다. `movie_details`는 공급자 상세를 내부 영화 UUID와 분리하고, `tmdb_catalog`는 추후 전체 경량 색인을 위한 빈 테이블로만 생성했다.
- 영화 상세 화면은 감독·출연진·제작·키워드·한국 OTT·이미지/영상 수·동기화 상태를 주문형으로 읽고 강제 재시도할 수 있다.
- 공식 TMDB 일일 내보내기 감사 결과 성인·비디오 제외 1,168,357편, 예상 DB 사용량 약 282MB였다. Free DB 500MB 보호를 위해 전체 적재는 실행하지 않았다.
- 변경된 `movies-discovery` Edge Function을 운영에 배포했다. `듄: 파트 2`로 최초 TMDB 상세 수집, 재접속 캐시 사용, 강제 갱신, 기존 보고 싶어요 보존을 실제 계정에서 확인했다.
- 배포에 사용한 1일 개인 액세스 토큰과 로컬 임시 파일은 검증 직후 폐기했다.
- Expo Free EAS Hosting에 Preview를 배포했다: `https://flick-film-journal--egnsgpv7r0.expo.app`.
- Supabase Auth Site URL과 허용 Redirect URL에 Preview HTTPS 주소를 연결했으며, 외부 주소에서 로그인·데모 시작 화면 로드를 확인했다. localhost 허용 주소도 유지했다.
- 3A 기록 기반을 완료했다. `reviews`, `review_answers`, `review_keywords`와 본인 전용 RLS, 원자적 저장 RPC를 운영 DB에 적용했다.
- 3B Light/Core 화면을 완료했다. 감상일·별점·감정 질문·키워드·한 줄 기록과 요소별 질문·자유 감상·스포일러 표시를 제공한다.
- 초안은 0.9초 뒤 서버에 자동 저장하고 동시에 기기 복구본을 유지한다. 완료 기록 수정 중에는 서버 상태를 초안으로 내리지 않고 수동 완료 시 반영한다.
- 실제 계정으로 Light 완료 → Core 전환·수정 → 목록 재조회 → 삭제, 서버 초안 자동저장 → 새로고침 복구 → 삭제를 검증했고 검증 데이터는 정리했다.
- 한국 날짜와 UTC DB 날짜 차이로 오늘 기록이 거절되지 않도록 `Asia/Seoul` 기준 검증을 DB와 앱에 통일했다.
- 3A·3B 검증본을 EAS Hosting의 고정 Preview 별칭 `https://flick-film-journal--beta.expo.app`에 배포하고 Supabase Site URL·Redirect URL을 연결했다. 기존 Preview 주소도 허용 목록에 유지했다.
- 화면 구성도 14~19쪽을 기준으로 Light를 영화별 질문 5개 → 질문별 최대 3개 느낌 태그 → 내 태그 기록 요약 흐름으로 수정했다. AI 호출과 AI 대기 화면은 포함하지 않았다.
- 질문은 영화 제목·장르·감독·주요 출연진을 이용하는 결정적 규칙으로 즉시 생성하며, 상세정보가 없을 때도 제목 기반 질문 5개로 복구한다.
- `review_questions`, `review_answer_tags`와 RLS, 이전 Preview와 호환되는 확장 저장 RPC를 운영 DB에 적용했다.
- 인증 역할의 롤백 트랜잭션으로 질문 5개·태그 3개 저장을 검증했다. 모바일 390px 데모에서 최대 3태그 제한, 5문항 이동, 요약, 완료 목록, 삭제를 확인했고 검증 데이터는 정리했다.
- 3C 운영 보호 검증 커밋 `7612d66`을 EAS Hosting `beta` 별칭에 배포했다. 고정 주소는 `https://flick-film-journal--beta.expo.app`이다.
- 기록 공개 범위를 `나만 보기`와 `전체 공개`로 구현했다. 완료된 공개 기록과 자식 질문·답변·태그는 인증 사용자만 읽을 수 있고, 초안·비공개 기록과 모든 쓰기는 소유자에게만 허용된다. 운영 DB migration과 롤백 트랜잭션 검증을 완료했다.
- Core 기록을 한 질문씩 답하는 Q1~Q5 흐름으로 변경했다. Q1은 영화 메타데이터로 만들고, 이후 질문은 이전 Q/A와 영화 정보로 `generate-core-question` Edge Function이 생성한다. 20자 미만 답변은 다음 질문을 요청할 수 없고, 이전 답변 수정 시 뒤 흐름을 재생성한다.
- `generate-core-question` Edge Function을 운영 Supabase에 배포하고 `GEMINI_API_KEY`를 서버 비밀값으로 등록했다. 키는 앱 번들과 Git에 포함하지 않는다.
- Gemini는 결제 계정이 연결되지 않은 Google Cloud `Klick` 무료 등급 프로젝트를 사용한다. 무료 할당량·네트워크·모델 오류 시 안전 질문으로 복구하고 사용자 입력을 보존한다.
- 성인 내부 테스트용으로 만 18세 이상 동의와 개인정보·민감정보 입력 금지 안내를 추가했다. 무료 등급의 데이터 이용 조건상 일반 소비자 공개 운영 전 약관·개인정보 검토가 필요하다.
- 실제 계정에서 `대부` Core Q1에 20자 이상 답변과 동의를 입력해, 이전 답변의 가족·폭력·책임 맥락을 이어받은 Q2와 `Gemini 연계 질문` 표시를 확인했다. 같은 초안의 `전체 공개` 선택 저장과 목록 복구를 확인한 뒤 테스트 초안만 삭제했고 기존 완료 기록은 보존했다.
- PostgREST가 `reviews`와 `review_questions` 관계를 중복 후보로 판단하던 조회 오류는 `review_questions_review_id_fkey` 관계 힌트를 명시해 해결했다.
- `generate-core-review-draft` Edge Function을 운영 Supabase에 배포했다. Q1~Q5만 전달해 Gemini가 키워드 3~5개와 편집 가능한 한국어 리뷰 초안을 반환하며 이메일·사용자 ID는 전달하지 않는다.
- Core Q5 완료 뒤 별도 동의와 버튼으로만 초안을 생성한다. 결과는 자유 감상에 자동 입력되지만 완료·공개되지는 않으며, 사용자가 본문을 수정한 뒤 재생성하면 교체 확인을 먼저 표시한다.
- 실제 계정에서 `메트로폴리스` Q1~Q5 연계 질문, 키워드 5개, 리뷰 초안 자동 입력, 수정문 덮어쓰기 취소를 확인했다. 검증용 초안과 연결 질문·답변은 삭제해 기존 기록을 보존했다.
- 기록 완료 필수값이 누락되면 감상일·별점·Light/Core 질문 중 최초 누락 영역으로 자동 스크롤하고, 필드 바로 아래와 완료 버튼 아래에 입력 조건을 표시하도록 개선했다. 선택 기능은 완료를 막지 않는다.
- 3C 운영 보호를 적용했다. Core 연계 질문은 사용자당 하루 20회·분당 6회, 리뷰 초안은 하루 5회·분당 2회로 서버에서 제한하며 자동 과금이나 자동 재시도를 하지 않는다.
- 이메일·한국 휴대전화·주민등록번호 패턴을 Gemini 전송 전에 차단하고, Gemini의 괴롭힘·혐오·성적·위험 콘텐츠 필터를 `BLOCK_MEDIUM_AND_ABOVE`로 고정했다. 차단·오류 시 질문은 기본 연계 질문으로 복구하고 모든 기존 입력을 보존한다.
- 운영 DB에 `ai_usage_events`, `claim_ai_request`, `finish_ai_request`를 적용했다. 감사 로그는 기능·상태·오류·모델·토큰·소요시간만 기록하고 본문은 저장하지 않으며, 사용자별 다음 호출에서 30일 초과 이벤트를 정리한다.
- 운영 Edge Function 두 개를 갱신했다. 실제 계정에서 `메트로폴리스` 정상 호출이 Gemini Q2와 잔여 한도를 표시하고, 가짜 이메일 입력은 토큰 0·`sensitive_input`으로 차단되며 기본 Q3로 이어지는 것을 확인했다. 검증용 기록은 삭제했다.
- 4단계 웹 핵심을 구현했다. 새 보관함 탭에서 월 캘린더·날짜 선택·Light/Core 필터·완료 기록 재진입과 완료 편수·이번 달·평균 별점·감정 TOP 3·별점 분포·기록 방식 리포트를 제공한다.
- 첫 기록 사용자는 두 번째 기록까지의 진행 안내를 보고, 작성 중 초안이 있으면 인앱 이어쓰기 알림을 받는다. 리포트 공유와 전체 공개 기록 딥링크 공유는 사용자 동작으로만 실행된다.
- 마이 화면에 전체 기록 JSON 내보내기, 최근 비식별 진단 메타데이터, 이중 확인 계정 삭제 UI를 추가했다. 로그아웃과 삭제 시 기기의 `flick.*` 데이터도 정리한다.
- `delete-account` Edge Function을 운영 Supabase에 배포했다. 인증 없는 POST가 401로 차단되는 것을 확인했으며, 실제 cascade 삭제 검증은 운영 사용자 계정이 아닌 일회용 테스트 계정으로만 진행해야 한다.
- 4단계 집계 테스트 3개를 추가했고 전체 TypeScript·lint·24개 테스트와 16개 정적 웹 경로 빌드를 통과했다. 로컬 자동 브라우저 검증은 보안 정책이 localhost 재접속을 차단해 수행하지 못했다.
- 검증 커밋 `02c30c4`를 EAS Hosting `beta`에 배포했다. deployment identifier는 `k7d5knhfu4`, 고정 주소는 `https://flick-film-journal--beta.expo.app`이다. 외부 `/archive`에서 390px 가로 넘침 없음, 캘린더·리포트·빈 상태와 마이 화면의 삭제 이중 확인을 확인했다.
- 2026-08-10 계정 경계 QA에서 공개 링크가 편집 화면 `/record`를 재사용해 비소유자에게 편집 가능해 보이던 결함을 발견했다. 실제 운영 RLS의 `reviews_update_own`은 `using`과 `with check` 모두 `auth.uid() = user_id`였고 삭제·자식 데이터 쓰기도 소유자 정책이 존재해 서버 원본의 타 계정 수정은 차단된 상태였다.
- 공개 링크를 `/review/[id]` 읽기 전용 화면으로 분리하고 공유 후 로그인 복귀, 비공개·초안 숨김, 기존 편집 링크의 공개 상세 전환, 데모 기록 외부 공유 차단, 삭제 요청의 소유자 조건·삭제 결과 확인을 추가했다. 회귀 계약 테스트를 포함해 TypeScript·lint·27개 테스트, Expo Doctor 20개 검사, 17개 정적 웹 경로 빌드를 통과했다.
- 운영 Supabase 정책 화면에서 모든 사용자 테이블의 RLS 활성화, 기록 테이블의 소유자 INSERT/UPDATE/DELETE와 인증 사용자 공개 SELECT 정책을 확인했다. Security Advisor는 오류 0건·경고 1건이며, 경고 상세는 대시보드 응답 지연으로 확인하지 못해 후속 점검 대상으로 남긴다.
- 로그인 전 공유 상세가 무한 로딩되던 조건 순서도 외부 beta QA에서 발견해 회귀 테스트와 함께 수정했다. 기존 `/record?...` 공유 주소도 로그아웃·데모 상태에서 원래 기록 ID를 보존해 새 읽기 화면으로 전환한다. 최종 코드 커밋 `b88e87a`를 GitHub `main`에 push하고 EAS Hosting `beta`에 배포했다. deployment identifier는 `nxg1ovnmi7`이며, 390px·480px에서 가로 넘침과 편집 입력 0개, 로그인 안내와 새 공유 경로 보존을 확인했다.

## 현재 상태

1~3단계와 4단계 반응형 웹 핵심·운영 함수·외부 beta 배포를 완료했다. 전체 경량 색인 적재와 TestFlight·정식 출시 점검은 보류했다.

## 다음 권장 작업

1. 서로 다른 일회용 계정 2개로 공개 조회와 타 계정 UPDATE/DELETE 거부를 최종 통합 검증한다.
2. 일회용 계정에서 `delete-account` cascade 삭제를 검증한다.
3. Supabase Security Advisor 경고 1건의 상세를 확인하고 필요한 경우 안전한 후속 migration을 적용한다.
4. Apple Developer 계정·앱 식별자·원본 아이콘을 준비한 뒤 TestFlight 빌드와 핵심 데이터 일치 검증을 진행한다.
5. 일반 소비자 공개 전 Gemini 무료 등급 데이터 조건을 반영한 이용약관·개인정보 안내를 법률 검토한다.

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

- Supabase 웹 함수 편집기의 배포 요청은 서버 500 오류를 반환해 CLI로 배포했다. 배포용 1일 개인 액세스 토큰은 배포 직후 폐기했다.
- Apple Developer 계정이 없어 iOS 네이티브 빌드는 실행하지 않았다.
- `npm audit --omit=dev`의 비파괴 업데이트로 취약점 수를 20건에서 17건(높음 4, 보통 13)으로 줄였다. 남은 항목은 Expo/Metro·React Native 빌드 체인의 `image-size`, `decode-uri-component`, `uuid` 전이 의존성이며 강제 수정은 Expo 호환성을 깨는 역행을 제안해 적용하지 않았다. 정적 웹 런타임 입력 경로가 아닌 빌드 도구 위험으로 추적하며 Expo 상위 패치를 기다린다.
- 앱 아이콘과 스토어 자산은 승인된 원본 FLICK 자산을 받은 뒤 교체한다.
- 현재 Windows PowerShell 실행 정책에서는 `npm.ps1`이 차단되므로 명령은 `npm.cmd`로 실행한다.
- Supabase Free DB는 500MB 초과 시 자동 과금 대신 읽기 전용으로 전환될 수 있다. `npm.cmd run catalog:audit`로 최신 후보 건수와 예상치를 먼저 확인하고 전체 적재는 명시적 승인 전 실행하지 않는다.

## 2026-09-06 — 공개 포트폴리오 품질 기준

- 공개 README에 CI 상태 배지와 저장소 운영 정책을 추가했다.
- GitHub Actions에서 typecheck·lint·58개 테스트·웹 정적 빌드를 매 push와 PR마다 검사한다.
- 기여·보안·권리 고지와 구조화된 이슈·PR 템플릿을 추가했다.
- 이번 변경은 제품 동작이나 운영 Supabase 데이터에 영향을 주지 않는다.

### README 문장 정리

- 전체 기능 목록을 포트폴리오에서 필요한 핵심 흐름 중심으로 줄였다.
- 왜 만들었는지와 Light/Core의 차이를 1인칭 문장으로 다시 작성했다.
- 앱 기능과 운영 배포는 변경하지 않았다.

## 2026-09-06 — 포트폴리오 설명과 시각 디자인 복원

- README를 자연스러운 존댓말로 확장하고, 제품 배경·사용 흐름·설계 판단·아키텍처·구현 범위·후속 검증을 구분했다.
- `docs/assets/portfolio-banner.svg`에 forest `#062D23`, emerald `#34D399`, lime `#D9F99D` 기반의 공통 포트폴리오 테마를 추가했다. 기존 제품 로고와 아트는 보존했다.
- 배너는 GitHub에서 직접 렌더링할 수 있는 정적 SVG이며, 외부 폰트·스크립트·원격 이미지에 의존하지 않는다. 소개 아트와 실제 서비스 화면은 구분해 표기했다.
- 이번 변경은 공개 문서와 배너에 한정한다. 앱 동작·API·DB·호스팅 설정·실거래 권한은 변경하지 않았으며 앱 재배포도 수행하지 않는다.

## 2026-09-07 — GitHub 배너 표시 호환성 보완

- GitHub 프로필과 저장소 README에서 SVG 대표 배너가 비어 보이는 환경을 확인해, 같은 원본을 고해상도 PNG 표시본으로 추가했다.
- SVG는 편집 가능한 원본으로 보존하고 README 이미지만 PNG를 사용한다. 소개 문구, 제품 기능과 기존 아트는 변경하지 않았다.
- 변경 범위는 공개 문서 자산에 한정하며 앱·호스팅·데이터·주문 실행에는 영향을 주지 않는다.
