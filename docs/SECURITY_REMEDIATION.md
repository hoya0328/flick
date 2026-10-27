# 의존성 보안 경고 수정 — 2026-10-28 KST

## 범위와 실제 위험

수정 전 전체 `npm audit`는13개(high5/moderate8/critical0), 개발 의존성을 뺀 검사는10개였다. 경고 개수에는 같은 원인으로 영향을 받는 상위 패키지도 포함된다. 13개의 독립적인 데이터 유출 사고가 발생했다는 의미가 아니다.

| 원인 | FLICK에 들어오는 경로 / 위험 | 적용한 무료 수정 |
|---|---|---|
| decode-uri-component | Router → query-string: 조작된 percent-encoded URL로 CPU를 오래 점유해 앱이 멈출 수 있음 | 0.2.2 → 0.5.0 + 검토된 CJS/ESM 연결 |
| image-size | Metro의 이미지 크기 검사: 손상된 ICNS/HEIF/JXL 입력으로 빌드 도구가 멈출 수 있음 | 1.2.1 → 2.0.3 |
| Zod | Expo CLI 입력 검증기: 잘못된 큰 배열의 오류를 과도하게 누적해 메모리 소진 가능 | CLI3.25.76/루트4.4.3 → 4.6.6 |
| uuid | Xcode 프로젝트 생성 도구: v3/v5/v6의 작은 출력 버퍼 경계 검사 문제. 현재 Xcode 사용 경로는 v4 | Xcode3.0.1 아래만11.1.1 고정 |
| Vitest/Vite | 테스트/로컬 개발 도구의 파일 접근·개발 서버/에디터 실행 관련 취약점 | Vitest4.1.10 → 4.1.12, Vite8.2.1 → 8.3.5, mocker4.1.12 |

공식 근거: [URL decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [image-size advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq), [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [UUID advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq). 정확한 테스트 도구 경고와 간접 경로는 현재 `npm audit` 및 잠금 파일 기준으로 판정한다.

테스트 도구 근거: [Vitest/mocker 파일 접근 경고](https://github.com/advisories/GHSA-82fw-gwwq-j7x9), [Vite/launch-editor Windows 경고](https://github.com/advisories/GHSA-698v-4r3x-3vcv). Node 하한은 [22.12의 require(ESM) 기본 지원](https://nodejs.org/en/blog/release/v22.12.0)과 현재 CI/로컬 런타임에 맞춘다.

## 호환성 보존과 재현

- Expo57.0.20 / Router57.0.19 / React Native0.86.2 / React19.2.3 및 Supabase는 그대로 유지한다. `audit fix --force`, SDK58 전환 또는54 다운그레이드는 실행하지 않는다.
- `package.json`의 고정 overrides는 실제 수정판을 설치한다. audit 제외/무시/숨김 설정으로 숫자만 줄이지 않는다. CLI는 Zod4의 실제 export를 사용하며 취약한 v3 호환 export로 돌리지 않는다.
- query-string7.1.3은 CommonJS callable을 기대하지만 수정 decoder0.5.0은 ESM default export다. `scripts/security-compat.mjs`가 postinstall에서 **한 줄 require에 `.default`만 연결**한다. 원본 query-string7.1.3 전체 SHA-256, 패키지 버전, decoder 버전, node_modules 실제 경로를 검사한다. 소스가 달라지면 임의 변경하지 않고 설치/검증을 실패시킨다.
- check/build도 `--check`로 해당 패치가 재현됐는지 검사한다. `npm ci --ignore-scripts`는 지원하지 않는다. Node22.12+ 또는24+를 사용한다. 패키지를 갱신할 때는 SHA를 무작정 바꾸지 말고 수정판·호환 경계를 재검토한다.
- Zod와 image-size는 의존성의 메이저가 바뀌지만, FLICK가 사용하는 CLI/Metro API에 대한 실행 회귀를 추가한다. Xcode는 라이브러리를 갈아엎지 않고 실제 v4 생성 경로만 호환 검증한다.
- CI에 `npm run security:audit`를 추가했다. 개발 도구까지 포함하고 moderate 이상 발견 시 실패한다. 공식 레지스트리가 불통인 경우도 성공으로 위장하지 않는다. 이후 새 advisory가 생기면 잠금 파일을 다시 검토한다.

## 검증과 한계

- 완전 `npm ci` 재설치 및 전체 npm audit에 알려진 경고0건을 확인했다. typecheck/lint·30개 파일171개 테스트를 통과했다. 추가 보안 회귀16개 중 변조/패치 누락 검사도 실제 설치 파일을 건드리지 않는 합성 fixture에서 수행했다.
- iOS/Android JS export도 로컬에서 성공했다. 1415/1551모듈과47자산을 검사했으며 `--no-bytecode` 결과다. 네이티브 앱의 기기 실행 또는 스토어 배포 성공으로 안내하지 않는다.

- `tests/security-dependencies.test.ts`: 한글/이모지/공백·URL 왕복·한 번만 decoding·합성 로그인 복귀, 실제 query-string ESM 연결 검사, 손상 ICNS/HEIF 거부, 실제 Metro PNG/SVG 크기, 실제 Expo CLI plugin/output/MCP schema, Zod4 export, Xcode24자리 ID·UUID v5 경계 검사를 실행한다.
- 공격성 입력은 외부에 보내지 않고 합성 데이터로 검사한다. 무한 반복/메모리 소진 재발이 테스트 전체를 멈추지 않도록 child process timeout4초/heap192MB를 적용한다. 실제 MCP 도구 실행·계정 삭제·사용자 원문 전송은 하지 않는다.
- 전체 기존 테스트·정적 웹 빌드·브라우저 로그인 복귀/한글 경로를 재검증하고, 최종 스캔/배포 식별자는 `HANDOFF.md` 최신 항목에 남긴다.
- 이는 알려진 npm 의존성 경고의 수정이다. 전체 침투 테스트, 실기기 네이티브 실행, 전체 DB/Auth/Storage 백업·복원 검증을 대신하지 않는다. 운영 DB·계정 권한·AI 무료 동의·API 키·요금제는 변경하지 않는다.
- 롤백 소스: `rollback/security-before-2026-10-28` (`9231b64`). 이전 웹 deployment는 `98eadriv28`. 롤백 시 이번에 고친 의존성 경고도 되살아날 수 있으므로 긴급 호환 문제에만 사용하고 보안 수정 재적용 계획을 남긴다.
