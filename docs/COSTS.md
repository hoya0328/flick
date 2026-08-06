# COSTS

기준일: 2026-08-07. 금액은 USD이며 세금·환율·도메인 비용은 별도다.

## 고정·선택 비용

| 항목 | 초기 개발 | 공개 운영 |
|---|---:|---:|
| Expo 로컬·웹 개발 | $0 | $0 |
| EAS Build | Free 한도 내 $0 | 필요 시 Starter $19/월 또는 사용량 과금 |
| Apple Developer Program | 로컬·Expo Go 테스트는 $0 가능 | App Store/TestFlight 배포에 $99/년 |
| Supabase | Free $0/월 | 안정적 운영 시 Pro $25/월부터 |
| Google Play | 필요 없음 | Android 공개 시 $25 일회성 |
| AI API | 호출 전 $0 | 사용량 기반; 별도 프로젝트 예산 상한 적용 |
| TMDB | 비상업·출처 표기 시 $0 | 수익 목적이면 상업 라이선스 별도 협의 |
| 웹 도메인 | 선택 | 등록기관별 연간 비용 |

## 현실적인 예산 시나리오

- 개발·프로토타입: $0로 시작 가능
- iOS 공개 전 베타: Apple $99/년이 사실상 첫 필수 비용이며 EAS Free 한도로 시작 가능
- 초기 공개 MVP: Apple $99/년 + AI 사용량. Supabase Free 한도를 넘거나 백업이 필요하면 $25/월부터
- Android 공개: 위 비용에 Google Play $25 일회성 추가

현재 Windows PC에서도 EAS의 클라우드 빌드·제출을 사용하면 Mac을 바로 구매할 필요는 없다. 다만 App Store 제출에는 유료 Apple Developer 계정이 필요하다.

## 비용 통제

- AI는 클라이언트에서 직접 호출하지 않고 사용자·일별 한도를 서버에서 강제한다.
- 초기 AI 월 상한은 $10로 시작하고 실제 완료 기록당 비용을 측정한 뒤 조정한다.
- 취향 리포트 수치는 SQL로 계산하고 AI 서술은 선택 기능으로 둔다.
- 영화 응답은 캐시해 공급자 호출량과 장애 영향을 줄인다.
- 유료 전환 전 TMDB 상업 라이선스 견적을 확인한다.

## 공식 근거

- Apple Developer Program: https://developer.apple.com/programs/whats-included/
- Expo Windows iOS 개발: https://docs.expo.dev/faq/
- Expo 요금제: https://docs.expo.dev/billing/plans/
- Supabase 요금: https://supabase.com/pricing
- Google Play 등록: https://support.google.com/googleplay/android-developer/answer/6112435
- TMDB API 조건: https://developer.themoviedb.org/docs/faq
- OpenAI API 비용: https://openai.com/api/pricing/
