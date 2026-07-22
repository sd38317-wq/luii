import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const ExtractedReservationSchema = z.object({
  customerName: z.string(),
  phone: z.string(),
  year: z.number().int(),
  month: z.number().int(),
  day: z.number().int(),
  hour: z.number().int(),
  minute: z.number().int(),
  endHour: z.number().int().nullable(),
  endMinute: z.number().int().nullable(),
  partySize: z.number().int().nullable(),
});

export type ExtractedReservation = z.infer<typeof ExtractedReservationSchema>;

export interface ParseImageResult {
  success: boolean;
  data?: ExtractedReservation;
  error?: string;
}

type SupportedMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export async function parseReservationImage(
  base64Image: string,
  mediaType: SupportedMediaType,
): Promise<ParseImageResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return { success: false, error: "ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다." };
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            {
              type: "text",
              text: "이 이미지는 네이버 플레이스 키즈룸/키즈카페 예약 상세 화면 캡처입니다. 예약자 이름, 전화번호, 이용 시작 일시(한국 시간 기준, 24시간제)를 추출해줘. '이용일시'에 시작~종료 시간이 함께 나오면(예: 오후 6:00~오후 7:00) 시작 시간(hour/minute)과 종료 시간(endHour/endMinute)을 모두 24시간제로 추출해줘. 종료 시간이 화면에 없으면 endHour/endMinute는 null로 해줘. 화면에 인원수 정보가 없으면 partySize는 null로 해줘.",
            },
          ],
        },
      ],
      output_config: { format: zodOutputFormat(ExtractedReservationSchema) },
    });

    if (!response.parsed_output) {
      return { success: false, error: "이미지에서 예약 정보를 읽지 못했습니다." };
    }

    return { success: true, data: response.parsed_output };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
