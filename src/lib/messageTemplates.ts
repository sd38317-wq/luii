export const DEFAULT_CHECKOUT_NOTICE_TEMPLATE = `[{카페명}] {고객명}님, 이용해주셔서 감사합니다! 슬슬 정리하시고 퇴실 준비 부탁드릴게요.

퇴실 전 정돈하신 모습을 사진으로 남겨주세요. 내일 도착하는 리뷰 문자에 정돈 사진과 리뷰를 함께 보내주시면, 배민 상품권 1만원권 또는 1만원 계좌이체 중 원하시는 걸로 보내드립니다!

1층 세븐일레븐을 이용하셨다면, 영수증 사진과 계좌번호를 {연락처}로 보내주세요. 이용하신 요금의 10%를 환급해드립니다!`;

export const DEFAULT_FOLLOWUP_TEMPLATE = `[{카페명}] {고객명}님, 오늘 저희 공간을 찾아주셔서 진심으로 감사드립니다.

아이와 즐거운 시간 보내셨길 바라며, 혹시 불편하신 점은 없으셨는지 궁금합니다.

이용하시면서 느끼신 점을 있는 그대로, 솔직한 리뷰로 남겨주시면 저희에게 큰 힘이 되고, 다음에 오실 분들께도 큰 도움이 됩니다 :)
{리뷰링크}

리뷰와 어제 남겨주신 정돈 사진을 함께 캡처해서 {연락처}로 보내주시면 배민 상품권 1만원권 또는 1만원 계좌이체 중 원하시는 걸로 보내드려요!

다음에도 편안하고 즐거운 공간으로 또 찾아뵐게요. 감사합니다!`;

export function applyMessageTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(value);
  }
  return result;
}

// 상품권/환급 등 혜택 안내가 들어간 문자는 정보통신망법상 "영리목적 광고성 정보"라서
// 맨 앞 (광고) 표기와 맨 뒤 무료수신거부 번호 표기가 의무다 (위반 시 과태료).
// 사장님이 설정에서 문구를 어떻게 고치더라도 표기가 빠지지 않도록 발송 직전에 강제로 붙인다.
export function ensureAdCompliance(message: string, optOutNumber?: string | null): string {
  let result = message;
  if (!result.startsWith("(광고)")) {
    result = `(광고) ${result}`;
  }
  const number = optOutNumber?.trim();
  if (number && !result.includes("무료수신거부")) {
    result = `${result}\n\n무료수신거부 ${number}`;
  }
  return result;
}
