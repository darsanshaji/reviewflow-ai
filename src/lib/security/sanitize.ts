/**
 * ReviewFlow AI - Security Input Sanitization Utility
 * Sanitizes input strings to protect against Cross-Site Scripting (XSS)
 */

export function sanitizeInput(input: string): string {
  if (!input) return "";

  // 1. Strip HTML tags using regex
  let clean = input.replace(/<\/?[^>]+(>|$)/g, "");

  // 2. Escape HTML special characters
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  const reg = /[&<>"'/]/g;
  clean = clean.replace(reg, (match) => map[match]);

  return clean.trim();
}
