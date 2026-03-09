import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateAuthHeader,
  safeErrorResponse,
  safeJsonResponse,
  handleCorsOptions,
  DEFAULT_CORS_HEADERS,
} from "../_shared/security.ts";

const corsHeaders = DEFAULT_CORS_HEADERS;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const appId = Deno.env.get("ONESIGNAL_APP_ID");

    if (!supabaseUrl || !supabaseAnonKey) {
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    if (!appId) {
      console.error("ONESIGNAL_APP_ID not configured");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    // Validate auth
    const authValidation = validateAuthHeader(req.headers.get("Authorization"));
    if (!authValidation.valid) {
      return safeErrorResponse(authValidation.error, corsHeaders, 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authValidation.token}` } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authValidation.token!);
    if (claimsError || !claimsData?.claims) {
      return safeErrorResponse("Invalid token", corsHeaders, 401);
    }

    console.log("OneSignal config requested by authenticated user");

    return safeJsonResponse({ appId }, corsHeaders, { stripSensitive: false });
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
