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

export async function sendSms(to: string, text: string): Promise<SendSmsResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;

  if (!apiKey || !apiSecret || !from) {
    return {
      success: false,
      error: "SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER 환경변수가 설정되지 않았습니다.",
    };
  }

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
}): string {
  const { cafeName, customerName, reservationTime, partySize } = params;
  const time = reservationTime.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const partyLine = partySize ? `\n인원: ${partySize}명` : "";

  return `[${cafeName}] ${customerName}님, 예약하신 시간이 30분 앞으로 다가왔습니다!\n예약시간: ${time}${partyLine}\n안전하고 즐거운 시간 보내세요 :)`;
}
