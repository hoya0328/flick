# 보안 의존성 수정 / 이메일 연동 보류 — 2026-11-19 KST

## 범위와 판정

사용자가 앞선 최종 검수의 2번(의존성)·3번(SMTP)을 진행하도록 요청했다. 이후 **‘메일 연동은 보류’**를 선택해 SMTP는 변경하지 않았다. 이번 결과는 **의존성 실제 수정 + 공격 패턴 완화**이며 **전체 보안 감사 통과는 아니다**.

| 항목 | 변경 전 | 현재 |
| --- | --- | --- |
| node-forge | 1.4.2, 공식 경고 존재 | 공식 수정판 1.4.3 설치·실제 Expo 서명 소비 경로 확인, audit에서 제거 |
| picomatch | 4.0.7 / 2.3.2의 반복 extglob ReDoS | 같은 정식 버전에 검토된 fail-closed 입력 경계 적용. 공식 수정판 없음, HIGH 경고 유지 |
| 전체 npm audit | high34 + moderate1 = 35항목 | high34, moderate/low/critical0 = 34항목 |
| omit-dev audit | high24 + moderate1 = 25항목 | high24, moderate/low/critical0 = 24항목 |
| CI | 감사 실패 시 회귀/빌드도 skipped | 회귀/빌드를 먼저 검증한 뒤 동일 감사로 실패. 실패 임계치·종료 코드는 유지 |
| 메일 | 별도 SMTP OFF | 사용자 보류로 그대로. 외부 일반 신규 가입 메일은 준비 완료 아님 |

경고 항목 수에는 같은 원인을 따르는 전이 패키지가 포함된다. 34개의 독립적인 침해 사고나 사용자 데이터 유출을 뜻하지 않는다. 반대로 로컬 패치로 경고를 무시하거나 패키지 버전을 위조해 0건으로 보고하지 않는다.

## 실제 구현

- Expo57/React Native0.86/React19와 기존 Supabase를 유지했다. 잠금 파일의 실제 패키지 변경은 node-forge 1.4.2→1.4.3의 version/resolved/integrity 3항목이다. 강제 SDK 전환/다운그레이드 없음.
- npm install이 잠금 파일과 달리 디스크의 1.4.2를 남긴 것을 테스트가 발견해 `npm ci`로 깨끗하게 재설치했다. postinstall 재현 후 실제 `@expo/code-signing-certificates`가 resolve하는 forge1.4.3을 확인했다.
- `scripts/security-picomatch.mjs`는 잠금 파일에 존재하는 3개 설치 경로의 parse.js를 확인한다. 원본 버전·전체 SHA·node_modules 내 realpath를 검증하고, 검토된 extglob 닫힘 지점에만 한 개의 입력 경계를 삽입한다. 원본/위치/버전이 다르면 임의 패치하지 않고 실패한다.
- `+(...)`/`*(...)`는 **prefix-free literal 대안**만 허용한다. wildcard·중첩·빈 branch·겹치는 prefix·과도한 길이/대안 수를 regex 생성 전에 거부한다. case-insensitive 옵션/flags의 prefix folding과 Unicode의 복잡한 case-fold도 보수적으로 제한한다.
- `+(*a)`/`+(*)` 등은 명확한 SyntaxError로 중단된다. 정상 `**/*.{ts,tsx}`, `!(*.test)`, `@(movie|review)`, `+(spec|test)`, 기본 대소문자 구분의 한글 대안 등은 회귀로 확인했다.
- 이는 모든 glob 문법을 완벽히 보존하는 upstream 수정판이 아니다. 반복 extglob에 wildcard/복합식이 필요한 새 설정은 검토 후 단순 glob 목록으로 바꾸거나 공식 수정판 도입이 필요하다. 옵션으로 이 차단을 해제하지 않는다.
- postinstall과 start/web/check/build 가드에서 적용 여부를 강제한다. 버전 문자열은 그대로이며 `npm audit`의 HIGH는 계속 출력된다. 기존 URL decoder/CJS ESM 연결과 deepmerge own-property 보완도 유지했다.
- 직전 백업 작업에서 추가한 비공개 백업 형식의 Git 차단 가드/6개 회귀도 보안 소스와 함께 보존한다. 실제 백업 파일·계정/사진 원문·발표자료·로컬 도구 바이너리는 업로드하지 않는다.

## 검증

- `tests/security-extglob.test.ts`: 14개 회귀. 정식 4.0.7의 `+(*a)` 입력이 **메모리96MB/1초 timeout의 격리 child에서** 시간 초과함을 재현했다. 공격성 입력을 운영 서버나 실제 사용자에게 보내지 않았다.
- 3개 실제 설치 경로의 공격 벡터/옵션 우회 거부, 정상 파일 패턴, 대소문자 옵션, 길이/branch 제한, 손상된 upstream 거부, idempotency, 실제 Expo 소비 forge1.4.3의 합성 RSA2048 서명·인증서 왕복을 확인했다.
- 전체 로컬 타입/린트/테스트, 48경로 웹 export, iOS·Android JS export 및 비밀정보 검사를 수행한다. JS export는 실기기 네이티브 실행/스토어 배포 검증과 다르다.
- 최종 로컬44파일/344테스트·타입·린트·웹48경로 통과. iOS1454모듈/Android1589모듈의 `--no-bytecode` export 성공. 소스601대상/빌드99파일 비밀정보 검사 통과. 최종 웹 JS는 `entry-288f9c8c8dc5b6496196cdafa170c94c.js`, 정적 PWA cache ID `7e78de9effa81b85`다.
- 새 로컬 데모의 온보딩→홈→탐색→Light/Core 선택창 렌더, 해당 탭 console error/warn0 확인. 실제 로그인/메일/계정 생성·기록 저장·AI·사진 업로드는 이번 검증에서 실행하지 않았다.
- 실제 공개키 HTTP 24개 검사에서 비공개/관리자 테이블·저장 RPC·서버 함수 접근 거부를 재확인했다. 이번에 DB 정책/서버 함수를 바꾸지 않았으며 기존 합성 A/B 역할 전체 행렬을 새로 실행한 것으로 보고하지 않는다.
- 증거(ignored): `tmp/dependency-security-20261119/`, 로컬 실제 렌더 `local-record-sheet.jpg`.

## 메일 조사와 보류

프로젝트의 현재 env 이름과 설정에는 별도 발송 계정/도메인이 없었다. 다른 개인 서비스의 모든 계정 보유 여부를 전수 조사한 것은 아니다.

- Resend 등의 일반 발송 서비스는 운영용 verified sender/domain 조건이 있다. SMTP2GO는 무료 한도/Single Sender 기능이 있어도 공용 이메일 가입 제한·발신 도메인 DMARC 제한이 있어, ‘도메인 없이 바로 완료’라고 단정하지 않았다.
- Gmail SMTP를 임시 대안으로 제시하면서 발신 주소 노출, Google 경유, 앱 비밀번호/2단계 인증·발송 제한·차단 가능성을 설명했고 사용자는 **보류**를 선택했다.
- 메일 공급자 가입/약관 동의/앱 비밀번호 생성/토큰 입력/메시지 전송을 하지 않았다. 이메일 확인을 끄거나 일반 가입을 검증 없이 허용하지 않았다. 기존 게스트 체험은 별개로 유지한다.

## 게시 / 후속

- 기존 GitHub main과 EAS 프로젝트 `d701494e-4875-45b4-b9c4-feb15dac3e85`의 `beta`만 사용한다. 새 대상/유료 빌드/요금제 변경 없음.
- 직전 웹 `do0u03tp9j`와 소스 `136746e`는 복원 식별자로 보존한다. 롤백하면 도구 보완·node-forge 수정도 되돌아갈 수 있다.
- 공식 picomatch 수정판이 나오면 출처·API/글롭 의미·보안 회귀를 대조하고 로컬 가드를 교체/제거한다. 그 전까지 HIGH34와 CI 감사 실패는 잔여 항목이다. 더 넓은 regex/전체 의존성 안전성을 보장하지 않는다.
- 기존 HANDOFF/DECISIONS·발표 원본/QR 제작 등의 관련 없는 미커밋 변경은 보존하고 게시에 섞지 않는다. 최종 commit/deployment/CI 결과는 게시 후 아래에 기록한다.

공식 근거: [picomatch advisory: 수정판 없음](https://github.com/advisories/GHSA-fc5q-39xc-vjpf), [node-forge 1.4.3 수정판](https://github.com/advisories/GHSA-6889-vf6x-f3g5), [Gmail 앱 비밀번호](https://support.google.com/mail/answer/185833?hl=ko), [SMTP2GO 발신 검증](https://support.smtp2go.com/hc/en-gb/articles/115004408567-Verified-Senders).

### 최종 게시 확인

- 보안 코드 `d0953807797464a17a8c5a6ace926f7fd06c9a1b`를 GitHub main에 push했다. 원격 복원 태그 `rollback/security-before-2026-11-19`는 직전 `136746e`를 가리킨다. 실제 비공개 백업/발표자료/서버 비밀값은 게시하지 않았다.
- 기존 beta 새 deployment **`h01wwxmbwk`**, 고정 주소 `https://flick-film-journal--beta.expo.app` 유지. 이전 `do0u03tp9j` 보존. 새 대상/유료 요구/SMTP·서버 함수·DB 설정 변경 없음.
- 외부29경로 HTTP200 및 최종 웹 엔트리 bytes 일치, 빌드99파일 비밀정보 재검사 통과. 무료 입장/AI gate open,11/24 00:00KST 종료/확인 기한 유지. 점검 시 AI394/일·12/분 잔여. 새 Gemini/가입/메일 호출 없음.
- [코드 커밋 GitHub CI44337507515](https://github.com/hoya0328/flick/actions/runs/44337507515): 비밀정보·깨끗한 설치·타입/린트/344테스트·웹 빌드 **성공**, 마지막 의존성 감사 **실패**. CI 전체 성공으로 보고하지 않는다. 이후 문서 전용 커밋은 실행 코드를 바꾸지 않는다.
- 로컬 검수 탭과 임시8086 서버 정리. 앞선 문서·발표/QR·비공개 백업 도구의 관련 없는 미커밋 변경은 남겨 보존했다. 실기기 네이티브 실행, 전체 사용자 JWT E2E, 실제 메일 수신 검사는 이번 완료 범위가 아니다.
