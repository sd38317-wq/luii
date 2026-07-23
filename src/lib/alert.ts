const RESEND_ENDPOINT = "https://api.resend.com/emails";

// 같은 문제로 계속 실패해도(예: IP 인증 오류가 몇 시간 지속) 1시간에 한 번만 알림을 보낸다.
const ALERT_THROTTLE_MS = 60 * 60_000;

let lastAlertSentAt = 0;

export async function sendFailureAlert(subject: string, body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!apiKey || !toEmail) return;

  const now = Date.now();
  if (now - lastAlertSentAt < ALERT_THROTTLE_MS) return;
  lastAlertSentAt = now;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: "예약 문자 알림 <onboarding@resend.dev>",
        to: toEmail,
        subject,
        text: body,
      }),
    });

    if (!res.ok) {
      console.error("[alert] Resend API error:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[alert] failed to send failure email:", err);
  }
}
