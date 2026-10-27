# 공개키·계정 간 기록 격리 검증 — 2026-10-28 KST

## 대상과 결과

기존 운영 Supabase `vthswebqroygpbmxpqaj`를 검사했다. 공개용 키만 사용한 실제 HTTP 요청12개와, 실제 `anon`/`authenticated` DB 역할로 전환한 합성 A/B 계정의 롤백 검사를 통과했다. 실제 사용자의 기록·권한·공개 설정은 변경하지 않았다. 앱/DB 정책 수정이 필요한 실패는 발견하지 않았다.

| 접근 상황 | 최종 확인 |
|---|---|
| 공개키만 있고 로그인 없음 | 프로필·리뷰·답변·질문·키워드·태그 SELECT는 HTTP200 빈 배열. 관리자/일상 원본 테이블·Light/Core 저장·취향 원문 RPC는401 |
| 로그인 없는 관리자 리뷰 RPC | HTTP400 `admin_view_reviews_required`. 본문 데이터는 반환되지 않음. 401이 아니어도 명시적 관리자 권한 거절이며 임의의400을 성공으로 간주하지 않음 |
| 소유자 A | 합성 Light/Core 생성, 본인 기록 조회·수정·삭제 성공. 단순히 모두 차단하는 정책이 아님을 양성 대조로 확인 |
| 다른 회원 B | A의 비공개 Light/Core·공개로 설정했지만 미완료인 draft·관련 답변/질문/태그/키워드·원본 프로필 조회 차단 |
| B → A 기록 | 비공개/공개 완성본 모두 직접 UPDATE/DELETE 영향0행. A 소유 기록 위조 INSERT·답변 위조 INSERT 거절. 저장 RPC로 타인 ID를 제출해도 `review_not_found` |
| 소유권·관리자 위조 | A가 자기 기록의 user_id를 B로 바꾸기 거절. 일반 B의 관리자 리뷰 조회·자기 관리자 권한 올리기 거절 |
| 의도된 공개 완성 리뷰 | 로그인 회원 B의 조회 허용, 수정/삭제는 계속 금지 |
| 비공개 사진 | A 소유 `core-photos` 객체 메타데이터를 B가 조회하지 못하고 A 폴더/owner_id로 위조 업로드 메타데이터 INSERT도 거절 |

현재 핵심 테이블의 RLS 활성화를 운영 메타데이터에서 확인했다. 일부 테이블의 `anon` SELECT grant가 있어도 허용하는 RLS 행 정책이 없으므로 실제 데이터는 빈 결과였다. 테이블 grant 자체만으로 유출 여부를 단정하지 않는다.

공식 기준: [Supabase 공개키와 역할](https://supabase.com/docs/guides/getting-started/api-keys), [RLS와 grants](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 재실행

키 값과 응답 본문은 출력하지 않는다. 첫 명령은 `.env.local`의 기존 공개키만 사용하며 지정된 기존 프로젝트만 허용한다. 두 번째는 기존 CLI 인증을 사용한다. 다른 프로젝트에 그대로 실행하지 않는다.

```powershell
node scripts/check-anonymous-access.mjs
npx supabase db query --linked --project-ref vthswebqroygpbmxpqaj --file supabase/tests/record_isolation.sql -o json
```

SQL은 랜덤 합성 Auth 행·영화·기록·Storage 메타데이터만 한 트랜잭션 안에서 만들고 `ROLLBACK`한다. statement timeout20초/lock timeout3초를 사용한다. `current_user`와 `auth.uid()`를 확인한 제한 역할에서 RLS/RPC를 검사하며, postgres 상태에서 조회가 안 된다는 식의 잘못된 검증은 하지 않는다. 최종 별도 쿼리에서 `@rls-check.invalid` 합성 계정0개, `record-isolation-` 합성 영화0개를 확인했다. 실제 사진 업로드·이메일·AI 호출·계정 삭제는 하지 않았다.

검사 스크립트 문법, secret guard 및 보안 계약/키 보호 회귀25개도 통과했다. 앱 코드·DB 스키마/정책은 바꾸지 않았으므로 외부 앱을 새로 배포하지 않고 검증된 기존 `beta` deployment `ypn609gfct`를 유지한다.

## 범위와 한계

- 회원 A/B 부분은 운영 DB의 실제 제한 역할과 합성 claims를 사용한 **DB 권한 검사**다. 서로 다른 브라우저에서 실제 발급 JWT로 두 회원을 로그인시킨 종단간 검사는 아니다. 익명 공개키 부분은 실제 외부 HTTP 검사다.
- Storage 검사는 객체 메타데이터/RLS와 소유 폴더 위조를 다룬다. 실제 이미지 파일 전송·이미 발급된 signed URL의 만료/회수는 이번에 검사하지 않았다. 기존 signed URL은 만료 전 유효할 수 있다.
- 모든 기능/테넌트/타이밍 공격에 대한 침투 검사나 유출 부재의 절대 보장은 아니다. 신규 테이블/RPC/권한 변경 시 다시 실행한다.

## 모든 프로젝트의 기본 검사 절차

사용자 요청에 따라 개인 `C:/Users/letsh/.codex/AGENTS.md`에 `보안 검사 / 보안 점검` → `check-security`를 등록하고 개인 skill을 생성했다. 기존 `check-release`에도 같은 키/계정 격리 기준을 추가했다. 키 위치·ignore/추적·이력·빌드 노출, 익명/소유자/타인/관리자 API·RPC·DB·Storage, 양성 대조·롤백·명확한 미실행 범위를 기본 포함한다. 두 skill은 공식 validator를 통과했다.

개인 지침은 이 PC의 Codex 프로젝트에 적용된다. 다른 기기/다른 계정에는 개인 지침·skill 이관이 필요하다. 검사 요청만으로 정책 변경·키 회전·유료 서비스·운영 배포까지 자동 허가되는 것은 아니다.
