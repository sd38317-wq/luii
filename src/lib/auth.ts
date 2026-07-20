export const SESSION_COOKIE_NAME = "kidscafe_session";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getExpectedSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET || "dev-secret-change-me";
  return sha256Hex(`kidscafe-session:${secret}`);
}

export async function isValidSessionValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const expected = await getExpectedSessionToken();
  return value === expected;
}
