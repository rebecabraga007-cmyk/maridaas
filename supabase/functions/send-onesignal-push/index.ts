import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateAuthHeader,
  safeErrorResponse,
  safeJsonResponse,
  isValidUUID,
  sanitizeInput,
  handleCorsOptions,
  safeParseJson,
  DEFAULT_CORS_HEADERS,
} from "../_shared/security.ts";

const corsHeaders = DEFAULT_CORS_HEADERS;

interface PushRequest {
  title: string;
  message: string;
  target_type: "all" | "user" | "neighborhood";
  target_id?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!onesignalAppId || !onesignalApiKey) {
      console.error("Missing OneSignal credentials");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    // Auth
    const authValidation = validateAuthHeader(req.headers.get("Authorization"));
    if (!authValidation.valid) {
      return safeErrorResponse(authValidation.error, corsHeaders, 401);
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authValidation.token}` } },
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(authValidation.token!);
    if (claimsError || !claimsData?.claims) {
      return safeErrorResponse("Invalid token", corsHeaders, 401);
    }

    const userId = claimsData.claims.sub;
    if (!isValidUUID(userId)) {
      return safeErrorResponse("Invalid user ID", corsHeaders, 401);
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
      return safeErrorResponse("Admin access required", corsHeaders, 403);
    }

    // Parse body
    const parseResult = await safeParseJson<PushRequest>(req, 10_000);
    if (!parseResult.success) {
      return safeErrorResponse(parseResult.error, corsHeaders, 400);
    }

    const body = parseResult.data!;
    const title = sanitizeInput(body.title, 200);
    const message = sanitizeInput(body.message, 500);

    if (!title || !message) {
      return safeErrorResponse("Title and message required", corsHeaders, 400);
    }

    // Build OneSignal payload
    const onesignalPayload: Record<string, unknown> = {
      app_id: onesignalAppId,
      headings: { en: title },
      contents: { en: message },
      url: body.url || "/feed",
    };

    if (body.target_type === "all") {
      onesignalPayload.included_segments = ["All"];
    } else if (body.target_type === "user" && body.target_id) {
      if (!isValidUUID(body.target_id)) {
        return safeErrorResponse("Invalid target_id", corsHeaders, 400);
      }
      onesignalPayload.include_external_user_ids = [body.target_id];
    } else if (body.target_type === "neighborhood" && body.target_id) {
      if (!isValidUUID(body.target_id)) {
        return safeErrorResponse("Invalid target_id", corsHeaders, 400);
      }
      // Get user IDs in neighborhood
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .or(`primary_neighborhood_id.eq.${body.target_id},secondary_neighborhood_id.eq.${body.target_id}`);

      const userIds = profiles?.map((p) => p.user_id) || [];
      if (userIds.length === 0) {
        return safeJsonResponse({ success: true, sent: 0 }, corsHeaders, { stripSensitive: false });
      }
      onesignalPayload.include_external_user_ids = userIds;
    }

    // Send via OneSignal REST API
    console.log(`[push] Sending to ${body.target_type}:`, body.target_id || "all");

    let retries = 0;
    let lastError: string | null = null;
    let success = false;
    let responseData: unknown = null;

    while (retries < 3 && !success) {
      try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${onesignalApiKey}`,
          },
          body: JSON.stringify(onesignalPayload),
        });

        responseData = await response.json();

        if (response.ok) {
          success = true;
          console.log("[push] Sent successfully:", responseData);
        } else {
          lastError = JSON.stringify(responseData);
          console.error(`[push] Attempt ${retries + 1} failed:`, lastError);
          retries++;
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
      return safeErrorResponse(`Push failed after ${retries} retries: ${lastError}`, corsHeaders, 502);
    }

    return safeJsonResponse(
      { success: true, data: responseData },
      corsHeaders,
      { stripSensitive: false }
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
