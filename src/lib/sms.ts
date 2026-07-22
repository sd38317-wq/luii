import crypto from "crypto";

const SOLAPI_ENDPOINT = "https://api.solapi.com/messages/v4/send";

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

function buildAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
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
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;

  if (!apiKey || !apiSecret || !from) {
    return {
      success: false,
      error: "SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER 환경변수가 설정되지 않았습니다.",
    };
  }

  const isLong = estimateByteLength(text) > SMS_BYTE_LIMIT;

  try {
    const res = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildAuthHeader(apiKey, apiSecret),
      },
      body: JSON.stringify({
        message: {
          to: normalizePhone(to),
          from: normalizePhone(from),
          text,
          type: isLong ? "LMS" : "SMS",
          ...(isLong ? { subject: subject ?? "예약 안내" } : {}),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `솔라피 API 오류 (${res.status}): ${body}` };
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
}): string {
  const { cafeName, customerName, reviewLink } = params;

  const sections = [
    `[${cafeName}] ${customerName}님, 오늘 저희 공간을 찾아주셔서 진심으로 감사드립니다.`,
    "아이와 즐거운 시간 보내셨길 바라며, 혹시 불편하신 점은 없으셨는지 궁금합니다.",
  ];

  if (reviewLink) {
    sections.push(
      `이용하시면서 좋았던 점을 리뷰로 남겨주시면 저희에게 큰 힘이 되고, 다음에 오실 분들께도 큰 도움이 됩니다 :)\n${reviewLink}`,
    );
  }

  sections.push("다음에도 편안하고 즐거운 공간으로 또 찾아뵐게요. 감사합니다!");

  return sections.join("\n\n");
}
