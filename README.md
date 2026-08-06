# FLICK 서비스

FLICK는 영화 감상 전에는 감정 키워드로 작품을 발견하고, 감상 후에는 가벼운 질문 또는 AI 비평 가이드를 통해 기억을 기록하는 모바일 영화 경험 서비스다.

이 폴더는 Focus Quest와 독립된 신규 서비스 프로젝트다. 제품 기획, 작업 환경, TypeScript·Expo 기반 아키텍처와 4단계 개발 순서가 준비되어 있다.

## 문서

- `docs/PROJECT_CONTEXT.md`: 제품 방향, 사용자, 문제, MVP, 지표
- `docs/SCREEN_STRUCTURE.md`: 제공된 화면의 구조와 의도, MVP 재구성
- `docs/ROADMAP.md`: 검증 및 개발 우선순위
- `docs/ARCHITECTURE.md`: 기술 스택, 데이터, API, 권한, 배포 설계
- `docs/ART_BIBLE.md`: 모바일·웹 공통 시각 및 인터랙션 규칙
- `docs/COSTS.md`: 앱·웹 운영 비용과 비용 통제 기준
- `docs/DECISIONS.md`: 확정·가정·미결정 사항
- `docs/HANDOFF.md`: 다음 작업자가 이어갈 항목
- `docs/SERVICE_SETUP.md`: 현재 프로젝트 설정과 검증 결과
- `docs/SUPABASE_SETUP.md`: Supabase 프로젝트 생성·DB·로그인 연결 순서

## 검토한 원본

- `C:\Users\letsh\Downloads\Click_서비스소개서.pdf`
- `C:\Users\letsh\Downloads\Click_화면구성.pdf`

원본 PDF는 프로젝트 용량과 중복을 줄이기 위해 복사하지 않았다.

## 개발 실행

요구사항: Node.js 20 이상, npm.

```powershell
npm.cmd install
npm.cmd run web
```

실제 Supabase 로그인을 연결하려면 `docs/SUPABASE_SETUP.md` 순서대로 공개용 환경변수와 migration을 적용한다. 환경변수가 없으면 개인정보를 서버로 보내지 않는 기기 내 데모 모드로 동작한다.

## 검증 명령

```powershell
npm.cmd run check
npm.cmd run build:web
```

현재 구현 범위는 1단계 기반과 온보딩이다. 영화 탐색, 실제 기록, AI, 공개 피드와 배포는 아직 포함하지 않는다.
