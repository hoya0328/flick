<div align="center">
  <img src="./docs/assets/flick-github-banner.svg" width="820" alt="FLICK 영화 기록 서비스" />

  # FLICK

  **영화를 발견하고, 보고, 오래 기억하기 위한 기록 서비스**

  [직접 사용해보기](https://flick-film-journal--beta.expo.app)

  ![Beta](https://img.shields.io/badge/Beta-Live-F2233C?style=flat-square)
  ![Expo](https://img.shields.io/badge/Expo-SDK_57-15171A?style=flat-square&logo=expo&logoColor=white)
  ![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)
  [![CI](https://github.com/hoya0328/flick/actions/workflows/ci.yml/badge.svg)](https://github.com/hoya0328/flick/actions/workflows/ci.yml)
</div>

---

## 왜 만들었나

영화를 보고 별점이나 한 줄만 남기자니 나중에 기억나는 게 별로 없고, 그렇다고 매번 긴 리뷰를 쓰는 건 부담스러웠습니다.

그날의 감정으로 영화를 찾고, 상황에 따라 짧게 또는 깊게 기록한 뒤 시간이 지나도 다시 꺼내볼 수 있는 서비스를 만들고 싶었습니다.

## 지금 할 수 있는 것

- 감정 키워드로 영화 추천받기
- 영화 검색과 한국 OTT 정보 확인
- 보고 싶은 영화 저장
- Light 또는 Core 방식으로 감상 기록
- 작성 중인 기록 자동 저장
- 캘린더와 취향 리포트로 지난 기록 돌아보기
- 공개한 기록에 공감, 댓글, 저장
- 영화 컬렉션과 큐레이션 만들기
- 이모지 영화 퀴즈 플레이

## 두 가지 기록 방식

| | Light | Core |
|---|---|---|
| 언제 쓰나 | 간단히 남기고 싶을 때 | 생각을 조금 더 깊게 정리하고 싶을 때 |
| 방식 | 질문과 느낌 태그 중심 | 답변에 따라 이어지는 질문 |
| AI | 없어도 사용 가능 | 다음 질문과 초안 정리를 보조 |
| 결과 | 짧고 빠른 감상 기록 | 직접 고쳐서 완성하는 긴 기록 |

AI가 내 감상을 대신 쓰고 바로 올리지는 않습니다. 질문을 이어주거나 초안을 정리하는 데만 쓰고, 마지막 내용은 직접 확인하고 고치게 만들었습니다.

## 기록과 개인정보

- 새 기록은 항상 `나만 보기`로 시작
- 완료하기 전 초안은 다른 사람에게 공개되지 않음
- 다른 사람의 공개 기록은 읽기만 가능
- 사용자별 데이터 권한은 Supabase RLS에서 다시 확인
- Gemini 키와 TMDB 토큰은 앱 안이 아닌 서버에만 저장
- 계정과 내 기록을 직접 내보내거나 삭제할 수 있음

## 기술 구성

```text
Expo / React Native
        ↓
Supabase Auth · PostgreSQL · RLS
        ↓
TMDB 영화 데이터 · Gemini 기록 보조
```

- TypeScript strict mode
- Expo Router 기반 웹·iOS·Android 공통 구조
- Supabase 인증, 데이터베이스와 Edge Functions
- Vitest 58개 테스트
- 모바일 우선 반응형 웹

## 로컬 실행

```bash
git clone https://github.com/hoya0328/flick.git
cd flick
npm install
cp .env.example .env.local
npm run web
```

Windows PowerShell에서는 `cp` 대신 아래 명령을 사용하면 됩니다.

```powershell
Copy-Item .env.example .env.local
```

## 현재 상태

반응형 웹 베타는 실제로 사용할 수 있습니다. 다음 목표는 서로 다른 계정의 최종 권한 검사, iOS TestFlight와 Android 빌드입니다.

- [x] 추천·검색·영화 상세
- [x] Light/Core 기록과 AI 보조
- [x] 캘린더·취향 리포트·공유
- [x] 공개 기록·댓글·컬렉션·큐레이션
- [x] 외부 웹 베타
- [ ] iOS TestFlight
- [ ] Android 공개 빌드

## 데이터 출처

영화 정보와 이미지는 [TMDB](https://www.themoviedb.org/)를 사용합니다. OTT 제공 정보는 TMDB가 전달하는 JustWatch 데이터를 바탕으로 표시합니다.

> This product uses the TMDB API but is not endorsed or certified by TMDB.

---

<div align="center">
  <strong>발견은 가볍게, 감상은 오래 남도록.</strong>
</div>
