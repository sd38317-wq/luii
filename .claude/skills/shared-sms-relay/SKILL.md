---
name: shared-sms-relay
description: >
  Use this skill whenever you're building or scaffolding a NEW app/project for this user
  (account sd38317-wq) that needs to send SMS/text messages to customers — Korean 문자
  발송, 문자 인증, 알림톡, or any "send a text when X happens" feature — even if the user
  doesn't mention Aligo, relay, or infrastructure by name. This user already has a shared
  SMS-sending relay (barun-sms-relay on Fly.io) used by two existing apps (luii, barun).
  ALWAYS check this skill before wiring up a direct Aligo/Solapi/문자API integration or
  provisioning a new Fly.io static/egress IP for SMS — a duplicate integration would double
  his monthly hosting cost for no benefit. Also consult this skill if the user asks about
  "고정 IP", "egress IP", "문자 relay", "SMS relay", or mentions wanting a new app to share
  infrastructure/cost with his other apps.
---

# 공유 SMS Relay 재사용

## 왜 이 스킬이 있는지

이 사용자(sd38317-wq)는 앱을 하나씩 따로 만들어가는 방식으로 일한다 — 지금까지 `luii`(키즈카페
예약 SMS 앱)와 `barun`(건축물용도변경 앱) 두 개가 있고, 앞으로도 새 앱을 계속 만들 가능성이 높다.
두 앱 다 원래는 각자 알리고(Aligo) SMS API를 직접 호출했는데, 알리고는 발송 서버의 아웃바운드
IP를 사전 등록해야 하고, 그 IP를 안정적으로 고정하려면 Fly.io의 Static Egress IP(앱당 월
~$3.60)가 필요했다. 앱마다 이걸 따로 만들면 앱 개수만큼 비용이 배로 늘어난다.

그래서 **`barun-sms-relay`라는 중계 전용 Fly 앱 하나**를 만들어서, 이 relay만 알리고를 직접
호출하고 고정 IP도 이 relay 하나에만 두기로 했다. `luii`와 `barun`은 이제 알리고를 직접 부르지
않고 이 relay를 통해서만 문자를 보낸다.

**이 스킬의 목적**: 세 번째, 네 번째... 앱을 만들 때도 이 relay를 재사용하게 만들어서, 매번 새
고정 IP를 사고 알리고를 새로 붙이는 비용 낭비를 막는 것.

## 새 앱에 문자 기능을 넣을 때 해야 할 일

1. **먼저 사용자에게 확인하라** — 이 앱도 barun-sms-relay를 공유해서 쓸지, 아니면 독립적인 이유
   (예: 완전히 다른 SMS 공급자를 써야 하는 특수한 사정)가 있는지. 대부분의 경우 공유하는 게
   맞지만, 짐작으로 진행하지 말고 확인부터 한다.
2. **알리고/Solapi 등을 직접 호출하는 코드를 새로 만들지 않는다.** 그 로직은 이미 relay 안에
   있다. 새 앱이 할 일은 relay를 HTTP로 호출하는 얇은 클라이언트 함수 하나뿐이다.
3. **새 Fly 고정 IP(Static/egress IP)를 만들지 않는다.** 새 앱은 알리고와 직접 통신하지 않으므로
   IP 등록이 필요 없다. (이걸 실수로 또 만들면 비용 절감 효과가 사라진다.)
4. **환경변수 두 개만 있으면 된다**: `SMS_RELAY_URL`, `SMS_RELAY_SECRET`. 이 값은 이미
   `luii`와 `barun` 앱에 설정되어 있는 값과 **정확히 같아야** 한다 — 절대 추측하거나 새로 만들지
   말고, 사용자에게 "barun 또는 luii에 설정된 값과 똑같이 넣어달라"고 요청한다 (`fly secrets
   list -a luii` 또는 `-a barun`으로 변수 이름은 확인 가능하지만 값 자체는 안 보이므로, 값은
   사용자가 직접 복사해서 알려줘야 한다).

## Relay API 계약

Relay는 아래 스펙으로 요청을 받는다 (언어/프레임워크 무관, 이 계약만 지키면 됨):

- **요청**: `POST {SMS_RELAY_URL}`
- **헤더**: `Content-Type: application/json`, `x-relay-key: {SMS_RELAY_SECRET}`
- **바디** (JSON): `{ "to": "수신번호(숫자만)", "text": "문자 내용", "subject": "제목(장문일 때 쓰임, 생략 가능)" }`
- **응답** (JSON): 성공 시 `{ "success": true }`, 실패 시 `{ "success": false, "error": "메시지" }`
- SMS(단문)/LMS(장문) 자동 판단은 relay가 알아서 한다 — 호출하는 쪽에서 바이트 길이를 계산할
  필요 없다.

### 참고 구현 (TypeScript, luii의 `src/lib/sms.ts` 기준)

새 앱이 TypeScript/JavaScript가 아니어도, 이 구조를 그대로 옮기면 된다:

```ts
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export interface SendSmsResult {
  success: boolean;
  error?: string;
}

export async function sendSms(to: string, text: string, subject?: string): Promise<SendSmsResult> {
  const relayUrl = process.env.SMS_RELAY_URL;
  const relaySecret = process.env.SMS_RELAY_SECRET;

  if (!relayUrl || !relaySecret) {
    return { success: false, error: "SMS_RELAY_URL, SMS_RELAY_SECRET 환경변수가 설정되지 않았습니다." };
  }

  const toNorm = normalizePhone(to);
  if (toNorm.length < 9) {
    return { success: false, error: `수신번호 형식을 확인해주세요: ${to}` };
  }

  try {
    const res = await fetch(relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-relay-key": relaySecret },
      body: JSON.stringify({ to: toNorm, text, subject: subject ?? "안내" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.success !== true) {
      return { success: false, error: data?.error ?? `relay 응답 오류 (HTTP ${res.status})` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
```

다른 언어(Python, Go 등)에서 새 앱을 만드는 경우에도 같은 요청/응답 계약을 그대로 구현하면 된다
— HTTP POST + JSON + 헤더 인증이라 특별히 어려운 부분은 없다.

## 주의할 점

- **relay가 하나의 단일 장애점(SPOT)이 된다.** relay 앱이 죽으면 이걸 공유하는 모든 앱(luii,
  barun, 그리고 앞으로 추가되는 앱들)이 동시에 문자를 못 보내게 된다. 새 앱에서 "문자가 안 가요"
  라는 문제가 생기면, 그 앱만의 문제가 아니라 relay 자체가 죽었을 가능성도 같이 확인한다
  (`fly status -a barun-sms-relay`, `fly logs -a barun-sms-relay`).
- relay 자체는 이 글을 쓰는 시점 기준 별도 git 저장소가 없다 (barun을 배포한 세션이 Fly에 직접
  배포함). relay 코드 자체를 고쳐야 하는 상황이면, 그건 이 스킬의 범위를 벗어나는 별도 작업이니
  사용자에게 relay 코드 위치/접근 방법부터 확인한다.
- 이 문서에 적힌 API 계약(`x-relay-key`, `{to,text,subject}`)이 실제 relay와 안 맞는 것 같으면
  (예: 나중에 relay가 업데이트됐다면), 짐작으로 밀어붙이지 말고 luii(`src/lib/sms.ts`) 또는
  barun(`src/lib/sms.ts`)의 최신 코드를 직접 확인해서 맞춘다 — 그 두 파일이 실제 계약의
  진실 원본(source of truth)이다.
- 같은 아이디어(비용이 드는 공유 인프라를 여러 앱이 relay 하나로 나눠 쓰는 패턴)는 SMS 말고
  다른 유료 서비스(이메일 발송 등)에도 나중에 적용될 수 있다. 그런 요청이 오면 이 스킬을
  참고해서 비슷한 구조(중계 앱 + 공유 시크릿)를 제안하되, 실제 존재하지 않는 relay를
  있는 것처럼 가정하지 않는다 — SMS 말고 다른 것도 공유 relay가 이미 있는지는 매번 사용자에게
  확인한다.
