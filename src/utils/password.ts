// Shared strong-password rules. Used by admin create-user and reset-password flows.

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  digit: boolean;
  symbol: boolean;
}

export function checkPassword(pw: string): PasswordChecks {
  return {
    length: pw.length >= PASSWORD_MIN_LENGTH,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

export function isStrongPassword(pw: string): boolean {
  const c = checkPassword(pw);
  return c.length && c.upper && c.lower && c.digit && c.symbol;
}

// Returns an error message, or null if the password passes.
export function validateStrongPassword(pw: string): string | null {
  const c = checkPassword(pw);
  const missing: string[] = [];
  if (!c.length) missing.push(`${PASSWORD_MIN_LENGTH}+ chars`);
  if (!c.upper) missing.push("uppercase");
  if (!c.lower) missing.push("lowercase");
  if (!c.digit) missing.push("digit");
  if (!c.symbol) missing.push("symbol");
  if (missing.length === 0) return null;
  return `Password needs: ${missing.join(", ")}`;
}

// 0..5 — 0 empty, 5 all checks passed.
export function passwordStrengthScore(pw: string): number {
  if (!pw) return 0;
  const c = checkPassword(pw);
  return [c.length, c.upper, c.lower, c.digit, c.symbol].filter(Boolean).length;
}
