import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DEFAULT_CORS_HEADERS, handleCorsOptions } from "../_shared/security.ts";
import { checkRateLimit, rateLimitKey } from "../_shared/rateLimit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(DEFAULT_CORS_HEADERS);
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...DEFAULT_CORS_HEADERS, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const appId = Deno.env.get("ONESIGNAL_APP_ID");

    if (!appId) {
      console.error("ONESIGNAL_APP_ID not configured");
      return json({ error: "Configuration error" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: "Invalid token" }, 401);
    }

    // Rate limit: 10 config requests per minute per user
    const rlKey = rateLimitKey(userData.user.id, "onesignal-config");
    const { allowed } = await checkRateLimit(rlKey, 10, 60);
    if (!allowed) {
      return json({ error: "Too many requests" }, 429);
    }

    return json({ appId });
  } catch (error) {
    console.error("Internal error:", error);
    return json({ error: "An error occurred" }, 500);
  }
});
