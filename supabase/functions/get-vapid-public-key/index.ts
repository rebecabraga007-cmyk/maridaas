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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsOptions(corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase configuration");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    // ===== VALIDATE AUTHORIZATION HEADER =====
    const authValidation = validateAuthHeader(req.headers.get("Authorization"));
    if (!authValidation.valid) {
      return safeErrorResponse(authValidation.error, corsHeaders, 401);
    }

    // ===== AUTHENTICATE USER =====
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authValidation.token}` } }
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(authValidation.token!);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation failed:", claimsError);
      return safeErrorResponse("Invalid token", corsHeaders, 401);
    }

    // User is authenticated - return VAPID key
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPublicKey) {
      console.error("VAPID_PUBLIC_KEY not configured");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    // Log access (without exposing user ID in response)
    console.log(`VAPID key requested by authenticated user`);

    // Return sanitized response
    return safeJsonResponse(
      { vapidPublicKey },
      corsHeaders,
      { stripSensitive: false }
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});
