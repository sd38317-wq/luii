// 비어있거나, 예시 문구(주로 한글)를 그대로 붙여넣은 시크릿 값을 헤더 등에 그대로 쓰면
// "Cannot convert argument to a ByteString..." 같은 알아보기 힘든 크래시가 난다.
// 여러 env 변수(ANTHROPIC_API_KEY, RESEND_API_KEY, SMS_RELAY_SECRET 등)에서 반복되는
// 문제라 공통 검사 함수로 뺐다.
export function isAsciiSafeSecret(value: string | undefined | null): value is string {
  return !!value && /^[\x20-\x7e]+$/.test(value);
}
