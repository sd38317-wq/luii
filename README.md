# 바른프라이빗키즈룸 _ 괴정점 예약관리

네이버플레이스로 들어온 예약을 관리자가 간단히 등록해두면, **문자 4통을 자동으로 발송**해주는 내부 관리 도구입니다.

- 프로덕션 주소: https://luii.fly.dev
- 관리 계정: Fly.io 앱 이름 `luii`, GitHub 저장소 `sd38317-wq/luii`

## 자동 발송되는 문자 4종

| 시점 | 내용 | 문구 수정 |
|---|---|---|
| ⓪ 예약 전날 20:00 | 내일 예약 안내 (노쇼 방지용, 오시는 길/주차/이용수칙 포함) | `src/lib/sms.ts`의 `buildDayBeforeReminderMessage` |
| ① 예약 시작 30분 전 | 예약 안내 (오시는 길/주차/이용수칙) | `src/lib/sms.ts`의 `buildReminderMessage` |
| ② 퇴실 10분 전 (퇴실시간 미입력 시 예약시작+1시간) | 퇴실 준비 안내 + 정돈 사진/세븐일레븐 환급 안내 | `/admin` 설정 패널에서 직접 수정 가능 |
| ③ 체크아웃(기본: 다음날 11:59) | 리뷰 요청 + 배민상품권/계좌이체 안내 | `/admin` 설정 패널에서 직접 수정 가능 |

- ⓪번은 예약 당일에 등록한 예약에는 발송되지 않습니다 (어차피 ①번이 나가므로).
- ②③번 문구는 `/admin` 페이지 상단 "문자 안내 문구 설정"에서 사장님이 직접 수정할 수 있고, 비워두면 기본 문구(`src/lib/messageTemplates.ts`)가 쓰입니다. `{카페명}`/`{고객명}`/`{연락처}`/`{리뷰링크}` 자리표시자를 쓸 수 있습니다.

### ⚠️ ②③번 문자의 광고 표기 (법적 의무)

②③번 문자에는 상품권/환급 같은 혜택 안내가 들어 있어 정보통신망법상 **"영리목적 광고성 정보"**로 분류됩니다. 이런 문자는 맨 앞 `(광고)` 표기 + 맨 뒤 `무료수신거부 080-XXXX-XXXX` 표기가 의무이고, 위반 시 최대 3천만원 과태료가 있습니다. 그래서 이 앱은:

- ②③번 문자 발송 직전에 **`(광고)` 표기를 자동으로 붙입니다** (사장님이 문구를 고쳐도 빠지지 않게 코드에서 강제).
- `/admin` 설정에서 **080 무료수신거부 번호**를 등록해두면 문자 끝에 자동으로 붙습니다. 080 번호는 알리고 사이트의 부가서비스 메뉴에서 저렴하게 개통할 수 있으니 **꼭 개통해서 등록해주세요**.
- 광고성 문자는 **밤 9시~아침 8시 발송 금지**입니다. ③번 발송 시각(기본 11:59)을 바꿀 때 이 시간대는 피해주세요. ②번은 퇴실 시간에 따라 나가므로, 밤 9시 이후 퇴실이 생기는 운영이라면 문구에서 혜택 부분을 빼는 걸 검토해야 합니다.
- 네이버가 대가성 리뷰 제재를 강화하는 추세라, ③번 기본 문구는 "솔직한 리뷰"를 요청하는 표현으로 되어 있습니다.

## 동작 방식

1. 네이버 예약 알림이 오면, 관리자가 `/admin` 페이지에서 고객명/연락처/이용시간을 등록합니다. 예약창을 캡처해서 올리면 사진에서 자동으로 읽어 채워줍니다 ("📷 예약창 캡처로 자동 입력", Claude API 사용).
2. 서버가 **1분마다** 예약 목록을 확인해서, 위 4가지 시점에 맞춰 아직 안 보낸 문자를 자동 발송합니다.
3. 발송이 완료되면 목록에 상태로 표시됩니다.
4. 문자 발송이 실패하면(설정되어 있는 경우) 사장님 이메일로 알림이 갑니다.

> 네이버 예약은 외부 개발자가 쓸 수 있는 공식 공개 API가 없어서, 예약 정보를 자동으로 가져오는 대신 관리자가 직접 입력(또는 사진으로 자동입력)하는 방식으로 만들었습니다.

## 기술 스택

- Next.js (TypeScript, App Router)
- Prisma + SQLite
- [알리고(Aligo)](https://smartsms.aligo.in) SMS API — 문자 발송
- Anthropic Claude API — 예약창 캡처 사진에서 정보 자동 추출
- Resend — 문자 발송 실패 시 이메일 알림 (선택)
- node-cron (커스텀 서버에서 1분마다 실행)

## 환경변수 전체 목록

| 변수 | 설명 |
|---|---|
| `ADMIN_PASSWORD` | 관리자 페이지 로그인 비밀번호 |
| `SESSION_SECRET` | 로그인 세션 서명용 임의의 긴 문자열 |
| `CAFE_NAME` | 문자에 표시될 가게 이름 |
| `CAFE_ADDRESS` / `CAFE_PARKING_INFO` / `CAFE_RULES` (선택) | ⓪①번 문자에 자동으로 추가되는 오시는 길/주차/이용수칙 안내 |
| `ALIGO_USER_ID` / `ALIGO_API_KEY` | 알리고 마이페이지 > API 키 발급 |
| `ALIGO_SENDER_NUMBER` | 문자 발신번호 (알리고에 사전 등록/인증 필요) |
| `ANTHROPIC_API_KEY` | 예약창 캡처 사진 자동입력 기능 (console.anthropic.com > API Keys) |
| `RESEND_API_KEY` / `ADMIN_ALERT_EMAIL` (선택) | 문자 발송 실패 시 이메일 알림. resend.com 가입 후 API Key 발급 |

값은 언제든 `fly secrets set 변수명="값"` 으로 추가/변경할 수 있습니다. **`fly secrets set`은 예시 문구(`여기에_키_붙여넣기` 같은)를 그대로 넣지 말고, 실제 발급받은 값으로 바꿔서 입력해야 합니다** — 안 그러면 알아보기 힘든 오류가 납니다(과거에 실제로 겪은 문제).

## 처음 실행하기 (로컬 개발)

```bash
npm install
cp .env.example .env
# .env 파일을 열어서 위 환경변수들을 채워주세요
npx prisma migrate deploy
npm run dev
```

`http://localhost:3000` 에서 로그인 화면이 뜹니다.

## 각 외부 서비스 설정 방법

### 알리고 (문자 발송, 필수)

1. [smartsms.aligo.in](https://smartsms.aligo.in) 가입 후 마이페이지 > API 키 발급에서 아이디/API Key 확인
2. **발신번호 사전 등록**: 정보통신망법상 필수. 알리고 콘솔의 발신번호 관리 메뉴에서 등록 (미등록 번호는 발송 거부됨)
3. **발송 서버 IP 등록**: 알리고는 API를 호출하는 서버의 IP를 사전 등록해야 발송을 허용합니다. Fly 서버의 IP 확인 방법과 왜 고정 IP가 필요한지는 아래 "Fly 서버 IP 확인/고정" 참고.
4. 콘솔에서 문자 발송에 필요한 최소 잔액(캐시) 충전

### Anthropic Claude (사진 자동입력, 선택이지만 강력 추천)

1. [console.anthropic.com](https://console.anthropic.com) 가입 → API Keys → 키 발급 (`sk-ant-`로 시작)
2. 예약창 캡처 사진 한 장당 비용은 1원도 안 될 정도로 아주 작습니다.
3. (참고) 예전에는 서버 내장 무료 OCR(tesseract.js)을 썼으나, Fly 서버 메모리(512MB)를 초과해 서버가 통째로 죽는 문제(OOM)가 있어서 Claude API 방식으로 교체했습니다.

### Resend (문자 실패 이메일 알림, 선택)

1. [resend.com](https://resend.com) 가입 — **알림 받을 이메일로 가입해야** 도메인 인증 없이 바로 씁니다 (도메인 인증 없이는 가입한 계정 이메일로만 발송 가능)
2. API Keys 메뉴에서 키 발급
3. 같은 문제가 계속돼도 1시간에 한 번만 알림이 가도록 되어 있습니다 (스팸 방지)

## Fly.io로 배포하기

1. [fly.io](https://fly.io) 가입
2. `flyctl` CLI 설치: `curl -L https://fly.io/install.sh | sh`
3. 로그인: `fly auth login`
4. 앱 생성 (한 번만): `fly launch --no-deploy`
5. 예약 데이터를 저장할 영구 볼륨 생성:
   ```bash
   fly volumes create kidscafe_data --size 1 --region sin
   ```
6. 환경변수(시크릿) 등록:
   ```bash
   fly secrets set \
     ADMIN_PASSWORD="실제_비밀번호" \
     SESSION_SECRET="랜덤한_긴_문자열" \
     CAFE_NAME="바른프라이빗키즈룸 괴정점" \
     ALIGO_USER_ID="..." \
     ALIGO_API_KEY="..." \
     ALIGO_SENDER_NUMBER="0107294..." \
     ANTHROPIC_API_KEY="sk-ant-..." \
     RESEND_API_KEY="re_..." \
     ADMIN_ALERT_EMAIL="sd38317@gmail.com"
   ```
7. 배포: `fly deploy`
8. 배포 후 `https://luii.fly.dev`를 폰 브라우저에서 열고 로그인 → "홈 화면에 추가"로 앱처럼 사용 가능

### Fly 서버 IP 확인/고정 (알리고 IP 등록용)

Fly 서버의 아웃바운드 IP는 기본적으로 재배포/재시작 시 바뀔 수 있어서, 그대로 두면 알리고에 등록한 IP가 무효화되어 문자가 조용히 안 나갈 수 있습니다. **고정 IP를 할당해두는 걸 강력 권장합니다** (월 $2):

```bash
fly machine egress-ip allocate <machine-id> -a luii
```

머신 ID는 `fly status -a luii`로 확인. IP가 바뀌었는지 직접 확인하려면:

```bash
fly ssh console -a luii
node -e "fetch('https://ifconfig.me').then(r=>r.text()).then(console.log)"
```
(컨테이너에 `curl`이 없어서 Node로 확인합니다)

배포 후 코드를 수정했다면 `fly deploy` 한 번으로 재배포됩니다. 볼륨에 저장된 예약 데이터는 재배포해도 유지됩니다.

## 자주 쓰는 명령어 모음

노트북에서 (프로젝트 폴더로 이동 후):

```bash
cd C:\Users\luii\Desktop\luii   # 프로젝트 폴더로 이동 (윈도우 예시)
git pull                         # 최신 코드 받기
fly deploy -a luii                # 재배포
fly logs -a luii                  # 실시간 로그 확인 (오류 원인 파악용)
fly status -a luii                # 머신 상태/ID 확인
fly secrets list -a luii          # 등록된 환경변수 이름 목록 (값은 안 보임)
fly secrets set 변수명="값" -a luii  # 환경변수 추가/변경 (자동 재시작됨)
fly ssh console -a luii           # 서버 내부 접속 (디버깅용)
```

> PowerShell에서는 `&&`로 명령어를 이어붙이면 오류가 납니다. 한 줄씩 따로 실행하세요.

## 문제 해결 (트러블슈팅)

| 증상 | 원인 | 해결 |
|---|---|---|
| 문자가 안 감, 로그에 `인증오류입니다.-IP` | 알리고에 등록 안 된 IP에서 요청함 | Fly 서버 IP 확인 후 알리고 콘솔에 재등록. 근본적으로는 "Fly 서버 IP 고정" 적용 |
| 사진 자동입력 시 "사진 처리 중 오류가 발생했습니다" (구버전 OCR) | 서버 메모리 부족으로 프로세스가 죽음(OOM) | 현재는 Claude API 방식으로 교체되어 해결됨 |
| 사진 자동입력 시 알 수 없는 오류 | `ANTHROPIC_API_KEY`가 비어있거나 잘못 설정됨(예시 문구를 그대로 넣은 경우 등) | `fly logs -a luii`로 `[parseReservationImage]` 로그 확인, 키 재설정 |
| `fly secrets set`한 값이 이상하게 동작 | 예시 명령어의 플레이스홀더 문구를 그대로 붙여넣음 | 반드시 실제 발급받은 값으로 바꿔서 입력 |
| 문자 앱에서 메시지가 중간에 잘려 보임 | 알리고 전송내역엔 전체가 다 있다면 통신사 전달 과정의 문제 (앱 코드 문제 아님) | 재현되는지 재테스트, 반복되면 문구를 짧게 나누는 것도 방법 |

## 진행 중인 작업

- **카카오 알림톡 전환**: 카카오톡 채널(`바른프라이빗키즈룸(괴정점)`, 검색용 URL `http://pf.kakao.com/_BExhxnX`) 개설 완료, 비즈니스 심사(사업자 인증) 진행 중 (영업일 3~5일 소요). 심사 완료 후 알리고에 채널 연동 → 문구 템플릿 승인까지 받아야 실제 전환 가능. **주의**: 알림톡은 정보성 메시지 전용이라 상품권/환급 혜택이 들어간 ②③번은 템플릿 심사에서 거절될 가능성이 높습니다. ⓪①번(예약 안내)만 알림톡으로 전환하고, ②③번은 문자로 유지하는 구성이 현실적입니다.
- **080 무료수신거부 번호 개통**: 알리고 부가서비스에서 개통 후 `/admin` 설정의 "무료수신거부 080 번호"에 입력 필요 (②③번 광고 표기 의무 완성용).

## 폴더 구조

```
server.ts                          # Next.js + node-cron을 함께 띄우는 커스텀 서버
Dockerfile / docker-entrypoint.sh / fly.toml  # Fly.io 배포용 설정
src/app/admin/                     # 예약 등록/목록/설정 관리자 화면 (ReservationManager, SettingsPanel)
src/app/login/                     # 관리자 로그인 화면
src/app/api/reservations/          # 예약 CRUD API
src/app/api/reservations/parse-image/  # 예약창 캡처 사진 자동입력 API (Claude)
src/app/api/settings/               # 카페 정보/문자 문구 설정 API
src/app/api/login|logout/           # 로그인/로그아웃 API
src/app/manifest.ts                 # PWA 매니페스트 (홈 화면 추가용)
src/lib/prisma.ts                   # Prisma 클라이언트
src/lib/sms.ts                      # 알리고 SMS 발송 + 문자 4종 문구 생성
src/lib/reminder.ts                 # 4가지 발송 시점 판정 및 발송 로직 (1분마다 cron 실행)
src/lib/reservationParser.ts        # 예약창 캡처 사진 → 예약 정보 추출 (Claude API)
src/lib/messageTemplates.ts         # ②③번 문자 기본 문구 + 자리표시자 치환 함수
src/lib/alert.ts                    # 문자 발송 실패 시 이메일 알림 (Resend)
src/lib/phone.ts                    # 휴대폰 번호 정규화
src/proxy.ts                        # 로그인 여부 확인 미들웨어
prisma/schema.prisma                 # Reservation / Settings 테이블 정의
public/barun-logo-bg.png             # 관리자 페이지 배경 워터마크
```
