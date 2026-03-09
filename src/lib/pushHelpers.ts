import { supabase } from "@/integrations/supabase/client";

type SubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(userId: string, payload: SubscriptionPayload) {
  await supabase.from("push_subscriptions").delete().eq("user_id", userId);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: userId,
    endpoint: payload.endpoint,
    p256dh: payload.p256dh,
    auth: payload.auth,
  });

  if (error) throw error;
}

export async function deletePushSubscription(userId: string) {
  const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId);
  if (error) throw error;
}
