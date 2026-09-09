export const DL_REGEX = /^([A-Z]{2}[0-9]{2}[ -]?[0-9]{11})$/;
export const FSSAI_REGEX = /^[1-2][0-9]{13}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const PHONE_REGEX = /^\+?[0-9]{10,13}$/;

/** Keeps only characters a valid DL can contain, uppercased. */
export function normalizeDl(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9 -]/g, "").slice(0, 16);
}

/** FSSAI numbers are digits only, max 14. */
export function normalizeFssai(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function dlError(value: string): string | null {
  if (!value.trim()) return "Driving licence number is required.";
  return DL_REGEX.test(value.trim())
    ? null
    : "Invalid licence number. Use the format OD02 20210012345 (2 letters, 2 digits, 11 digits).";
}

export function fssaiError(value: string): string | null {
  if (!value.trim()) return "FSSAI licence number is required.";
  return FSSAI_REGEX.test(value.trim())
    ? null
    : "Invalid FSSAI number. It must be exactly 14 digits and start with 1 or 2.";
}

export function normalizePan(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export function panError(value: string): string | null {
  if (!value.trim()) return "PAN number is required.";
  return PAN_REGEX.test(value.trim())
    ? null
    : "Invalid PAN. Format: 5 letters, 4 digits, 1 letter (e.g. ABCPS1234F).";
}

export function ifscError(value: string): string | null {
  if (!value.trim()) return "IFSC code is required.";
  return IFSC_REGEX.test(value.trim().toUpperCase())
    ? null
    : "Invalid IFSC code. Format: 4 letters, 0, then 6 characters (e.g. SBIN0001234).";
}

export function phoneError(value: string): string | null {
  if (!value.trim()) return "Mobile number is required.";
  return PHONE_REGEX.test(value.trim())
    ? null
    : "Enter a valid mobile number (10 digits, optionally starting with +91).";
}
