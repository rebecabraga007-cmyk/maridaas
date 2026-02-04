/**
 * Client-side input sanitization utilities
 * First line of defense against injection attacks
 */

/**
 * Sanitizes user input by removing potentially dangerous characters
 */
export function sanitizeInput(value: string, maxLength = 1000): string {
  if (typeof value !== "string") {
    return "";
  }
  
  return value
    .slice(0, maxLength)
    // Remove HTML/XML tags
    .replace(/<[^>]*>/g, "")
    // Remove script-related patterns
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
    // Remove event handlers
    .replace(/on\w+\s*=/gi, "")
    // Remove dangerous SQL characters
    .replace(/['";\\]/g, "")
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitizes for safe use in SQL LIKE patterns
 */
export function sanitizeForLike(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Sanitizes a search query for safe database querying
 */
export function sanitizeSearchQuery(value: string, maxLength = 100): string {
  // First apply general sanitization
  const sanitized = sanitizeInput(value, maxLength);
  // Then escape LIKE special characters
  return sanitizeForLike(sanitized);
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  return emailRegex.test(email.trim());
}

/**
 * Validates UUID format
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Sanitizes a URL to prevent javascript: and data: attacks
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== "string") {
    return null;
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("data:")
  ) {
    return null;
  }
  
  try {
    // Validate it's a proper URL
    new URL(url);
    return url;
  } catch {
    // If it's a relative URL, allow it
    if (url.startsWith("/") && !url.startsWith("//")) {
      return url;
    }
    return null;
  }
}

/**
 * Sanitizes content for display (prevents XSS)
 */
export function sanitizeForDisplay(value: string): string {
  if (typeof value !== "string") {
    return "";
  }
  
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Validates and sanitizes a phone number (Brazilian format)
 */
export function sanitizePhoneNumber(phone: string): string | null {
  if (typeof phone !== "string") {
    return null;
  }
  
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");
  
  // Brazilian phone: 10-11 digits (with area code)
  if (digits.length < 10 || digits.length > 11) {
    return null;
  }
  
  return digits;
}

/**
 * Validates Brazilian CPF format (does not validate checksum)
 */
export function isValidCPFFormat(cpf: string): boolean {
  if (typeof cpf !== "string") {
    return false;
  }
  
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11;
}

/**
 * Validates Brazilian CEP format
 */
export function isValidCEPFormat(cep: string): boolean {
  if (typeof cep !== "string") {
    return false;
  }
  
  const digits = cep.replace(/\D/g, "");
  return digits.length === 8;
}

/**
 * Creates a sanitized object with only allowed fields
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  
  return result;
}

/**
 * Removes sensitive fields from an object before logging/displaying
 */
export function redactSensitiveFields<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields = ["cpf", "password", "token", "secret", "api_key"]
): T {
  const result = { ...obj };
  
  for (const field of sensitiveFields) {
    if (field in result) {
      (result as Record<string, unknown>)[field] = "[REDACTED]";
    }
  }
  
  return result;
}
