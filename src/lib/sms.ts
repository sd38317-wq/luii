import {
  DEFAULT_CHECKOUT_NOTICE_TEMPLATE,
  DEFAULT_FOLLOWUP_TEMPLATE,
  applyMessageTemplate,
  ensureAdCompliance,
} from "./messageTemplates";

// SMS 발송 — sms-relay(barun-sms-relay.fly.dev) 경유
// 알리고 발송 서버 IP 등록은 relay 앱 하나에만 해두면 되므로(고정 egress IP 비용도 앱당이 아닌
// relay 하나에만 발생), barun/luii 두 앱이 이 relay를 공유해서 문자를 보낸다.
// SMS/LMS 판단(바이트 길이)도 relay 쪽에서 처리하므로 여기서는 하지 않는다.
// 필요 환경변수: SMS_RELAY_URL, SMS_RELAY_SECRET

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
    return {
      success: false,
      error: "SMS_RELAY_URL, SMS_RELAY_SECRET 환경변수가 설정되지 않았습니다.",
    };
  }

  const toNorm = normalizePhone(to);
  if (toNorm.length < 9) {
    return { success: false, error: `수신번호 형식을 확인해주세요: ${to}` };
  }

  try {
    const res = await fetch(relayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-relay-key": relaySecret,
      },
      body: JSON.stringify({ to: toNorm, text, subject: subject ?? "예약 안내" }),
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

export function buildDayBeforeReminderMessage(params: {
  cafeName: string;
  customerName: string;
  reservationTime: Date;
  partySize?: number | null;
  address?: string | null;
  parkingInfo?: string | null;
  rules?: string | null;
}): string {
  const { cafeName, customerName, reservationTime, partySize, address, parkingInfo, rules } = params;
  const time = reservationTime.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const sections = [
    `[${cafeName}] ${customerName}님, 내일 예약이 있어 미리 안내드려요!\n예약시간: 내일 ${time}${partySize ? ` / 인원: ${partySize}명` : ""}`,
  ];

  if (address) sections.push(`오시는 길: ${address}`);
  if (parkingInfo) sections.push(`주차 안내: ${parkingInfo}`);
  if (rules) sections.push(`이용 안내: ${rules}`);

  sections.push("일정 변경이 필요하시면 미리 연락 부탁드려요. 내일 뵙겠습니다 :)");

  return sections.join("\n\n");
}

export function buildReminderMessage(params: {
  cafeName: string;
  customerName: string;
  reservationTime: Date;
  partySize?: number | null;
  address?: string | null;
  parkingInfo?: string | null;
  rules?: string | null;
}): string {
  const { cafeName, customerName, reservationTime, partySize, address, parkingInfo, rules } = params;
  const time = reservationTime.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const sections = [
    `[${cafeName}] ${customerName}님, 예약하신 시간이 30분 앞으로 다가왔습니다!\n예약시간: ${time}${partySize ? ` / 인원: ${partySize}명` : ""}`,
  ];

  if (address) sections.push(`오시는 길: ${address}`);
  if (parkingInfo) sections.push(`주차 안내: ${parkingInfo}`);
  if (rules) sections.push(`이용 안내: ${rules}`);

  sections.push("안전하고 즐거운 시간 보내세요 :)");

  return sections.join("\n\n");
}

export function buildFollowUpMessage(params: {
  cafeName: string;
  customerName: string;
  reviewLink?: string | null;
  giftEventContact?: string | null;
  template?: string | null;
  adOptOutNumber?: string | null;
}): string {
  const { cafeName, customerName, reviewLink, giftEventContact, template, adOptOutNumber } = params;

  const message = applyMessageTemplate(template?.trim() || DEFAULT_FOLLOWUP_TEMPLATE, {
    카페명: cafeName,
    고객명: customerName,
    리뷰링크: reviewLink ?? "",
    연락처: giftEventContact ?? "",
  });

  return ensureAdCompliance(message, adOptOutNumber);
}

export function buildCheckoutNoticeMessage(params: {
  cafeName: string;
  customerName: string;
  giftEventContact?: string | null;
  template?: string | null;
  adOptOutNumber?: string | null;
}): string {
  const { cafeName, customerName, giftEventContact, template, adOptOutNumber } = params;

  const message = applyMessageTemplate(template?.trim() || DEFAULT_CHECKOUT_NOTICE_TEMPLATE, {
    카페명: cafeName,
    고객명: customerName,
    연락처: giftEventContact ?? "",
  });

  return ensureAdCompliance(message, adOptOutNumber);
}
