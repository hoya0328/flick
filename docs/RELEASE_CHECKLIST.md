# RELEASE CHECKLIST

## 코드와 데이터

- `git status --short`가 비어 있고 배포 커밋이 GitHub `main`에 push됐는지 확인한다.
- `npm.cmd run check`와 `npm.cmd run build:web`을 같은 커밋에서 실행한다.
- migration 적용 전 운영 DB 논리 백업을 만들고 복구 가능한 위치와 생성 시각을 기록한다.
- migration은 순방향 적용 후 핵심 RLS 조회를 확인한다. 실패하면 데이터 삭제 없이 호환 가능한 후속 migration으로 복구한다.
- EAS 웹 롤백은 직전 정상 deployment identifier를 `beta` 또는 운영 alias에 다시 연결한다.

## 개인정보와 안전

- 로그·번들·Git에서 API 키와 사용자 입력 본문이 노출되지 않는지 검사한다.
- 데이터 내보내기에는 사용자 본인 기록과 비식별 진단만 포함한다.
- 계정 삭제는 일회용 테스트 계정에서 `profiles`, `user_keywords`, `watchlist`, `reviews`, AI 감사 이벤트의 cascade 삭제를 확인한다.
- 이용약관·개인정보 안내에 TMDB와 Gemini 처리 조건, 보관 기간, 공개 범위와 삭제 방법을 반영한다.

## 웹 베타

- 320px, 390px, 480px와 데스크톱에서 로그인 → 탐색 → 기록 → 보관함 → 수정 흐름을 확인한다.
- Magic Link가 운영 HTTPS 주소로 복귀하는지 확인한다.
- Supabase Edge Function 오류율·429 한도·EAS 배포 상태를 확인한다.
- 전체 공개 완료 기록은 다른 계정에서 `/review/[id]` 읽기 전용으로 열리고 입력·수정·삭제 요소가 없는지 확인한다.
- 비공개·초안·존재하지 않는 기록은 공유 상세에서 내용을 노출하지 않고, 비소유자의 저장·삭제가 RLS로 거부되는지 확인한다.
- 공유 링크 로그인은 허용된 운영 루트 URL로 복귀한 뒤 원래 `/review/[id]`로 이동하는지 확인한다.
- 배포 후 고정 beta URL에서 `/welcome`, `/archive`, `/record`, `/review/[id]` 정적 경로를 확인한다.

## iOS TestFlight

- Apple Developer 계정, bundle identifier, 원본 아이콘·개인정보 문구를 준비한다.
- Sign in with Apple을 연결하고 이메일 로그인과 동일한 사용자 데이터 정책을 적용한다.
- EAS 클라우드 iOS 빌드 후 TestFlight 내부 테스터에서 웹과 동일 계정의 기록·캘린더·리포트가 일치하는지 확인한다.
- 충돌·오프라인·재로그인·계정 삭제를 테스트한 뒤에만 외부 테스터를 연다.

## 출시 판단

- 첫 기록 완료율, 두 번째 기록 전환, 기록 완료 시간과 AI 초안 수정률을 2주 베타 기준으로 검토한다.
- 비용·오류·삭제 요청이 허용 범위를 넘으면 신규 공개를 중지하고 직전 웹 배포로 롤백한다.
- Android 공개 빌드는 iOS·웹 핵심 지표와 운영 안정성을 확인한 뒤 진행한다.
