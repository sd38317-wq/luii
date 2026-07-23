export interface ExtractedReservation {
  customerName: string;
  phone: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  endHour: number | null;
  endMinute: number | null;
  partySize: number | null;
}

export interface ParseImageResult {
  success: boolean;
  data?: ExtractedReservation;
  error?: string;
}

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

const SUPPORTED_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

const EXTRACTION_PROMPT = `이 이미지는 네이버 예약(스마트플레이스) 관리 화면 캡처야. 화면에 예약이 여러 건 보이더라도, 맨 위(가장 먼저 나오는) 예약 한 건만 읽어서 아래 JSON 형식으로만 답해. 다른 설명 없이 JSON만.

{
  "customerName": "예약자 이름 (한글)",
  "phone": "전화번호 (010-1234-5678 형식)",
  "year": 연도(숫자),
  "month": 월(숫자, 1~12),
  "day": 일(숫자),
  "hour": 이용 시작 시각의 24시간제 시(0~23),
  "minute": 이용 시작 시각의 분(0~59),
  "endHour": 이용 종료 시각의 24시간제 시(0~23), 종료 시각이 안 보이면 null,
  "endMinute": 이용 종료 시각의 분(0~59), 종료 시각이 안 보이면 null,
  "partySize": 인원수(숫자), 안 보이면 null
}

이름/전화번호/날짜/시간 중 하나라도 화면에서 확실히 읽을 수 없으면, { "error": "읽을 수 없음" } 으로만 답해.`;

export async function parseReservationImage(
  base64Image: string,
  mediaType?: string,
): Promise<ParseImageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // API 키가 비어있거나, 예시 문구를 그대로 붙여넣은 경우(한글 포함) 요청 자체가
  // 알아보기 힘든 오류로 죽지 않도록 미리 걸러낸다.
  if (!apiKey || !/^[\x20-\x7e]+$/.test(apiKey)) {
    console.error("[parseReservationImage] ANTHROPIC_API_KEY가 비어있거나 올바르지 않습니다.");
    return { success: false, error: "ANTHROPIC_API_KEY 환경변수가 올바르게 설정되지 않았습니다." };
  }

  const resolvedMediaType =
    mediaType && SUPPORTED_MEDIA_TYPES.has(mediaType) ? mediaType : "image/png";

  const NOT_READABLE_ERROR =
    "이미지에서 예약 정보를 정확히 읽지 못했어요. 더 밝고 선명하게 찍어 다시 시도하거나 직접 입력해주세요.";

  try {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: resolvedMediaType, data: base64Image },
              },
              { type: "text", text: EXTRACTION_PROMPT },
            ],
          },
          // 어시스턴트 응답을 "{"로 미리 채워서 잡설 없이 JSON부터 바로 시작하게 만든다.
          { role: "assistant", content: "{" },
        ],
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      console.error("[parseReservationImage] Claude API error:", res.status, data);
      return { success: false, error: NOT_READABLE_ERROR };
    }

    const rawText = "{" + (data.content?.[0]?.text ?? "");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      console.error("[parseReservationImage] JSON parse failed:", rawText, parseErr);
      return { success: false, error: NOT_READABLE_ERROR };
    }

    if (parsed.error || !parsed.customerName || !parsed.phone || !parsed.year) {
      return { success: false, error: NOT_READABLE_ERROR };
    }

    return {
      success: true,
      data: {
        customerName: String(parsed.customerName),
        phone: String(parsed.phone),
        year: Number(parsed.year),
        month: Number(parsed.month),
        day: Number(parsed.day),
        hour: Number(parsed.hour),
        minute: Number(parsed.minute),
        endHour: parsed.endHour != null ? Number(parsed.endHour) : null,
        endMinute: parsed.endMinute != null ? Number(parsed.endMinute) : null,
        partySize: parsed.partySize != null ? Number(parsed.partySize) : null,
      },
    };
  } catch (err) {
    console.error("[parseReservationImage] failed:", err);
    return { success: false, error: NOT_READABLE_ERROR };
  }
}
