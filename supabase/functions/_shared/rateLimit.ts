import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Server-side rate limiting using the rate_limits table.
 * Returns true if the request is allowed, false if rate limited.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString();

  // Get current request count in window
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("id, requests, window_start")
    .eq("key", key)
    .gte("window_start", windowStart)
    .order("window_start", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.requests >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }

    // Increment
    await supabase
      .from("rate_limits")
      .update({ requests: existing.requests + 1 })
      .eq("id", existing.id);

    return { allowed: true, remaining: maxRequests - existing.requests - 1 };
  }

  // Create new window
  await supabase.from("rate_limits").insert({ key, requests: 1 });

  return { allowed: true, remaining: maxRequests - 1 };
}

/**
 * Creates a rate limit key for a user+action combination
 */
export function rateLimitKey(userId: string, action: string): string {
  return `rl:${action}:${userId}`;
}
