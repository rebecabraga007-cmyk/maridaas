import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// DEPRECATED: This function is no longer used. Push notifications now use OneSignal via send-onesignal-push.
// Kept as a stub to avoid 404 errors from any remaining references.
serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ error: "Deprecated. Use send-onesignal-push instead." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
