# API 키 저장·업로드 방어

## 현재 위치와 경계

| 종류 | 위치 / 소비자 | 공개 여부 |
|---|---|---|
| Supabase URL·publishable 키 | Git 제외된 루트 `.env.local` → `src/lib/supabase.ts` | 웹 번들에 포함되는 공개 식별자 |
| legacy anon 키 | 새 설정에서는 미사용, 기존 호환 fallback만 유지 | `anon` 역할인 경우에만 공개 허용 |
| Gemini API 키 | Supabase Edge Function 환경 `GEMINI_API_KEY` → 질문/초안/취향 분석 | 서버 전용 |
| TMDB 토큰 | Supabase Edge Function 환경 `TMDB_API_TOKEN` → `movies-discovery` | 서버 전용 |
| Supabase service-role 키 | Supabase 함수의 서버 환경 → 권한 검사 후 서버 처리 | 서버 전용, RLS 우회 가능 |
| 배포용 CLI 로그인 | 도구가 관리하는 사용자 인증 저장소, 앱 코드나 Git에 복사하지 않음 | 서버/개발자 전용 |

로컬 `.env.local`에는 공개용 두 항목만 있으며 `.env.example`은 빈 템플릿이다. 이 파일을 숨겨도 `EXPO_PUBLIC_*` 값 자체가 비밀이 되지는 않는다. 공개 키를 사용하는 요청의 실제 보호는 로그인·서버 권한 검사·RLS다. 관리자 비밀키로 공개 키를 교체하면 안 된다.

공식 기준: [Expo 공개 환경 변수](https://docs.expo.dev/guides/environment-variables/), [Supabase 키와 데이터 보호](https://supabase.com/docs/guides/database/secure-data).

2026-10-28에 기존 운영 Supabase의 secret **이름 목록만** 확인했고 `GEMINI_API_KEY`, `TMDB_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY` 등록을 확인했다. 값은 조회·기록·출력하지 않았다. 현재 로컬에 도달 가능한 Git 이력716개 텍스트 blob과 변경 전 웹 출력86개 파일에서 알려진 비밀키 패턴은 미검출이다. 이는 모든 과거 배포·외부 로그·fork를 조사했다는 뜻이 아니다.

## 자동 방어

- `.gitignore`: `.env` 계열·백업·`*.env`·개인 인증서·`secrets/`·서비스 계정 JSON을 제외한다. 빈 `.env.example`만 예외다. 이미 추적된 파일은 ignore로 사라지지 않으므로 별도 검사한다.
- `npm run security:secrets`: Git 추적/미추적(ignored 제외) 소스의 알려진 비밀키 형식, 비밀키 리터럴, 클라이언트의 서버 환경 변수 참조를 검사한다. 루트 Expo env와 프로세스의 공개 변수는 Supabase 세 이름만 허용한다. 키 값은 출력하지 않는다.
- `npm run security:secrets -- --staged`: 워킹 파일이 아니라 Git index에 실제로 올라갈 내용을 검사한다.
- `npm run security:secrets -- --history`: 로컬에 도달 가능한 모든 Git refs의 텍스트 blob과 민감 파일 경로를 검사한다. 삭제한 파일도 이 범위에 포함된다.
- `npm run security:secrets -- --build`: `dist` 텍스트와 민감 경로를 검사한다. 빌드 누락·심볼릭 링크·검사 실패는 통과시키지 않는다.
- `check`, `build:web`, 로컬 `start`/`web`, CI에서 검사한다. 웹 빌드 전후 모두 차단한다. 런타임도 실제 공개 키 자리에 서버 키가 들어오면 값 없이 오류를 내고 클라이언트 생성을 중단한다. 런타임 검사는 이미 번들에 포함된 비밀을 회수하지 못하므로 빌드 전 검사가 우선이다.
- `.githooks/pre-commit`은 staged 검사, `pre-push`는 도달 가능한 이력 검사를 실행한다. 새 clone은 아래 명령으로 설치한다. 기존 커스텀 hooksPath가 있으면 덮어쓰지 말고 통합한다.

```bash
git config --local core.hooksPath .githooks
npm run security:secrets
npm run security:secrets -- --history
npm run build:web
```

## 한계와 유출 대응

이 검사는 알려진 형식/할당 규칙 기반이며 모든 비밀·변형·암호화·바이너리·이미지·외부 로그까지 탐지하는 완전한 DLP가 아니다. Git hook은 다른 clone에 자동 적용되지 않고 우회될 수 있다. CI는 이미 올라간 커밋을 되돌리는 도구가 아니다. 따라서 민감 파일은 처음부터 저장소에 넣지 않고 새 provider/공개 변수를 도입할 때 규칙을 검토한다.

실제 비밀이 Git·웹·로그에 노출됐다면 **먼저 해당 공급자에서 폐기/재발급**한다. `.gitignore` 추가나 파일 삭제만으로 기존 토큰·Git 이력·배포·캐시·fork가 무효화되지 않는다. 권한 있는 사용자와 영향 범위를 확인하고 명시적 승인 후 이력 정리 및 재배포를 진행한다. 이 작업에서 기존 키를 회전하거나 Git 이력을 재작성하지 않는다.
