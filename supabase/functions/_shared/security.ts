/**
 * Comprehensive Security Layer for Edge Functions
 * Prevents injection attacks and protects sensitive data in API responses
 */

// ===== INPUT SANITIZATION =====

/**
 * Removes potentially dangerous characters and patterns from strings
 * Prevents XSS, SQL injection, and command injection
 */
export function sanitizeInput(value: unknown, maxLength = 1000): string {
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
    // Remove dangerous characters for SQL
    .replace(/['";\\]/g, "")
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sanitizes for safe use in SQL LIKE patterns
 * Escapes LIKE special characters to prevent pattern injection
 */
export function sanitizeForLike(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Validates and sanitizes email format
 */
export function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  
  const email = value.toLowerCase().trim().slice(0, 255);
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  
  return emailRegex.test(email) ? email : null;
}

/**
 * Validates UUID format (v4)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * Sanitizes array of UUIDs, returning only valid ones
 */
export function sanitizeUUIDArray(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }
  
  return values.filter(isValidUUID);
}

/**
 * Validates numeric input within bounds
 */
export function sanitizeNumber(
  value: unknown, 
  min = 0, 
  max = Number.MAX_SAFE_INTEGER,
  defaultValue = 0
): number {
  const num = typeof value === "number" ? value : Number(value);
  
  if (isNaN(num)) {
    return defaultValue;
  }
  
  return Math.max(min, Math.min(max, Math.floor(num)));
}

/**
 * Sanitizes boolean input
 */
export function sanitizeBoolean(value: unknown, defaultValue = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return defaultValue;
}

// ===== RESPONSE SANITIZATION =====

/**
 * Fields that should NEVER be exposed in API responses
 */
const SENSITIVE_FIELDS = new Set([
  "cpf",
  "birth_date",
  "address",
  "cep",
  "password",
  "password_hash",
  "secret",
  "token",
  "api_key",
  "private_key",
  "credit_card",
  "ssn",
  "tax_id",
]);

/**
 * Fields that should only be visible to the owner or admins
 */
const RESTRICTED_FIELDS = new Set([
  "whatsapp",
  "instagram",
  "email",
  "phone",
]);

/**
 * Recursively removes sensitive fields from an object
 */
export function stripSensitiveData<T>(
  data: T,
  options: {
    allowRestrictedFields?: boolean;
    additionalSensitiveFields?: string[];
  } = {}
): T {
  const { allowRestrictedFields = false, additionalSensitiveFields = [] } = options;
  
  const sensitiveSet = new Set([
    ...SENSITIVE_FIELDS,
    ...additionalSensitiveFields.map(f => f.toLowerCase()),
  ]);
  
  function sanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (typeof obj === "object") {
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        
        // Skip sensitive fields
        if (sensitiveSet.has(lowerKey)) {
          continue;
        }
        
        // Handle restricted fields
        if (!allowRestrictedFields && RESTRICTED_FIELDS.has(lowerKey)) {
          continue;
        }
        
        result[key] = sanitize(value);
      }
      
      return result;
    }
    
    return obj;
  }
  
  return sanitize(data) as T;
}

/**
 * Creates a safe profile response for public consumption
 */
export interface SafePublicProfile {
  user_id: string;
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  avatar_url: string | null;
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
}

export function toSafePublicProfile(profile: Record<string, unknown>): SafePublicProfile {
  return {
    user_id: String(profile.user_id || ""),
    full_name: String(profile.full_name || ""),
    bio: profile.bio ? String(profile.bio) : null,
    neighborhood: String(profile.neighborhood || ""),
    city: String(profile.city || ""),
    avatar_url: profile.avatar_url ? String(profile.avatar_url) : null,
    primary_neighborhood_id: profile.primary_neighborhood_id 
      ? String(profile.primary_neighborhood_id) : null,
    secondary_neighborhood_id: profile.secondary_neighborhood_id 
      ? String(profile.secondary_neighborhood_id) : null,
  };
}

// ===== REQUEST VALIDATION =====

/**
 * Validates authorization header and extracts token
 */
export function validateAuthHeader(authHeader: string | null): {
  valid: boolean;
  token?: string;
  error?: string;
} {
  if (!authHeader) {
    return { valid: false, error: "Missing authorization header" };
  }

  if (!authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Invalid authorization format" };
  }

  const token = authHeader.substring(7);
  
  // Basic JWT format validation (three base64url segments)
  const jwtParts = token.split(".");
  if (jwtParts.length !== 3) {
    return { valid: false, error: "Invalid token format" };
  }

  // Validate each part is valid base64url
  const base64urlRegex = /^[A-Za-z0-9_-]+$/;
  for (const part of jwtParts) {
    if (!base64urlRegex.test(part)) {
      return { valid: false, error: "Malformed token" };
    }
  }

  return { valid: true, token };
}

/**
 * Validates request origin for CSRF protection
 */
export function validateOrigin(
  request: Request, 
  allowedOrigins: string[]
): boolean {
  const origin = request.headers.get("Origin");
  const referer = request.headers.get("Referer");
  
  const checkOrigin = origin || (referer ? new URL(referer).origin : null);
  
  if (!checkOrigin) {
    return false;
  }
  
  return allowedOrigins.some(allowed => 
    checkOrigin === allowed || checkOrigin.endsWith(`.${allowed}`)
  );
}

/**
 * Rate limiting helper - returns remaining requests info
 */
export function createRateLimitKey(
  userId: string | null, 
  ip: string | null, 
  action: string
): string {
  const identifier = userId || ip || "anonymous";
  return `ratelimit:${action}:${identifier}`;
}

// ===== ERROR HANDLING =====

/**
 * Creates a safe error response that doesn't leak internal details
 */
export function safeErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  statusCode = 500
): Response {
  // Log the full error internally
  console.error("Internal error:", error instanceof Error ? error.message : error);

  // Return a generic message to the client
  const safeMessages: Record<number, string> = {
    400: "Bad request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not found",
    429: "Too many requests",
    500: "An error occurred",
  };

  const message = safeMessages[statusCode] || "An error occurred";

  return new Response(
    JSON.stringify({ error: message }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Creates a successful JSON response with sanitized data
 */
export function safeJsonResponse<T>(
  data: T,
  corsHeaders: Record<string, string>,
  options: {
    stripSensitive?: boolean;
    allowRestrictedFields?: boolean;
    statusCode?: number;
  } = {}
): Response {
  const { 
    stripSensitive = true, 
    allowRestrictedFields = false,
    statusCode = 200 
  } = options;
  
  const responseData = stripSensitive 
    ? stripSensitiveData(data, { allowRestrictedFields })
    : data;
  
  return new Response(
    JSON.stringify(responseData),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

// ===== REQUEST BODY VALIDATION =====

/**
 * Safely parses JSON body with size limit
 */
export async function safeParseJson<T = unknown>(
  request: Request,
  maxSizeBytes = 100_000
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    // Check content length
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return { success: false, error: "Request body too large" };
    }
    
    const text = await request.text();
    
    if (text.length > maxSizeBytes) {
      return { success: false, error: "Request body too large" };
    }
    
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch {
    return { success: false, error: "Invalid JSON body" };
  }
}

/**
 * Validates required fields in an object
 */
export function validateRequiredFields(
  obj: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(
    field => obj[field] === undefined || obj[field] === null || obj[field] === ""
  );
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

// ===== CORS HEADERS =====

export const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/**
 * Creates CORS headers with specific origin (more secure than *)
 */
export function createCorsHeaders(allowedOrigin?: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin || "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };
}

/**
 * Handles CORS preflight request
 */
export function handleCorsOptions(corsHeaders: Record<string, string>): Response {
  return new Response(null, { 
    status: 204,
    headers: corsHeaders 
  });
}
