import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validateAuthHeader,
  validateNotificationPayload,
  safeErrorResponse,
  isValidUUID,
} from "../_shared/validation.ts";

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
      console.error("Missing Supabase credentials");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("Missing VAPID keys");
      return safeErrorResponse("Configuration error", corsHeaders, 500);
    }

    // ===== VALIDATE AUTHORIZATION HEADER =====
    const authValidation = validateAuthHeader(req.headers.get("Authorization"));
    if (!authValidation.valid) {
      return safeErrorResponse(authValidation.error, corsHeaders, 401);
    }

    // ===== AUTHENTICATE USER =====
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${authValidation.token}` } }
    });

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(authValidation.token!);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Token validation failed:", claimsError);
      return safeErrorResponse("Invalid token", corsHeaders, 401);
    }

    const userId = claimsData.claims.sub;
    if (!isValidUUID(userId)) {
      return safeErrorResponse("Invalid user ID", corsHeaders, 401);
    }

    // ===== VERIFY ADMIN ROLE =====
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return safeErrorResponse("Permission check failed", corsHeaders, 500);
    }

    if (!roleData) {
      console.warn(`Unauthorized admin access attempt by user ${userId}`);
      return safeErrorResponse("Admin access required", corsHeaders, 403);
    }

    console.log(`Admin ${userId} authorized for push notification operation`);

    // ===== VALIDATE REQUEST BODY =====
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return safeErrorResponse("Invalid JSON body", corsHeaders, 400);
    }

    const payloadValidation = validateNotificationPayload(requestBody);
    if (!payloadValidation.valid) {
      return new Response(
        JSON.stringify({ error: payloadValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { notification_id, process_pending } = payloadValidation.data!;

    // ===== PROCESS NOTIFICATIONS =====
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
        console.error("Failed to fetch pending notifications:", pendingError);
        return safeErrorResponse("Failed to fetch notifications", corsHeaders, 500);
      }

      notificationsToProcess = pendingNotifications || [];
    } else if (notification_id) {
      const { data: notification, error: notifError } = await supabase
        .from("scheduled_notifications")
        .select("*")
        .eq("id", notification_id)
        .single();

      if (notifError || !notification) {
        return new Response(
          JSON.stringify({ error: "Notification not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      notificationsToProcess = [notification];
    }

    const results: Array<{ id: string; sent: number; failed: number }> = [];

    for (const notification of notificationsToProcess) {
      let subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string; user_id: string }> = [];

      if (notification.target_type === "all") {
        const { data } = await supabase.from("push_subscriptions").select("*");
        subscriptions = data || [];
      } else if (notification.target_type === "neighborhood" && notification.target_id) {
        if (!isValidUUID(notification.target_id)) {
          console.warn(`Invalid target_id in notification ${notification.id}`);
          continue;
        }

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
        if (!isValidUUID(notification.target_id)) {
          console.warn(`Invalid target_id in notification ${notification.id}`);
          continue;
        }

        const { data } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", notification.target_id);
        subscriptions = data || [];
      }

      console.log(`Processing notification ${notification.id}: ${subscriptions.length} subscriptions`);

      const payload: PushPayload = {
        title: notification.title,
        body: notification.body,
        url: "/feed",
        icon: "/logo.png",
      };

      let successCount = 0;
      let failCount = 0;

      for (const sub of subscriptions) {
        try {
          const result = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey);

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            if (result.status === 410 || result.status === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          }
        } catch (err) {
          failCount++;
          console.error(`Error sending to ${sub.id}:`, err);
        }
      }

      await supabase
        .from("scheduled_notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      results.push({ id: notification.id, sent: successCount, failed: failCount });
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return safeErrorResponse(error, corsHeaders, 500);
  }
});

// ===== WEB PUSH HELPERS =====

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
    const vapidHeaders = await createVapidAuthHeader(subscription.endpoint, vapidPublicKey, vapidPrivateKey);

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

    return { success: false, status: response.status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
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
  const rawSignature = signatureBytes.length === 64 ? signatureBytes : derToRaw(signatureBytes);
  const jwt = `${unsignedToken}.${uint8ArrayToBase64Url(rawSignature)}`;

  return { "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}` };
}

function derToRaw(derSignature: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 3;
  const rLen = derSignature[offset - 1];
  let rStart = offset;
  if (derSignature[rStart] === 0 && rLen === 33) rStart++;
  raw.set(derSignature.slice(rStart, offset + rLen - (rStart - offset)).slice(-32), 0);
  
  offset += rLen + 1;
  const sLen = derSignature[offset];
  offset++;
  let sStart = offset;
  if (derSignature[sStart] === 0 && sLen === 33) sStart++;
  raw.set(derSignature.slice(sStart, offset + sLen - (sStart - offset)).slice(-32), 32);
  
  return raw;
}
