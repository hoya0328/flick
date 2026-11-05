# Figma 회색 5개 구역 ↔ 현재 앱 구현 현황

검토일: 2026-11-05 KST. 소스 `3ad201b`, 기존 외부 `https://flick-film-journal--beta.expo.app`의 화면과 코드를 읽기 전용으로 비교했다. 앱 코드·DB·계정·공개 설정은 수정하지 않았고 AI 호출/저장/배포도 하지 않았다.

## 범위와 결론

회색 구역은 리뷰 `2:453`, 프로필 `15:335`, 피드 `26:208`, 탐색 `26:776`, 스플래시+온보딩 `26:1619`다. 홈 `1:27`은 별도 프레임으로 이번 5개 구역 밖이다. 구역 하나 안에 여러 화면/상태가 들어 있으므로 라우트가 있다는 것만으로 완료 처리하지 않았다. 기능 존재와 새 디자인 반영 여부를 분리했다.

| 순서 / 구역 | 현재 구현 | 남은 작업 / 상태 |
|---|---|---|
| 1 리뷰 | 기록 선택 하단 시트, 영화 검색/선택, 반점 별점·드래그·멘트, Light 5질문/태그/skip/1회 변경/로딩/대표 키워드/초안 수정, Core 연계 질문/피드백/매거진 편집·사진·저장 코드가 있음 | 핵심 구현. 티켓 스캔은 안내만 있음. Light 음성은 종전 제외 범위. Core 음성은 기기 내 한국어 인식을 지원하는 환경에 한정. AI 실호출과 각 단계의 픽셀 일치는 이번에 재검증하지 않음 |
| 2 프로필 | 프로필 편집/공유·공개 동의, 팔로우, 통계, 캘린더, 내 피드, 영화/리뷰/피드/매거진/컬렉션 보관함, 12유형 계산 및 리포트 진입 코드가 있음 | 기본 화면은 대부분 구현. 취향 리포트 상세는 새 빨간 헤더·막대 그래프·Light/Core별 서술 인사이트 구성과 다름. 화면/차트 재구성 및 아직 없는 분리 해설 추가가 필요 |
| 3 피드 | 본문+사진 게시/수정/비공개/공개, 팔로잉 목록, 글 좋아요/댓글/저장/신고/휴지통, 공개 리뷰/매거진 목록 기반이 있음 | 현재 7개 탭의 관리형 화면을 새 전체/팔로우 타임라인·카드·작성/상세 화면으로 재구성. 사용자 작성 투표·익명 질문/응답·영화 태그 카드·비디오 첨부, 일상 댓글 답글/댓글 공감은 별도 구현 필요 |
| 4 탐색 | 영화 제목 검색, 감정 필터, TMDB 상세/OTT 데이터 처리, 보고 싶어요, 컬렉션, 기존 추천/수동 큐레이션/취향 밖 추천의 일부 기반이 있음 | 새 탐색 허브·추천 성향 슬라이더·상황별 카드·키워드 추천·목록 필터/추천 이유·반대 취향 카드·니치/컬렉션 진입을 연결해야 함. 영화 상세의 배경 헤더/키워드/감상 포인트/리뷰/매거진/연관 영화도 새로 구성 |
| 5 스플래시+온보딩 | 로고 로딩, 로그인/회원가입, 취향 키워드 3~5개 설정의 기존 흐름이 있음 | 새 로고 스플래시와 소개 4장(시작→Light 소개→Core 소개→첫 기록 방식 선택)은 미구현. 다음/건너뛰기/진행 표시/재방문 처리/기존 인증·취향 설정 연결 필요 |

## 반드시 구별할 기존 기능

- `experiments`의 고정 주간 투표는 이미 있다. 사용자가 자신의 피드 글에 선택지를 넣어 만드는 투표는 없다. 투표 테이블을 새 글에 그대로 연결할 수 있는 것은 아니다.
- 공개 리뷰 댓글에는 1단계 답글이 있다. 일상 피드의 댓글은 parent가 없는 별도 모델이며 새 디자인의 답글/댓글별 공감은 추가해야 한다.
- 반대 키워드 기반 ‘취향 밖 한 걸음’은 취향 인사이트에 있다. 새 탐색의 추천 비율 슬라이더, 품질/타인 평가를 함께 고려한 ‘예상 밖의 좋은 영화’와는 다르다.
- 니치/전문가 큐레이션과 컬렉션 저장 기반은 있다. 탐색 화면에 새 디자인으로 배치하는 작업은 남아 있다.
- 12유형 분류 자체는 구현되어 있다. 새 취향 리포트 상세의 디자인과 Light/Core별 자연어 설명이 모두 구현되었다는 뜻은 아니다. 현재 재감상 추천은 별점·시점·현재 키워드 겹침 기반이다.
- 영화 상세의 기존 평점은 TMDB 10점 표기다. 새 5점 UI와 연결할 때 사용자 별점과 TMDB 평점의 기준/환산/평가 수를 명시해야 한다.
- Figma의 128편/64개 리뷰/팔로워43명·샘플 인사이트는 예시다. 실제 사용자 기록으로 계산해야 하며 예시 수치를 복제하지 않는다.

## 추천 진행 순서

1. **온보딩**: 4장과 스플래시, 다음/skip/재방문 분기. 기존 로그인과 필수 취향 선택을 없애는지, 앞에 소개만 추가하는지 구현 전에 정한다. 기존 인증은 보존하는 방향을 우선 검토한다.
2. **탐색·영화 상세**: 기존 검색/TMDB/저장 기반 위에 새 허브→영화 목록→상세를 연결한다. 추천 비율의 의미·필터/추천 규칙·평점 기준을 정하고 무료 규칙 기반부터 검증한다. ‘기분/장면’ 자유 검색은 현재 제목 검색과 별도 범위다.
3. **피드**: 우선 기존 본문/사진/공감/저장 기능을 새 화면에 연결한다. 이후 영화 첨부→사용자 투표→익명 질문/응답→답글/댓글 공감 순으로 데이터·권한·알림·신고 범위를 추가한다. 비디오의 용량/재생/업로드 비용 조건은 별도로 검토한다.
4. **취향 리포트·잔여 마감**: 기존 12유형 계산은 유지하며 새 상세 화면·별점 차트·Light/Core별 근거 해설·재감상 카드로 재구성한다. 리뷰의 티켓 스캔/음성 범위와 새 화면 SVG·폰트·간격도 정리한다. 유료 연동은 별도 승인 없이 추가하지 않는다.

## 근거 코드

- 리뷰: `src/features/reviews/recording-launcher.tsx`, `src/app/light-record.tsx`, `src/app/core-record.tsx`, `src/features/reviews/core-speech.web.ts`.
- 프로필/리포트: `src/app/(tabs)/profile.tsx`, `src/features/profile/saved-content.tsx`, `src/app/taste-insights.tsx`, `src/features/reports/twelve-taste-panel.tsx`, `taste-engine.ts`, `taste-personalization.ts`.
- 피드: `src/app/(tabs)/feed.tsx`, `src/app/post-edit.tsx`, `src/app/post/[id].tsx`, `src/features/community/social-service.ts`, `social-ui.tsx`, `community-service.ts`, `src/app/experiments.tsx`.
- 탐색: `src/app/(tabs)/search.tsx`, `src/app/movie/[id].tsx`, `src/features/discovery/movies.ts`, `discovery-insights.ts`.
- 온보딩: `src/app/onboarding.tsx`, `src/app/welcome.tsx`, `src/components/loading-screen.tsx`, `src/app/_layout.tsx`.

## 이번 검증 범위와 한계

현재 외부 세션은 데모다. 피드 실계정 화면은 로그인 게이트까지만 직접 확인했으며, 실제 작성·공감·댓글 저장의 성공을 이번 UI 검토로 주장하지 않는다. 관련 코드와 기존 RPC 연결의 존재를 확인했다. 개인 기록·설정은 변경하지 않았다.

AI 생성/무료 제공 상태, 실제 영화 포스터·최신 TMDB 응답, 음성 권한, 실사진 업로드, 로그인/회원가입 완료는 재실행하지 않았다. Figma 댓글은 이번 화면 기준 대조에 포함하지 않았다. 스크린샷만으로 전체 접근성 또는 픽셀 일치를 보장하지 않는다. 새 슬라이더에는 터치 외 키보드/읽기 라벨과 상태 표시가 필요하며, 태그/투표 상태도 색만으로 전달하지 않도록 구현 시 확인한다.

## 화면 증거

이번에 새로 받은 Figma 구역 이미지와 402×874 외부 앱 화면을 `tmp/figma-audit-20261105`에 저장하고 열어 확인했다. 로그인 게이트는 피드의 미검증 범위를 보여 주는 증거다. `app-light-search.png`는 전환 중 캡처라 최종 근거에서 제외했다. 아래는 개발 범위 비교용이며 서로 다른 전체 구역/뷰포트 이미지를 픽셀 측정용으로 비교하지 않는다.

| 구역 | Figma 전체 구역 | 현재 앱 대표 상태 |
|---|---|---|
| 1 리뷰 | ![리뷰 설계](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/figma-review.png) | ![기록 방식 선택](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/app-review-launcher.png) |
| 2 프로필 | ![프로필 설계](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/figma-profile.png) | ![현재 프로필](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/app-profile.png) |
| 3 피드 | ![피드 설계](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/figma-feed.png) | ![피드 로그인 게이트](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/app-feed.png) |
| 4 탐색 | ![탐색 설계](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/figma-explore.png) | ![현재 탐색](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/app-explore.png) |
| 5 온보딩 | ![새 온보딩 설계](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/figma-onboarding.png) | ![기존 취향 설정](C:/Users/letsh/Documents/ChatGPT/Flick/tmp/figma-audit-20261105/app-onboarding.png) |

리포트·영화 상세의 현재 형태도 같은 폴더의 `app-taste-report.png`, `app-movie-detail.png`에 보관했다. 앱 임시 뷰포트는 복구하고 비교용 앱 탭만 닫았으며 사용자의 Figma 탭은 유지했다. 검토 문서는 로컬에만 저장하고 Git push/배포는 하지 않았다.
