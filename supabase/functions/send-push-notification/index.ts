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
  data?: Record<string, any>;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
) {
  // Create the WebPush request
  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/logo.png",
    badge: "/logo.png",
    data: {
      url: payload.url || "/",
      ...payload.data,
    },
  });

  // Encode VAPID keys
  const applicationServerKey = vapidPublicKey;
  
  // Create JWT for VAPID
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 60 * 60; // 12 hours
  
  const header = { alg: "ES256", typ: "JWT" };
  const claims = {
    aud: new URL(subscription.endpoint).origin,
    exp,
    sub: "mailto:contato@maridaas.app",
  };

  // Base64url encode
  const base64url = (data: ArrayBuffer | Uint8Array | string) => {
    let str: string;
    if (typeof data === "string") {
      str = btoa(data);
    } else {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      str = btoa(String.fromCharCode(...bytes));
    }
    return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const signatureInput = `${headerB64}.${claimsB64}`;

  // Import private key and sign
  const privateKeyBase64 = vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/");
  const privateKeyBytes = Uint8Array.from(atob(privateKeyBase64), (c) => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(async () => {
    // Try JWK format if PKCS8 fails
    const jwk = {
      kty: "EC",
      crv: "P-256",
      d: vapidPrivateKey,
      x: "", // Will be derived
      y: "", // Will be derived
    };
    return await crypto.subtle.importKey(
      "raw",
      privateKeyBytes,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  });

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const jwt = `${signatureInput}.${base64url(signature)}`;

  // Send the push notification
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${applicationServerKey}`,
    },
    body: encoder.encode(pushPayload),
  });

  return response.ok;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { notification_id } = await req.json();

    // Get the scheduled notification
    const { data: notification, error: notifError } = await supabase
      .from("scheduled_notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (notifError || !notification) {
      throw new Error("Notification not found");
    }

    // Get target subscriptions based on target_type
    let subscriptions: any[] = [];
    
    if (notification.target_type === "all") {
      const { data } = await supabase
        .from("push_subscriptions")
        .select("*");
      subscriptions = data || [];
    } else if (notification.target_type === "neighborhood" && notification.target_id) {
      // Get users in the neighborhood
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id")
        .or(`primary_neighborhood_id.eq.${notification.target_id},secondary_neighborhood_id.eq.${notification.target_id}`);
      
      const userIds = profiles?.map(p => p.user_id) || [];
      
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

    // Send to all subscriptions
    const payload: PushPayload = {
      title: notification.title,
      body: notification.body,
      url: "/feed",
    };

    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        const success = await sendPushToSubscription(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (success) successCount++;
        else failCount++;
      } catch (err) {
        console.error("Failed to send to subscription:", err);
        failCount++;
        // Remove invalid subscription
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.includes("410") || errorMessage.includes("404")) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    // Mark notification as sent
    await supabase
      .from("scheduled_notifications")
      .update({ sent_at: new Date().toISOString() })
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failCount }),
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