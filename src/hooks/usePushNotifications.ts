import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Get the VAPID public key from environment
const VAPID_PUBLIC_KEY = "BCvN5KJp-XPqzpQqVQnp5K9xhpTxTmPjpYjfqzLPF4K2J5QxzE4r5X5vZP5pQPxP5P5P5P5P5P5P5P5P5P5P5P0";

interface PushState {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushState>({
    permission: "default",
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
  });

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const isSupported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
    
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
      isSubscribed = !!subscription;
    } catch (e) {
      console.error("Error checking subscription:", e);
    }

    setState({
      permission,
      isSupported: true,
      isSubscribed,
      isLoading: false,
    });
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      console.warn("Push notifications not supported");
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== "granted") {
        setState(prev => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract keys from subscription
      const key = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");
      
      if (!key || !auth) {
        throw new Error("Could not get subscription keys");
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
      const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Save subscription to database
      const { error } = await supabase
        .from("push_subscriptions" as any)
        .upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: p256dh,
          auth: authKey,
        }, {
          onConflict: "endpoint",
        });

      if (error) {
        console.error("Error saving subscription:", error);
        throw error;
      }

      // Update profile
      await supabase
        .from("profiles")
        .update({ notifications_enabled: true } as any)
        .eq("user_id", user.id);

      setState(prev => ({
        ...prev,
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("push_subscriptions" as any)
            .delete()
            .eq("endpoint", subscription.endpoint);

          await supabase
            .from("profiles")
            .update({ notifications_enabled: false } as any)
            .eq("user_id", user.id);
        }
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  // Simple local notification for immediate feedback
  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

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
    } catch (error) {
      console.error("Error sending local notification:", error);
    }
  }, [state.permission]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
};