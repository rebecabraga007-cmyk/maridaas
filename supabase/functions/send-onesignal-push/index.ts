import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createCorsHeadersForRequest,
  isValidUUID,
  rejectDisallowedOrigin,
  sanitizeInput,
} from "../_shared/security.ts";
import { checkRateLimit, rateLimitKey } from "../_shared/rateLimit.ts";

function jsonResponse(data: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, corsHeaders: Record<string, string>, status: number) {
  return jsonResponse({ error: message }, corsHeaders, status);
}

interface PushRequest {
  title: string;
  message: string;
  target_type: "all" | "user" | "neighborhood";
  target_id?: string;
  url?: string;
}

serve(async (req) => {
  const corsHeaders = createCorsHeadersForRequest(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const originRejection = rejectDisallowedOrigin(req, corsHeaders);
  if (originRejection) return originRejection;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!onesignalAppId || !onesignalApiKey) {
      console.error("Missing OneSignal credentials");
      return errorResponse("Configuration error", corsHeaders, 500);
    }

    // Auth via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized", corsHeaders, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return errorResponse("Invalid token", corsHeaders, 401);
    }

    const userId = claimsData.claims.sub;
    if (!isValidUUID(userId)) {
      return errorResponse("Invalid user ID", corsHeaders, 401);
    }

    // Admin check
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return errorResponse("Admin access required", corsHeaders, 403);
    }

    // Rate limit: 30 push sends per minute per admin
    const rlKey = rateLimitKey(userId, "send-push");
    const { allowed, remaining } = await checkRateLimit(rlKey, 30, 60);
    if (!allowed) {
      return errorResponse("Too many requests", corsHeaders, 429);
    }

    // Parse body
    let body: PushRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", corsHeaders, 400);
    }

    const title = sanitizeInput(body.title, 200);
    const message = sanitizeInput(body.message, 500);

    if (!title || !message) {
      return errorResponse("Title and message required", corsHeaders, 400);
    }

    // Build OneSignal payload — v16 API format
    const onesignalPayload: Record<string, unknown> = {
      app_id: onesignalAppId,
      headings: { en: title },
      contents: { en: message },
      target_channel: "push",
      url: body.url || "/feed",
    };

    if (body.target_type === "all") {
      onesignalPayload.included_segments = ["All"];
    } else if (body.target_type === "user" && body.target_id) {
      if (!isValidUUID(body.target_id)) {
        return errorResponse("Invalid target_id", corsHeaders, 400);
      }
      onesignalPayload.include_aliases = {
        external_id: [body.target_id],
      };
    } else if (body.target_type === "neighborhood" && body.target_id) {
      if (!isValidUUID(body.target_id)) {
        return errorResponse("Invalid target_id", corsHeaders, 400);
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("notifications_enabled", true)
        .or(
          `primary_neighborhood_id.eq.${body.target_id},secondary_neighborhood_id.eq.${body.target_id}`
        );

      const userIds = profiles?.map((p: { user_id: string }) => p.user_id) || [];
      if (userIds.length === 0) {
        return jsonResponse({ success: true, sent: 0 }, corsHeaders);
      }

      onesignalPayload.include_aliases = {
        external_id: userIds,
      };
    }

    // Send via OneSignal REST API with retry logic
    console.log(`[push] Sending to ${body.target_type}:`, body.target_id || "all");

    let retries = 0;
    let lastError: string | null = null;
    let success = false;
    let responseData: unknown = null;

    while (retries < 3 && !success) {
      try {
        const response = await fetch("https://api.onesignal.com/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Key ${onesignalApiKey}`,
          },
          body: JSON.stringify(onesignalPayload),
        });

        const responseText = await response.text();
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        if (response.ok) {
          success = true;
          console.log("[push] Sent successfully:", responseData);
        } else {
          lastError = responseText;
          console.error(`[push] Attempt ${retries + 1} failed (${response.status}):`, lastError);
          retries++;
          if (response.status >= 400 && response.status < 500) break;
          if (retries < 3) await new Promise((r) => setTimeout(r, 1000 * retries));
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[push] Attempt ${retries + 1} error:`, lastError);
        retries++;
        if (retries < 3) await new Promise((r) => setTimeout(r, 1000 * retries));
      }
    }

    if (!success) {
      return errorResponse(`Push failed after ${retries} attempts`, corsHeaders, 502);
    }

    return jsonResponse({ success: true, data: responseData }, corsHeaders);
  } catch (error) {
    console.error("Internal error:", error);
    return errorResponse("An error occurred", corsHeaders, 500);
  }
});
