import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { urlBase64ToUint8Array } from "@/lib/utils";
import { deletePushSubscription, savePushSubscription } from "@/lib/pushHelpers";

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
    const loadVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
        if (error || !data?.vapidPublicKey) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        setVapidPublicKey(data.vapidPublicKey);
        await checkSupport();
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    loadVapidKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSupport = async () => {
    const isSupported =
      "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

    if (!isSupported) {
      setState({
        permission: "unsupported",
        isSupported: false,
        isSubscribed: false,
        isLoading: false,
      });
      return;
    }

    const permission = Notification.permission;
    let isSubscribed = false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      isSubscribed = Boolean(subscription);
    } catch {
      // silent
    }

    setState({
      permission,
      isSupported: true,
      isSubscribed,
      isLoading: false,
    });
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !vapidPublicKey) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((prev) => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      const key = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");
      if (!key || !auth) throw new Error("missing_subscription_keys");

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
      const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");

      await savePushSubscription(user.id, {
        endpoint: subscription.endpoint,
        p256dh,
        auth: authKey,
      });

      await supabase
        .from("profiles")
        .update({ notifications_enabled: true })
        .eq("user_id", user.id);

      setState((prev) => ({
        ...prev,
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
      }));

      return true;
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await deletePushSubscription(user.id);
          await supabase
            .from("profiles")
            .update({ notifications_enabled: false })
            .eq("user_id", user.id);
        }
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
        const notification = new Notification(title, {
          icon: "/logo.png",
          badge: "/logo.png",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return notification;
      } catch {
        return;
      }
    },
    [state.permission]
  );

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
};
