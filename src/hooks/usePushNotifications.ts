import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deletePushSubscription, savePushSubscription } from "@/lib/pushHelpers";
import {
  createLocalNotification,
  extractSubscriptionKeys,
  getCurrentPushSubscription,
  isPushSupported,
  subscribeToPush,
} from "@/lib/pushClient";

declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }
}

interface PushState {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushState>({
    permission: "default",
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
  });

  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
        if (error || !data?.vapidPublicKey) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        setVapidPublicKey(data.vapidPublicKey);

        if (!isPushSupported()) {
          setState({ permission: "unsupported", isSupported: false, isSubscribed: false, isLoading: false });
          return;
        }

        const subscription = await getCurrentPushSubscription();
        setState({
          permission: Notification.permission,
          isSupported: true,
          isSubscribed: Boolean(subscription),
          isLoading: false,
        });
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !vapidPublicKey) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      const subscription = await subscribeToPush(vapidPublicKey);
      const keys = extractSubscriptionKeys(subscription);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");

      await savePushSubscription(user.id, {
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });

      await supabase.from("profiles").update({ notifications_enabled: true }).eq("user_id", user.id);

      setState((prev) => ({ ...prev, permission: "granted", isSubscribed: true, isLoading: false }));
      return true;
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const subscription = await getCurrentPushSubscription();
      if (subscription) await subscription.unsubscribe();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await deletePushSubscription(user.id);
        await supabase.from("profiles").update({ notifications_enabled: false }).eq("user_id", user.id);
      }

      setState((prev) => ({ ...prev, isSubscribed: false, isLoading: false }));
      return true;
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  const sendLocalNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (state.permission !== "granted") return;
      try {
        return createLocalNotification(title, options);
      } catch {
        return;
      }
    },
    [state.permission]
  );

  return { ...state, subscribe, unsubscribe, sendLocalNotification };
};
