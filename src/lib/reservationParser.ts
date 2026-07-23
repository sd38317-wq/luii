import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

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

function to24Hour(ampm: string, hour12: number): number {
  const h = hour12 % 12;
  return ampm === "오후" ? h + 12 : h;
}

// 네이버 플레이스 예약 상세 화면의 고정 레이아웃(예약자/전화번호/이용일시 라벨)을 정규식으로 파싱한다.
function extractFields(fullText: string): ExtractedReservation | null {
  // 캡처에 예약 여러 건이 걸쳐 보일 때, 첫 "예약자" 라벨 이전 텍스트(이전 예약의 꼬리)를
  // 잘라내 이름/전화번호/일시가 서로 다른 예약에서 섞여 나오는 것을 막는다.
  const labelIndex = fullText.indexOf("예약자");
  const text = labelIndex >= 0 ? fullText.slice(labelIndex) : fullText;

  const nameMatch = text.match(/예약자\s*[\r\n]*\s*([가-힣]{2,10})/);
  const phoneMatch = text.match(/(01\d)[-.\s]?(\d{3,4})[-.\s]?(\d{4})/);
  const dateMatch = text.match(/(\d{4})\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})\s*\./);
  const timeMatch = text.match(
    /(오전|오후)\s*(\d{1,2})\s*:\s*(\d{2})\s*[~\-]\s*(오전|오후)?\s*(\d{1,2})\s*:\s*(\d{2})/,
  );

  if (!nameMatch || !phoneMatch || !dateMatch || !timeMatch) return null;

  const startAmPm = timeMatch[1];
  const endAmPm = timeMatch[4] || startAmPm;

  return {
    customerName: nameMatch[1],
    phone: `${phoneMatch[1]}-${phoneMatch[2]}-${phoneMatch[3]}`,
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: to24Hour(startAmPm, Number(timeMatch[2])),
    minute: Number(timeMatch[3]),
    endHour: to24Hour(endAmPm, Number(timeMatch[5])),
    endMinute: Number(timeMatch[6]),
    partySize: null,
  };
}

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("kor+eng");
  }
  return workerPromise;
}

export async function parseReservationImage(base64Image: string): Promise<ParseImageResult> {
  try {
    const buffer = Buffer.from(base64Image, "base64");
    const metadata = await sharp(buffer).metadata();
    const scale = 3;
    // 요즘 폰 스크린샷은 원본 해상도가 이미 높아서 무조건 3배 확대하면
    // 메모리 사용량이 서버(512MB)를 넘겨 프로세스가 죽을 수 있다.
    // OCR 정확도에 큰 차이가 없는 선에서 목표 너비를 상한선으로 제한한다.
    const MAX_WIDTH = 2000;
    const targetWidth = Math.min(Math.round((metadata.width ?? 800) * scale), MAX_WIDTH);

    // 화질이 낮은 캡처에서도 라벨/숫자를 안정적으로 읽도록 확대 + 흑백 변환 + 대비 보정을 거친다.
    const preprocessed = await sharp(buffer)
      .resize({ width: targetWidth, kernel: "lanczos3" })
      .grayscale()
      .normalise({ lower: 1, upper: 99 })
      .png()
      .toBuffer();

    const worker = await getWorker();
    const {
      data: { text },
    } = await worker.recognize(preprocessed);

    const extracted = extractFields(text);

    if (!extracted) {
      return {
        success: false,
        error:
          "이미지에서 예약 정보를 정확히 읽지 못했어요. 더 밝고 선명하게 찍어 다시 시도하거나 직접 입력해주세요.",
      };
    }

    return { success: true, data: extracted };
  } catch (err) {
    console.error("[parseReservationImage] failed:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
