import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import {
  createCorsHeadersForRequest,
  rejectDisallowedOrigin,
} from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeadersForRequest(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const originRejection = rejectDisallowedOrigin(req, corsHeaders);
  if (originRejection) return originRejection;

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const { data: localSubscription } = await supabaseClient
      .from("subscriptions")
      .select("status, expires_at, trial_ends_at, promotion_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const trialEndsAt = localSubscription?.trial_ends_at
      ? new Date(localSubscription.trial_ends_at)
      : null;
    const hasActiveTrial =
      localSubscription?.status === "trialing" &&
      trialEndsAt !== null &&
      trialEndsAt.getTime() > Date.now();

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        subscribed: hasActiveTrial,
        subscription_status: hasActiveTrial ? "trialing" : "none",
        subscription_end: hasActiveTrial ? localSubscription.trial_ends_at : null,
        trial_ends_at: localSubscription?.trial_ends_at ?? null,
        trial_days_remaining: hasActiveTrial
          ? Math.ceil((trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : 0,
        promotion_name: localSubscription?.promotion_name ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          status: "active",
          stripe_customer_id: customerId,
          product_id: subscription.items.data[0]?.price?.id ?? null,
          expires_at: subscriptionEnd,
        }, { onConflict: "user_id" });
    } else if (localSubscription?.status === "trialing" && !hasActiveTrial) {
      await supabaseClient
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", user.id)
        .eq("status", "trialing");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub || hasActiveTrial,
      subscription_status: hasActiveSub ? "active" : hasActiveTrial ? "trialing" : "none",
      subscription_end: hasActiveSub ? subscriptionEnd : hasActiveTrial ? localSubscription.trial_ends_at : null,
      trial_ends_at: localSubscription?.trial_ends_at ?? null,
      trial_days_remaining: hasActiveTrial
        ? Math.ceil((trialEndsAt!.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0,
      promotion_name: localSubscription?.promotion_name ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
