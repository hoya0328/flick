<div align="center">
  <img src="./docs/assets/flick-github-banner.svg" width="820" alt="FLICK 감정 기반 영화 발견과 감상 기록" />

  # FLICK

  **오늘의 감정으로 영화를 발견하고, 감상을 나의 언어로 남기는 곳.**

  감정 키워드 기반 영화 발견과 단계형 감상 기록을 연결하는 모바일 퍼스트 영화 저널

  [🌐 베타 체험하기](https://flick-film-journal--egnsgpv7r0.expo.app) ·
  [🎬 핵심 경험](#핵심-경험) ·
  [🗺️ 로드맵](#로드맵)

  ![Portfolio](https://img.shields.io/badge/Portfolio-Second_Project-F2233C?style=flat-square)
  ![Expo](https://img.shields.io/badge/Expo-SDK_57-15171A?style=flat-square&logo=expo&logoColor=white)
  ![Supabase](https://img.shields.io/badge/Supabase-Connected-3FCF8E?style=flat-square&logo=supabase&logoColor=white)
  ![TMDB](https://img.shields.io/badge/TMDB-Live_Data-01B4E4?style=flat-square)
</div>

---

## 서비스 소개

**FLICK**는 영화를 고르는 순간과 감상을 남기는 순간을 하나의 습관으로 연결합니다.

사용자는 지금 마음과 가까운 키워드를 고르고, 그 감정과 어울리는 영화를 발견합니다. 감상 후에는 긴 리뷰를 처음부터 쓰는 대신 가벼운 질문이나 비평 가이드를 따라 자신의 느낌을 기록합니다.

별점과 장르만으로는 남기기 어려운 감상의 결을 보존하고, AI는 사용자의 글을 대신 쓰지 않고 생각을 정리하는 조력자로 사용합니다.

## 왜 만들었나요?

한줄평은 감정을 충분히 담기 어렵고, 장문 리뷰는 시작하기 부담스럽습니다. 추천 서비스와 기록 서비스도 대부분 분리되어 있어 영화 선택이 개인의 기억으로 자연스럽게 이어지지 않습니다.

이 프로젝트는 다음 질문에서 출발했습니다.

> 지금의 감정으로 영화를 발견하고, 본 직후의 느낌을 3분 안에 내 언어로 남길 수 있다면 영화 기록을 더 오래 이어갈 수 있을까?

## 핵심 경험

- **감정 키워드 온보딩** — 지금 마음과 가까운 키워드 3~5개로 첫 취향 설정
- **실시간 영화 발견** — TMDB 검색과 키워드 기반 추천, 포스터 스와이프 실험
- **풍부한 영화 상세** — 감독·출연진·제작사·키워드·이미지·영상·한국 OTT 정보
- **보고 싶어요** — 사용자별 저장과 재접속 복구
- **안전한 상세 캐시** — 주문형 TMDB 상세 수집과 누락·실패·재시도 처리
- **반응형 웹** — 모바일 화면을 우선하고 PC에서도 같은 흐름 제공
- **감상 기록 준비** — 선택한 영화를 기록 단계로 전달하며 Light/Core 기록은 다음 개발 단계

## 제품 흐름

```text
감정 키워드 선택
   ↓
영화 추천·검색
   ↓
상세 정보와 OTT 확인
   ↓
보고 싶어요 또는 감상 영화 선택
   ↓
Light / Core 감상 기록 (3단계 예정)
   ↓
개인 아카이브와 취향 리포트 (4단계 예정)
```

## 현재 베타 범위

현재 외부 베타에서는 이메일 로그인, 취향 설정, 실시간 추천·검색, 영화 상세, 보고 싶어요 저장, 기록할 영화 선택까지 사용할 수 있습니다.

TMDB 전체 영화는 내부 DB에 무리하게 복제하지 않습니다. 검색된 작품의 상세정보를 필요할 때 가져와 캐시하며, 영화의 내부 ID를 유지해 향후 리뷰와 감상 기록이 공급자 데이터 갱신으로 사라지지 않도록 설계했습니다.

## 기술 구성

- TypeScript
- React Native + Expo SDK 57 + Expo Router
- 모바일 우선 반응형 웹과 향후 iOS 앱 공통 코드베이스
- Supabase Auth, PostgreSQL, Row Level Security, Edge Functions
- TMDB 서버 프록시와 주문형 상세 캐시
- Vitest, TypeScript, Expo ESLint
- EAS Hosting Preview

## 로컬 실행

Node.js 20 이상과 npm이 필요합니다.

```bash
npm install
npm run web
```

Supabase 공개 환경변수가 없으면 개인정보를 외부로 전송하지 않는 기기 내 데모 모드로 동작합니다. 서버 비밀값과 TMDB 토큰은 클라이언트 번들에 포함하지 않습니다.

## 검증

```bash
npm run check
npm run build:web
```

## 로드맵

- [x] 1단계 — 기반, 이메일 로그인, 키워드 온보딩
- [x] 2단계 — 영화 추천·검색·상세와 보고 싶어요
- [x] 2.5단계 — 주문형 전체 상세 캐시와 데이터 보존 구조
- [ ] 3단계 — 별점, Light/Core 감상 기록과 AI 보조
- [ ] 4단계 — 개인 아카이브, 취향 리포트와 출시 준비

제품 기획과 기술 결정은 [`docs/PROJECT_CONTEXT.md`](./docs/PROJECT_CONTEXT.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/ROADMAP.md`](./docs/ROADMAP.md)에서 확인할 수 있습니다.

## 데이터 출처

영화 정보와 이미지는 [TMDB](https://www.themoviedb.org/)를 사용합니다. OTT 제공 정보는 TMDB의 JustWatch 데이터를 기반으로 표시합니다. FLICK는 TMDB의 인증이나 보증을 받은 서비스가 아닙니다.

## 포트폴리오 노트

FLICK는 **개발로 창작하는 걸 즐기는 PM**을 지향하며 만든 두 번째 포트폴리오 프로젝트입니다.

사용자 문제와 MVP를 정의하고, 모바일 중심 사용자 흐름과 데이터 보존 구조를 설계한 뒤 실제 외부 사용자가 테스트할 수 있는 서비스까지 연결하고 있습니다.

---

<div align="center">
  <strong>발견은 가볍게, 감상은 오래 남도록.</strong>
</div>
