/**
 * Shared validation and sanitization utilities for edge functions
 * Prevents injection attacks and ensures data integrity
 */

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * Prevents XSS and injection attacks
 */
export function sanitizeString(value: unknown, maxLength = 1000): string {
  if (typeof value !== "string") {
    return "";
  }
  
  return value
    .slice(0, maxLength)
    .replace(/[<>'"&\\]/g, "") // Remove dangerous characters
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/on\w+=/gi, "") // Remove event handlers
    .trim();
}

/**
 * Validates and sanitizes a notification payload
 */
export interface NotificationPayload {
  notification_id?: string;
  process_pending?: boolean;
}

export function validateNotificationPayload(body: unknown): {
  valid: boolean;
  data?: NotificationPayload;
  error?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const payload = body as Record<string, unknown>;

  // Validate notification_id if provided
  if (payload.notification_id !== undefined) {
    if (!isValidUUID(payload.notification_id)) {
      return { valid: false, error: "Invalid notification_id format" };
    }
  }

  // Validate process_pending if provided
  if (payload.process_pending !== undefined) {
    if (typeof payload.process_pending !== "boolean") {
      return { valid: false, error: "process_pending must be a boolean" };
    }
  }

  // At least one must be provided
  if (!payload.notification_id && !payload.process_pending) {
    return { valid: false, error: "Must provide notification_id or process_pending" };
  }

  return {
    valid: true,
    data: {
      notification_id: payload.notification_id as string | undefined,
      process_pending: payload.process_pending as boolean | undefined,
    },
  };
}

/**
 * Creates a safe error response that doesn't leak internal details
 */
export function safeErrorResponse(
  error: unknown,
  corsHeaders: Record<string, string>,
  statusCode = 500
): Response {
  // Log the full error internally
  console.error("Internal error:", error);

  // Return a generic message to the client
  const safeMessage =
    statusCode === 401 ? "Unauthorized" :
    statusCode === 403 ? "Forbidden" :
    statusCode === 400 ? "Bad request" :
    "An error occurred";

  return new Response(
    JSON.stringify({ error: safeMessage }),
    {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Validates authorization header format
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

  return { valid: true, token };
}
