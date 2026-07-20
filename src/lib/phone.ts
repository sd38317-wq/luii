export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return null;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}
