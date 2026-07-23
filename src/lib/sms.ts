import {
  DEFAULT_CHECKOUT_NOTICE_TEMPLATE,
  DEFAULT_FOLLOWUP_TEMPLATE,
  applyMessageTemplate,
} from "./messageTemplates";

const ALIGO_ENDPOINT = "https://apis.aligo.in/send/";

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export interface SendSmsResult {
  success: boolean;
  error?: string;
}

// SMS(단문)는 90바이트가 넘어가면 전송이 거부되거나 잘릴 수 있어, 그 이상이면 LMS(장문)로 자동 전환한다.
// 한글/특수문자는 2바이트, 영문/숫자/공백은 1바이트로 계산하는 통신사 관행을 따른다.
const SMS_BYTE_LIMIT = 90;

function estimateByteLength(text: string): number {
  let bytes = 0;
  for (const char of text) {
    bytes += char.charCodeAt(0) > 127 ? 2 : 1;
  }
  return bytes;
}

export async function sendSms(to: string, text: string, subject?: string): Promise<SendSmsResult> {
  const apiKey = process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const from = process.env.ALIGO_SENDER_NUMBER;

  if (!apiKey || !userId || !from) {
    return {
      success: false,
      error: "ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER_NUMBER 환경변수가 설정되지 않았습니다.",
    };
  }

  const isLong = estimateByteLength(text) > SMS_BYTE_LIMIT;

  const body = new URLSearchParams({
    key: apiKey,
    user_id: userId,
    sender: normalizePhone(from),
    receiver: normalizePhone(to),
    msg: text,
    msg_type: isLong ? "LMS" : "SMS",
  });

  if (isLong) {
    body.set("title", subject ?? "예약 안내");
  }

  try {
    const res = await fetch(ALIGO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data || Number(data.result_code) !== 1) {
      return {
        success: false,
        error: `알리고 API 오류: ${data?.message ?? `HTTP ${res.status}`}`,
      };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
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
}): string {
  const { cafeName, customerName, reviewLink, giftEventContact, template } = params;

  return applyMessageTemplate(template?.trim() || DEFAULT_FOLLOWUP_TEMPLATE, {
    카페명: cafeName,
    고객명: customerName,
    리뷰링크: reviewLink ?? "",
    연락처: giftEventContact ?? "",
  });
}

export function buildCheckoutNoticeMessage(params: {
  cafeName: string;
  customerName: string;
  giftEventContact?: string | null;
  template?: string | null;
}): string {
  const { cafeName, customerName, giftEventContact, template } = params;

  return applyMessageTemplate(template?.trim() || DEFAULT_CHECKOUT_NOTICE_TEMPLATE, {
    카페명: cafeName,
    고객명: customerName,
    연락처: giftEventContact ?? "",
  });
}
