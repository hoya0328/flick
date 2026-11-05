# Figma 소개 원본 자산

사용자가 제공한 디자인 파일 `7o0aA5nN2muGSgSEdtsYw7`, 구역 `26:1619`에서 받은 원본이다. 포스터는 영화 이미지 예외이며 별도 UI 스크린샷을 앱 화면으로 사용하지 않는다. 기존 TMDB/콘텐츠 크레딧과 권리 조건은 유지한다.

| 파일 | 원본 크기 / 출처 |
| --- | --- |
| brand-small.svg | 84×25, `26:1651` |
| brand-splash.svg | 326×95, `26:1761` |
| replace-light.svg | 26.0724×26, 소개 `26:1675` |
| replace-core.svg | 26×26, 소개 `26:1705` |
| mic.svg | 37×37, 소개 `26:1705` |
| arrow-light.svg | 7.48171×11.3333, 소개 `26:1734` |
| arrow-core.svg | 7.53493×10.75, 소개 `26:1734` |
| poster-1.png ~ poster-4.png | 소개 `26:1734`가 제공한 원본 영화 포스터 |

`node scripts/build-intro-vectors.mjs`가 SVG XML과 원래 intrinsic 크기를 그대로 TS manifest에 기계적으로 복사한다. `--check`는 원본과 manifest의 일치를 검사한다. 렌더러는 원본 경로/viewBox를 변경하지 않고 wrapper에서 비율 확대/축소하고 SVG ID만 충돌 방지한다. 만료되는 다운로드 URL이나 인증값은 보관하지 않는다.
