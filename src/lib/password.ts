import bcrypt from "bcryptjs";

const COST = 12;

export const PASSWORD_RULE = "At least 10 characters, with a letter and a number.";

export function passwordProblem(password: string): string | null {
  if (password.length < 10) return PASSWORD_RULE;
  if (password.length > 200) return "Password is too long.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return PASSWORD_RULE;
  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

let dummy: Promise<string> | null = null;
/** Compare against a real hash when the email is unknown, so response time does not reveal accounts. */
export async function burnPasswordCheck(password: string) {
  dummy ??= bcrypt.hash("not-a-real-password-1", COST);
  await bcrypt.compare(password, await dummy);
}
