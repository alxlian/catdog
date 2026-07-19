/**
 * Convert ALL CAPS breed/name strings to Title Case.
 * Handles abbreviations like "GOLDEN RETR" -> "Golden Retr"
 * and "DOMESTIC SH" -> "Domestic Sh"
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
