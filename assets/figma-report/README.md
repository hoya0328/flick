# 취향 리포트 원본 벡터

사용자 Figma `7o0aA5nN2muGSgSEdtsYw7`, `15:335` 구역의 `15:922` 리포트와 프로필 내비게이션 원본 SVG12개다. 임시 다운로드 URL·인증값·예시 사용자 사진/숫자/차트는 저장하지 않는다.

| 파일 | root 크기 |
| --- | --- |
| report-bullet.svg | 6×6 |
| report-core-card.svg | 360×238 |
| report-light-card.svg | 360×218 |
| report-nav-profile.svg | 27×27 |
| report-rank-first.svg / report-rank-other.svg | 40×40 |
| report-rank-small.svg | 20×20 |
| report-rating-card.svg | 360×354 |
| report-rewatch-card.svg | 360×246 |
| report-score-card.svg | 360×305 |
| report-share.svg | 20.8008×20.8008 |
| report-star.svg | 16.9454×16.1654 |

`build-report-vectors.mjs`가 원본 XML과 intrinsic 크기를 손실 없이 복사하며 `design:check`가 일치를 확인한다. 카드 배경은 원본 크기에 내용이 들어갈 때 원본 SVG, 작은 폭/긴 실제 문구에는 같은 선·모서리의 코드 레이아웃으로 확장한다. 사용자 사진은 기존 Storage, 차트·숫자·문자는 실제 기록 기반 벡터/텍스트다.
