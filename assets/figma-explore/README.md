# 탐색 원본 자산

사용자 제공 Figma `7o0aA5nN2muGSgSEdtsYw7`, `26:1316/26:1044/26:777/26:1581`의 원본 다운로드다. UI 스크린샷을 구현 자산으로 사용하지 않는다. 사진·영화·TMDB/JustWatch의 기존 권리/크레딧 조건은 유지한다. 임시 다운로드 URL·인증값은 저장하지 않는다.

- `situation-quiet.png`, `situation-walk.png`, `situation-friends.png`: 허브 `26:1527/26:1523/26:1520`. 표시160×160, cover.
- `more.svg`(9.41421×16), `star.svg`(15.0433×14.3564), `discovery-plus.svg`(40×40), `search.svg`(16.7418×16.7), `send.svg`(27.2424×25.197): 허브 원본의 제목 더보기/평점/취향 밖/검색/상단 메시지.
- `filter.svg`(22×20), `back.svg`(12.5663×22): 목록 `26:1312/26:1314`, 디자인의 wrapper 회전을 유지한다.
- `heart.svg`(14.6667×13.3333), `comment.svg`(14.0053×14.0053), `point.svg`(24×24), `add.svg`(14.6739×14.5109), `star-white.svg`(14.0922×13.4519), `detail-toolbar.svg`(359.066×22.5): 상세의 반응 수/감상 포인트/저장/헤더 슬롯.
- `eye.svg`(22.001×15.9988): 취향 밖 영화 공개 전 버튼.
- `nav-home.svg`(21.6468×22.5405), `nav-search.svg`(21.4×21.4), `nav-feed.svg`(22.46×20.7537), `nav-profile.svg`(22.5398×22.5398): 허브의 하단 비활성 홈/활성 탐색/비활성 피드·프로필. 해당 상태에 기존 탭바와 독립 목록/상세 바가 같은 원본을 사용한다.

`scripts/build-explore-vectors.mjs`가 원본 SVG XML·root 크기를 변경 없이 `src/features/design/explore-vector-assets.ts`로 기계 복사한다. `--check`는 원본 일치를 검사한다. `DesignVector`는 wrapper만 비례 확대/축소하고 SVG ID 충돌을 방지한다. 별도 모양 추출/재그리기는 하지 않는다. 인터랙티브 슬라이더/진행 점과 글자·색상 블록은 코드 기반이며 화면 비트맵이 아니다.
