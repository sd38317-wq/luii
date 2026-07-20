# 키즈카페 예약 안내 문자 앱

네이버플레이스로 들어온 예약을 관리자가 간단히 등록해두면, **예약 시간 30분 전에 자동으로 안내 문자(SMS)** 를 발송해주는 내부 관리 도구입니다.

## 동작 방식

1. 네이버 예약 알림이 오면, 관리자가 `/admin` 페이지에서 고객명/연락처/예약시간을 등록합니다. (10초 소요)
2. 서버가 **1분마다** 예약 목록을 확인해서, 예약시간이 30분 이내로 다가왔고 아직 문자를 보내지 않은 건에 대해 자동으로 SMS를 발송합니다.
3. 발송이 완료되면 목록에 "문자 발송완료" 상태로 표시됩니다.

> 네이버 예약은 외부 개발자가 쓸 수 있는 공식 공개 API가 없어서, 예약 정보를 자동으로 가져오는 대신 관리자가 직접 입력하는 방식으로 만들었습니다. (자동 스크래핑은 네이버 약관 위반 소지가 있고 로그인 구조가 바뀌면 쉽게 깨집니다)

## 기술 스택

- Next.js (TypeScript, App Router)
- Prisma + SQLite
- [솔라피(Solapi)](https://solapi.com) SMS API
- node-cron (커스텀 서버에서 1분마다 실행)

## 처음 실행하기

```bash
npm install
cp .env.example .env
# .env 파일을 열어서 아래 값들을 채워주세요
npx prisma migrate deploy
npm run dev
```

`.env`에서 채워야 하는 값:

| 변수 | 설명 |
|---|---|
| `ADMIN_PASSWORD` | 관리자 페이지 로그인 비밀번호 |
| `SESSION_SECRET` | 로그인 세션에 쓰이는 임의의 긴 문자열 (아무 랜덤 문자열이면 됩니다) |
| `CAFE_NAME` | 문자에 표시될 가게 이름 |
| `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` | 솔라피 콘솔 > API Key 관리에서 발급 |
| `SOLAPI_SENDER_NUMBER` | 문자를 보낼 발신번호 |

서버를 켜면 `http://localhost:3000` 에서 로그인 화면이 뜹니다.

## 솔라피(문자 발송) 설정 방법

1. [solapi.com](https://solapi.com) 가입 후 콘솔에서 API Key/Secret 발급
2. **발신번호 사전 등록**: 정보통신망법상 문자 발신에 사용할 번호는 반드시 사전 등록/인증해야 합니다. 솔라피 콘솔의 발신번호 관리 메뉴에서 등록하세요. (등록 안 된 번호로는 발송이 거부됩니다)
3. 콘솔에서 문자 발송에 필요한 최소 잔액(캐시)을 충전하세요.
4. `.env`에 API Key/Secret/발신번호를 입력하면 끝입니다.

솔라피가 아닌 다른 문자 API(알리고 등)를 쓰고 싶다면 `src/lib/sms.ts`의 `sendSms` 함수만 교체하면 됩니다. 나머지 코드는 `sendSms(전화번호, 메시지)` 형태만 유지되면 그대로 동작합니다.

## 배포 시 꼭 알아둘 점

이 앱은 **SQLite 파일 + 1분마다 도는 백그라운드 작업(cron)** 으로 동작합니다. 그래서:

- **Vercel 같은 서버리스 플랫폼에는 그대로 배포할 수 없습니다** (파일시스템이 영구적이지 않고, 서버가 상시 켜져있지 않아 cron이 돌지 않습니다)
- 대신 **상시 실행되는 서버 + 영구 디스크**가 필요합니다. 무료로 이 조건을 만족하는 [Fly.io](https://fly.io)에 바로 배포할 수 있도록 `Dockerfile`/`fly.toml`을 이미 준비해뒀습니다 (아래 "Fly.io로 배포하기" 참고).
- 시간대(타임존)는 `Asia/Seoul`로 고정되어 있어, 서버가 어느 지역에 있든 30분 전 계산이 한국 시간 기준으로 정확히 동작합니다.

## Fly.io로 배포하기

1. [fly.io](https://fly.io) 가입 (신용카드 필요할 수 있으나 무료 한도 내에서는 과금되지 않습니다)
2. `flyctl` CLI 설치: `curl -L https://fly.io/install.sh | sh`
3. 로그인: `fly auth login` (브라우저 인증) — CLI로 자동화하려면 `fly tokens create deploy`로 배포 토큰을 발급받아 `FLY_API_TOKEN` 환경변수로 사용
4. 앱 생성 (한 번만): `fly launch --no-deploy` — `fly.toml`의 앱 이름/리전이 이미 채워져 있으니 그대로 쓰거나 원하는 이름으로 바꾸세요. 이 명령이 실제 앱을 Fly 계정에 생성합니다.
5. 예약 데이터를 저장할 영구 볼륨 생성 (`fly.toml`의 `[[mounts]]`와 이름이 같아야 함):
   ```bash
   fly volumes create kidscafe_data --size 1 --region nrt
   ```
6. 환경변수(시크릿) 등록:
   ```bash
   fly secrets set \
     ADMIN_PASSWORD="실제_비밀번호" \
     SESSION_SECRET="랜덤한_긴_문자열" \
     CAFE_NAME="가게 이름" \
     SOLAPI_API_KEY="..." \
     SOLAPI_API_SECRET="..." \
     SOLAPI_SENDER_NUMBER="0212345678"
   ```
7. 배포: `fly deploy`
8. 배포가 끝나면 `https://<앱이름>.fly.dev` 주소가 생깁니다. 이 주소를 폰 브라우저에서 열고 로그인하면 "홈 화면에 추가"로 앱처럼 쓸 수 있습니다 (iOS: 공유 버튼 > 홈 화면에 추가 / Android Chrome: 메뉴 > 앱 설치).

배포 후 코드를 수정했다면 `fly deploy` 한 번으로 재배포됩니다. 볼륨에 저장된 예약 데이터는 재배포해도 유지됩니다.

## 리마인더 시간/문구 바꾸기

- 발송 시점(현재 30분 전)은 `src/lib/reminder.ts`의 `REMINDER_MINUTES` 값을 바꾸면 됩니다.
- 문자 문구는 `src/lib/sms.ts`의 `buildReminderMessage` 함수에서 수정하면 됩니다.

## 폴더 구조

```
server.ts                     # Next.js + node-cron을 함께 띄우는 커스텀 서버
Dockerfile / docker-entrypoint.sh / fly.toml  # Fly.io 배포용 설정
src/app/admin/                # 예약 등록/목록 관리자 화면
src/app/login/                # 관리자 로그인 화면
src/app/api/reservations/     # 예약 CRUD API
src/app/api/login|logout/     # 로그인/로그아웃 API
src/app/manifest.ts           # PWA 매니페스트 (홈 화면 추가용)
src/app/icon.tsx, apple-icon.tsx, icon-192/, icon-512/  # 앱 아이콘 (자동 생성)
src/lib/prisma.ts             # Prisma 클라이언트
src/lib/sms.ts                # 솔라피 SMS 발송
src/lib/reminder.ts           # 30분 전 알림 대상 조회 및 발송 로직
src/lib/phone.ts              # 휴대폰 번호 정규화(하이픈 유무 상관없이 처리)
src/proxy.ts                  # 로그인 여부 확인 미들웨어(관리자 페이지/API 보호)
prisma/schema.prisma           # 예약(Reservation) 테이블 정의
```
