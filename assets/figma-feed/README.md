# 피드 원본 벡터

사용자 Figma `7o0aA5nN2muGSgSEdtsYw7`, 피드 구역 `26:208`의 원본 SVG20개. 출처 화면은 `26:591` 피드, `26:514` 상세, `26:387/26:251` 작성, `26:209/26:225/26:242` 첨부 카드다. 임시 URL·인증값·샘플 프로필/게시물 이미지·키보드 화면 비트맵은 런타임 자산으로 저장하지 않는다.

| 원본 파일 | root 크기 | 용도 |
| --- | --- | --- |
| nav-feed.svg |22.46×20.7537| 활성 피드 탭 |
| like.svg |17.6622×15.7693| 공감·댓글 공감 |
| comment.svg |16.4001×15.8014| 댓글 |
| bookmark.svg / bookmark-active.svg |12×16| 저장 상태 |
| more.svg |1.93515×11.6095| 글 메뉴 |
| search.svg |22×22| 피드 검색 |
| send.svg |27.2424×25.197| 다른 콘텐츠/메시지 안내 |
| movie-chevron.svg |5.90213×10.6725| 영화 상세 연결 |
| star.svg |12.783×11.3525| 영화 평점 |
| check.svg |15.0418×10| 투표 선택 |
| close.svg |14×14| 작성 창 닫기 |
| block-close.svg |11.6667×11.6667| 첨부 카드 제거 |
| globe.svg |12.8333×12.8333| 공개 범위 |
| photo.svg / movie.svg / poll.svg |16.6667×16.6667| 작성 도구 |
| video.svg |18.3337×11.6667| 비디오 준비 안내 |
| question.svg |18.3333×18.3333| 질문 도구 |
| option-remove.svg |9.66667×9.66667| 투표 선택지 제거 |

`scripts/build-feed-vectors.mjs`가 XML·intrinsic 크기를 그대로 `src/features/design/feed-vector-assets.ts`에 기계 복사한다. `npm run design:check`로 일치를 검증한다. 기존 `DesignVector`의 SVG ID 충돌 방지와 비례 wrapper 렌더러를 재사용하며, 활성 공감 등 의도한 단색 상태만 tint한다. 진행 막대·입력·문자는 네이티브/코드 기반이다. 사진·영화 포스터는 기존 동적 데이터와 권리/크레딧 조건을 유지한다.
