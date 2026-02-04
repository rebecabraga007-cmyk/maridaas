import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      throw new Error("Missing Supabase credentials");
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("Missing VAPID keys. Please configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.");
    }

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing or invalid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to validate
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // ===== ADMIN ROLE CHECK =====
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roleData) {
      console.warn(`Unauthorized access attempt by user ${userId}`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Admin ${userId} authorized for push notification operation`);

    // ===== PROCESS NOTIFICATIONS =====
    const body = await req.json();
    const { notification_id, process_pending } = body;

    let notificationsToProcess: Array<{
      id: string;
      title: string;
      body: string;
      target_type: string;
      target_id: string | null;
    }> = [];

    if (process_pending) {
      const { data: pendingNotifications, error: pendingError } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .is("sent_at", null)
        .lte("scheduled_at", new Date().toISOString());

      if (pendingError) {
        throw new Error(`Failed to fetch pending notifications: ${pendingError.message}`);
      }

      notificationsToProcess = pendingNotifications || [];
    } else if (notification_id) {
      const { data: notification, error: notifError } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("id", notification_id)
        .single();

      if (notifError || !notification) {
        throw new Error("Notification not found");
      }

      notificationsToProcess = [notification];
    } else {
      throw new Error("Must provide notification_id or process_pending=true");
    }

    const results: Array<{ id: string; sent: number; failed: number; errors: string[] }> = [];

    for (const notification of notificationsToProcess) {
      let subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string; user_id: string }> = [];

      if (notification.target_type === "all") {
        const { data } = await supabase.from("push_subscriptions").select("*");
        subscriptions = data || [];
      } else if (notification.target_type === "neighborhood" && notification.target_id) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id")
          .or(`primary_neighborhood_id.eq.${notification.target_id},secondary_neighborhood_id.eq.${notification.target_id}`);

        const userIds = profiles?.map((p) => p.user_id) || [];

        if (userIds.length > 0) {
          const { data } = await supabase
            .from("push_subscriptions")
            .select("*")
            .in("user_id", userIds);
          subscriptions = data || [];
        }
      } else if (notification.target_type === "user" && notification.target_id) {
        const { data } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", notification.target_id);
        subscriptions = data || [];
      }

      console.log(`Processing notification ${notification.id}: ${subscriptions.length} subscriptions found`);

      const payload: PushPayload = {
        title: notification.title,
        body: notification.body,
        url: "/feed",
        icon: "/logo.png",
      };

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (const sub of subscriptions) {
        try {
          const result = await sendWebPush(
            sub,
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (result.success) {
            successCount++;
            console.log(`✓ Sent to subscription ${sub.id}`);
          } else {
            failCount++;
            errors.push(`Sub ${sub.id}: ${result.error}`);
            console.error(`✗ Failed to send to ${sub.id}: ${result.error}`);

            if (result.status === 410 || result.status === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              console.log(`Removed invalid subscription ${sub.id}`);
            }
          }
        } catch (err) {
          failCount++;
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`Sub ${sub.id}: ${errMsg}`);
          console.error(`✗ Error sending to ${sub.id}:`, err);
        }
      }

      await supabase
        .from("scheduled_notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      results.push({ id: notification.id, sent: successCount, failed: failCount, errors });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions for Web Push

function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(base64 + padding);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    
    const vapidHeaders = await createVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    const isFCM = subscription.endpoint.includes("fcm.googleapis.com") || 
                  subscription.endpoint.includes("android.googleapis.com");
    
    const headers: Record<string, string> = {
      "TTL": "86400",
      "Urgency": "high",
      ...vapidHeaders,
    };

    let bodyToSend: BodyInit;
    
    if (isFCM) {
      headers["Content-Type"] = "application/json";
      bodyToSend = payloadString;
    } else {
      headers["Content-Type"] = "application/octet-stream";
      headers["Content-Encoding"] = "aes128gcm";
      bodyToSend = new TextEncoder().encode(payloadString);
    }

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body: bodyToSend,
    });

    if (response.ok || response.status === 201) {
      return { success: true, status: response.status };
    }

    const errorText = await response.text();
    return { 
      success: false, 
      status: response.status, 
      error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Record<string, string>> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 60 * 60;
  
  const header = { alg: "ES256", typ: "JWT" };
  const claims = {
    aud: new URL(endpoint).origin,
    exp,
    sub: "mailto:contato@maridaas.app",
  };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const claimsB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  const publicKeyBytes = base64UrlToUint8Array(vapidPublicKey);

  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(privateKeyBytes),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let rawSignature: Uint8Array;
  
  if (signatureBytes.length === 64) {
    rawSignature = signatureBytes;
  } else {
    rawSignature = derToRaw(signatureBytes);
  }

  const jwt = `${unsignedToken}.${uint8ArrayToBase64Url(rawSignature)}`;

  return {
    "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
  };
}

function derToRaw(derSignature: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  
  let offset = 2;
  
  offset += 1;
  const rLen = derSignature[offset];
  offset += 1;
  
  let rStart = offset;
  if (derSignature[rStart] === 0 && rLen === 33) {
    rStart += 1;
  }
  const rBytes = derSignature.slice(rStart, offset + rLen);
  raw.set(rBytes.slice(-32), 32 - Math.min(rBytes.length, 32));
  
  offset += rLen;
  
  offset += 1;
  const sLen = derSignature[offset];
  offset += 1;
  
  let sStart = offset;
  if (derSignature[sStart] === 0 && sLen === 33) {
    sStart += 1;
  }
  const sBytes = derSignature.slice(sStart, offset + sLen);
  raw.set(sBytes.slice(-32), 64 - Math.min(sBytes.length, 32));
  
  return raw;
}
