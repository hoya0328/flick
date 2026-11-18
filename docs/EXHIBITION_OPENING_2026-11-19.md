# 11/19~11/23 무료 외부 운영 준비 결과

## 적용 결과 · 2026-11-18 KST

사용자가 무료 상태 확인 후 운영 기한 갱신과 최종 실사용 테스트를 승인했다. 과금 필요 시 중단한다는 조건으로 실행했다. **유료 전환·결제·카드 등록·한도 증액은 하지 않았다.** PC를 꺼도 기존 클라우드 배포는 유지된다. localhost만 PC 실행에 의존한다.

- 운영 대상: **2026-11-19 00:00 이상~2026-11-24 00:00 미만, Asia/Seoul**. 최종 리허설을 위해11/18 밤부터 미리 열었다. 별도 예약 작업이나 PC 상주 프로세스가 아니다.
- `public.exhibition_settings`: `enabled=true`, `closes_at=free_verified_until=2026-11-23T15:00:00Z`. 서버 시간으로 자동 차단한다.
- 기존 회원 선택형 원문 분석의 `TASTE_FREE_AI_VERIFIED_UNTIL`도 같은 시각으로 갱신했다. `CORE_FREE_AI_VERIFIED`/`TASTE_FREE_AI_VERIFIED`의 기존 true 값, 기존 Gemini API 키와 모델은 변경하지 않았다. 원문 분석의 실제 사용자 데이터 전송 테스트는 추가 실행하지 않았다.
- 공유 AI400/일·12/분, 게스트8회·2시간/1편 비공개 저장, 가입150/일·20/분·누적1000, RLS·공개/관리자/사진 차단은 그대로 유지한다.
- DB 작업은 승인된 설정 한 행만 변경했다. 재현 파일은 `supabase/operations/20261118_exhibition_window.sql`이며 스키마 마이그레이션이 아니다. 미래에 무료 상태 재확인 없이 재사용/자동 연장하면 안 된다.
- 기존 beta `https://flick-film-journal--beta.expo.app`, 프로젝트 `d701494e-4875-45b4-b9c4-feb15dac3e85`, 클라이언트 배포 `0lr5ulnat5` 유지. 클라이언트 코드를 바꾸지 않아 웹 재배포는 필요 없으며 서버 설정은 기존 외부 주소에 반영됐다.

## 무료 상태 관측

| 서비스 | 계정 대시보드에서 확인한 상태 |
|---|---|
| Google AI Studio | Klick / `klick-504806`, 무료 등급, Gemini3.5 Flash Lite15RPM·250KTPM·500RPD.28일 최대 사용량 표시는1RPM/1.49KTPM/18RPD였으며 오늘의 잔여량으로 해석하지 않는다. |
| Supabase | hoya0328 조직 Free Plan, 현 주기10/26~11/26, 무료 한도 초과 없음. 전송0.059/5GB, 저장0.003/1GB, 함수479/500,000, MAU2/50,000, Realtime 피크2/200. 일부 집계는 두 프로젝트 공용이며 지연 표시된다. FLICK 직접 DB 크기22,828,723bytes, 대시보드의 청구용/시차 집계와 다를 수 있다. |
| Expo | letshoya 계정 Current plan Free·$0/month, Upcoming bill estimate$0. 월 Usage의0MAU/0GiB는 **Expo Update** 지표라 Hosting 요청 잔여량으로 사용하지 않았다. Hosting 최근7일 지표는 약250~257요청·crash0(샘플링 약88%). 무료 화면은7일 이전 날짜 선택이 비활성이어서 월 전체 Hosting 잔여량은 정확히 확인하지 못했다. |

Expo의 공식 무료 Hosting 한도는 월100,000요청·저장1GB다. 현재 낮은 관측치와 예상 일100명 미만은 무료 운영을 시도할 근거이지, 남은 월100,000요청을 모두 쓸 수 있다는 보장은 아니다. 공급자 장애·악성 트래픽·동시 사용까지 차단할 수 없다.

## 이번 실제 외부 테스트

기존 회원 인증 저장소와 분리된 신규 게스트 **2개**를 사용했다. Core는402×874 모바일 크기 화면도 직접 확인했고 Light는 기본 웹 화면에서 검증했다. 서버에는 명시적으로 `[운영 검증용 비공개 예문]`인 기록 **2개**만 추가했다. 기존 게스트1개/저장1개는 보존했다. 실제 회원의 기존 완료 기록17개는 변경하지 않았다.

1. **Core, 인터스텔라**: 성인/개인정보/Google 무료 AI 전송 안내 확인 → Q1~Q5 답변 → 각 답변 기반 코멘트·후속 질문 → AI 리뷰 초안·최대5개 키워드 → 직접 본문·키워드 수정 → 임시저장 반영 후 새로고침 복원 → 비공개 저장 성공. Gemini 총6회(질문/코멘트5+초안1) 성공, 실패0. 저장 후 세션 종료 확인.
2. **Light, 리틀 포레스트, AI 미동의**: 필수 세션 안내만 동의 → AI 없이 입장 → 별점 미선택 오류 → 별점/태그 → Q2건너뜀 → Q3질문 교체1회와 재교체 비활성 → Q5까지 완료 → 대표 키워드·직접 본문 → 비공개 저장 → 새로고침 후 저장 본문 유지 → 세션 종료 확인. AI 호출0. Light 실제 AI 초안 호출은 이번에 추가하지 않았다.
3. 저장·세션 종료 후 신규 입장 화면, 이전 본문 미노출, 오늘394회/분12회 잔여, 브라우저 console error0 확인. 다른 실제 휴대폰/공유 Wi-Fi/동시 부하 시험과는 구분한다.
4. 발표 QR 원본 `docs/presentation/assets/flick-user-qr.png` 디코딩: `https://flick-film-journal--beta.expo.app/`. 로그인 화면의 **전시 체험 · 가입 없이 시작** 버튼으로 `/exhibition` 이동을 실제 확인했다. QR 자체와 발표 파일은 변경하지 않았다. 새로 출력할 체험 전용 QR은 `/exhibition` 직접 주소를 쓰면 안내 단계를 줄일 수 있다.

임시저장은200ms 지연 반영이다. 저장 버튼을 누르기 전 입력 직후 즉시 강제 새로고침하면 마지막 수정은 이전 임시 초안으로 돌아갈 수 있다. 서버 저장 완료 전에는 영구 저장으로 안내하지 않는다.

증거(로컬 ignored): `tmp/exhibition-20261119/light-manual-saved.jpg`, `guest-ready.jpg`. Core 저장 완료는 실제 AX/도구 스크린샷으로 확인했다. 별도 저장한 `core-saved.jpg`는 빈 캡처여서 증거에서 제외했다.

## 자동/격리 검증

- `node scripts/test-exhibition-db.mjs` 통과: 독립 PGlite에서 현재 DDL+역할별 테스트.
- 운영 `supabase/tests/exhibition.sql` 통과: 합성 게스트A/B·일반회원 positive control, 타 계정/익명 조회 차단, 공개·사진·관리자 쓰기 거부,400일/12분/8게스트 한도·무료 확인 만료·닫힌 입장 검증. **전체 합성 트랜잭션 롤백**, provider 호출0.
- 운영 `exhibition_postconditions.sql` 통과: 합성 Auth 잔여0, 우회 실행 권한 없음, 기존 일반 테이블 쓰기 가드와 restrictive storage 정책 유지.
- `node scripts/check-exhibition-release.mjs` 통과: 익명 Auth 켜짐, 이메일 확인 유지, 공개키만으로 내부5테이블 조회 차단, 외부 체험 경로·정확한 배포 JS 일치.
- `node scripts/check-exhibition-window.mjs` 통과: 실제 공개 상태의 입장/AItrue, 종료/확인 기한 정확히11/24 00:00KST, 잔여 범위 검증. 읽기 전용이며 AI/가입/저장을 하지 않는다. 승인 기간 종료 후 자동 연장하지 않고 실패한다.
- `node scripts/check-ui-polish-release.mjs` 통과: 외부29경로200·루트JS/바이트 일치.
- `npm run security:secrets` 통과:575파일/객체, 값 출력 없음. 앱 코드/의존성은 미변경이므로 이번에 전체 TypeScript/lint/unit suite를 다시 돌렸다고 주장하지 않는다. 직전 UI 검수318테스트와 구분한다.
- Supabase CLI의 `--read-only`는DO문을 허용하지 않아 읽기성 postconditions를 일반query로 재실행했다. `exhibition_status`는postgres의 직접 호출이 거부되어 공개RPC로 확인하고 관리자 집계는 테이블SELECT만 사용했다. 이를 우회하기 위한 권한 변경은 하지 않았다.

## 운영자 주의 / 보장 범위

- **운영 기한·무료 상태·위 경로 테스트 완료**이지5일 무중단 보증이 아니다. PC를 켜 둘 필요는 없지만 현장 인터넷/외부 플랫폼 장애는 남는다. 자동 반복 모니터링은 등록하지 않았다.
- 하루100명 모두 Core AI6회면600회이므로400회에 맞지 않는다. Light 위주 안내, Core AI는 여유 있을 때, 한도 도달 시 직접 작성 경로로 마무리한다. 앱 오류를 유료 모델/재시도로 자동 우회하지 않는다.
- 동일 행사 Wi-Fi의 Supabase 기본 익명 가입IP 한도(30/시간)는 보존됐다. 막히면 개인 모바일 데이터로 전환하도록 안내한다. 무분별하게 보호 한도를 올리지 않는다.
- 게스트는 체험 종료 후 복구할 수 없다. 필요 시 감상 복사 후 종료. 서버 테스트 기록은 자동 삭제하지 않는다. 행사 후 보관/삭제는 별도 승인받는다.
- 원문 AI 전송은 성인·별도 동의 경로만 사용한다. 미성년자/미동의 체험은AI없이 진행한다. 일반 회원 가입 이메일 발송 용량은 게스트 입장과 별개이며, SMTP 유료 서비스를 연결하지 않았다.
- 기존 의존성 감사35건(34 high/1 moderate, 경로 중복 포함)은 별도 잔여 위험. 이번 작업으로 해결됐거나 전체 보안/CI가 성공했다고 표현하지 않는다. 기존 배포를 자동 중단하는 설정은 아니다.

## 운영 점검 / 긴급 중단

운영자: 매일 개막 전 `node scripts/check-exhibition-window.mjs`, 앱 체험 화면의 잔여량, Supabase/Expo 사용량을 확인한다. 사용자 요청 없이 예약 작업을 생성하지 않았다.

긴급 차단은 기존 승인된 runbook을 따른다. 운영자만 아래 SQL을 사용하며 기록은 삭제되지 않는다.

```sql
update public.exhibition_settings
set enabled=false, free_verified_until=now()
where id=true;
```

11/24 00:00KST 이후는 설정된 시간 비교로 게스트 입장/저장·공유 AI가 닫힌다. 일반 회원 비AI 기록과 기존 사이트 자체는 자동 삭제/종료하지 않는다. 단순히 날짜를 연장하지 말고 다시 무료 상태와 운영 권한을 확인한다.

공식 요금/정책 근거: [Expo Hosting 포함량](https://expo.dev/pricing), [Gemini 한도](https://aistudio.google.com/docs/rate-limits), [Supabase 운영 체크리스트](https://supabase.com/docs/guides/deployment/going-into-prod).
