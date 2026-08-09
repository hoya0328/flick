# Supabase 연결 안내

FLICK의 이메일·비밀번호 계정, 닉네임과 취향 키워드 저장을 연결하는 절차다.

> 현재 `flick` 프로젝트의 로컬 연결, 첫 migration, 로컬 Auth URL 설정까지 적용 완료했다. 이 문서는 재설정과 운영 배포 시 참고용이다.

## 1. 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 새 프로젝트를 만든다.
2. 프로젝트 이름은 `flick`처럼 식별하기 쉬운 이름을 사용한다.
3. 리전은 주 사용자가 한국이라면 가장 가까운 사용 가능 리전을 선택한다.
4. 생성한 데이터베이스 비밀번호는 비밀번호 관리자에 보관하고 앱 코드에는 넣지 않는다.

## 2. 공개용 연결값 입력

프로젝트의 **Connect** 화면에서 Project URL과 Publishable key를 확인한다. `.env.example`을 복사해 `.env.local`을 만들고 다음 두 값만 입력한다.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://프로젝트-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`sb_secret_...`, `service_role`, 데이터베이스 비밀번호는 절대 `EXPO_PUBLIC_` 변수나 Git에 넣지 않는다. `.env.local`은 이미 Git에서 제외된다.

## 3. 데이터베이스 적용

Dashboard의 **SQL Editor**에서 새 쿼리를 열고 아래 파일 전체를 붙여 넣은 뒤 실행한다.

`supabase/migrations/202608070001_stage1_profiles_and_keywords.sql`

실행 후 Table Editor에서 `profiles`, `keywords`, `user_keywords`가 생성되고 `keywords`에 12개 행이 있는지 확인한다.

## 4. 계정 인증과 URL 설정

Dashboard의 **Authentication → URL Configuration**에서 로컬 개발 주소를 등록한다.

- Site URL: `http://localhost:8081`
- Redirect URLs: `http://localhost:8081/**`

실제 웹 배포 후에는 배포된 HTTPS 주소를 Site URL로 바꾸고 정확한 운영 Redirect URL을 추가한다.

**Authentication → Sign In / Providers**에서는 신규 가입, Email provider, Confirm email을 켠다. 운영 DB에는 `202608100001_password_accounts_and_nicknames.sql`을 적용한다. 비밀번호는 public 테이블에 저장하지 않고 Supabase Auth만 관리한다.

## 5. 동작 확인

```powershell
npm.cmd run web
```

1. `http://localhost:8081`에서 닉네임·이메일·비밀번호로 회원가입한다.
2. 받은 가입 확인 메일을 같은 브라우저에서 한 번 확인한다.
3. 이후에는 이메일과 비밀번호만으로 로그인한다.
4. 취향 키워드 3~5개를 선택한다.
5. Dashboard에서 해당 사용자의 `profiles` 한 행과 `user_keywords` 행을 확인한다.

가입 확인 또는 비밀번호 복구 링크가 다른 주소로 열리면 URL Configuration의 Redirect URLs가 실제 브라우저 주소와 일치하는지 먼저 확인한다.
