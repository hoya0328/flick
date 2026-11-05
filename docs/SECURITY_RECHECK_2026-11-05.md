# 보안 재검사와 deepmerge 보완 — 2026-11-05 KST

## 요약

사용자가 기존 낮음7건을 포함해 재검사하고 발견 문제를 수정하도록 요청했다. 작업 시작 Git은 clean, HEAD `edd009d`, 기존 beta deployment `4eqmlnnd9n`. 실제 회원 기록/사진/계정·RLS·키·AI·과금 설정은 변경하지 않았다. 최종 저장/게시 식별자는 HANDOFF 최신 절을 따른다.

| 검사 | 결과 |
| --- | --- |
| npm 감사 | critical/high/moderate0, low7 유지. 원인1개(deepmerge4.3.1)와 전이 패키지6개 경고이며 독립 사고7개가 아님 |
| 실제 문제 재현/보완 | Expo가 실제 로드하는 deepmerge CJS에서 반환 객체의 프로토타입 오염을 재현하고, 데이터 속성 쓰기로 해당 경로를 차단 |
| 재설치·회귀 | npm ci에서 보완 자동 재현.39파일300테스트/typecheck/lint/웹47경로 빌드 통과 |
| 자격증명 | source·Git history·빌드 패턴 검사 성공. .env.local은 ignored/untracked, 추적 env는 값 없는 .env.example뿐. 공개 Supabase URL/publishable과 서버 Gemini/TMDB/service-role 경계를 유지 |
| 공개키 HTTP | 기존19개에 Edge5개를 추가한24개 모두 정확한 거절 또는 RLS-empty. 함수는 인증 단계에서401, AI/계정 삭제 미실행 |
| 운영 DB A/B/anon | 합성 계정·기록으로 실제 authenticated/anon 역할을 사용해 positive owner control, 타인 CRUD/owner 위조/save RPC/admin 상승 거절, 비공개/초안/자식/사진 격리와 의도한 공개 완료 기록 읽기 성공 |
| 새 피드·기존 커뮤니티 | 투표 유일성/질문/응답 식별자·타인 편집/직접 테이블 접근·댓글/팔로우/알림·사진/신고관리/휴지통 rollback 검사 통과 |
| 메타데이터 | 검사 대상 민감 테이블 RLS=true, 사진 core-photos 버킷 private=true, public security-definer의 fixed search_path 누락0 |
| 잔존 | 검사 전체 ROLLBACK 후 synthetic auth/movie0, 새 참여3테이블 직접 grant0 |

## 왜 경고는7개 그대로인가

[공식 저장소 보고](https://github.com/TehShrike/deepmerge/issues/273)와 [advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)를 대조했고 npm 최신은4.3.1, 공식 수정판이 없다. registry audit는 디스크의 보완 코드가 아닌 패키지 버전과 의존성 그래프를 검사하므로7개 표시가 남는다. **‘취약점0’ 또는 upstream 수정판 설치라고 보고하지 않는다.** npm의 강제 Expo58 전환은 기존 SDK57/RN0.86 보존 조건 때문에 하지 않았다. 경고 제외/버전 위조/의존성 downgrade도 없다.

### 최소 보완

- 노출 경로는 Expo → @expo/config → deepmerge4.3.1의 `dist/cjs.js` 빌드 도구다. 사용자 리뷰를 병합하거나 브라우저로 실행하는 앱 라이브러리가 아니다.
- `security-deepmerge.mjs`는 실제 Expo consumer의 resolved/real path가 프로젝트 node_modules 안인지 확인하고4.3.1 CJS의 원본 SHA256 `2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d`를 검증한다. 소스가 다르면 수정/실행을 거부한다.
- 대상/소스의3개 `destination[key] = value` 쓰기만 동등한 enumerable/configurable/writable data property로 바꾼다. `__proto__`를 데이터로 보존하되 setter를 실행하지 않는다. 배열/중첩/심볼/clone/custom arrayMerge/merge.all 동작을 유지한다. npm 버전과 감사 경고는 그대로 둔다.
- postinstall에서 적용, prestart/preweb/check/build:web에서 무수정 `--check`. 설치 스크립트를 끄거나 보완을 지우면 검사/빌드를 중단한다. 원본/일부 보완 소스의 deterministic 검증과 변조 거절, 실제 consumer 공격 입력6종, 정상 병합을 추가12테스트로 검사한다.
- 보완 범위는 **이번 Expo가 사용하는 CJS entry**다. 루트 index/UMD를 직접 가져오는 새 consumer는 별도 검토해야 한다. SDK/패키지/entry 변경 시 검증은 fail-closed한다. 안전하지 않은 플러그인·임의 JS 실행이나 이미 전역이 오염된 프로세스까지 보호한다고 주장하지 않는다.
- `npm ci` 성공:888패키지, 기존 lockfile/의존성 버전 변경 없음. 웹 JS `entry-982b7369139e4303feb8c114aa0fa4fc.js`, PWA `009a745c07935fac`로 이전과 동일. 빌드 보안만 보완했으며 사용자 화면을 바꾸지 않는다.

## 재현 명령과 권한 범위

```
npm ci
node scripts/security-deepmerge.mjs --check
npm run check
npm run build:web
npm run security:audit
npm run security:secrets -- --history
node scripts/check-anonymous-access.mjs
```

`supabase/tests/security_metadata.sql`은 읽기 전용. `record_isolation.sql`, `feed_blocks.sql`, `free_community.sql`은 각각 랜덤 합성 fixture/실제 제한 역할/전체 rollback이며, `figma_release_postconditions.sql`로 합성 잔존0을 확인했다. 이미 적용한 migration을 재실행하거나 실계정을 시험 계정으로 고르지 않는다.

## 검증하지 않은 것 / 지속 운영

- DB 역할 검사는 실제 사용자 JWT 두 개의 브라우저 E2E와 다르다. signed URL 발급/실제 바이너리 사진 업로드 HTTP E2E·실기기·전체 DB/Auth/Storage backup/restore·전문 침투 테스트는 실행하지 않았다.
- 패턴 기반 키 검사로 모든 과거 유출 부재를 보장할 수 없다. 실제 키가 새면 별도 폐기/재발급이 필요하며 이번에는 노출 증거가 없어 회전하지 않았다. 로컬 값/서버 secret 원문/인증 토큰은 출력하지 않았다.
- 웹 세션은 기존 Supabase 브라우저 저장, native는 SecureStore를 사용한다. 로그인 사용자 본인 브라우저의 공개 키/세션을 서버 비밀키로 오인하지 않는다. 실제 격리는 Auth/RLS/RPC/Storage에 의존한다.
- 공식 수정판/SDK 호환 패치가 나오면 유지보수용 보완을 제거하고 공식판으로 전환 후 같은 회귀를 실행한다. 신규 consumer/remote config/plugin 유입 시 다시 검사한다. 유료 scanner/API/요금제 변경은 하지 않았다.
- 롤백 기준은 source `edd009d`, 외부 `4eqmlnnd9n`. 소스 롤백 시 CJS 보완도 제거되므로 긴급 호환 문제에만 사용하고 보안 재적용 계획을 세운다. DB/사용자 데이터는 drop하지 않는다.
