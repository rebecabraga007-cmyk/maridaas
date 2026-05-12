import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { isNativePlatform } from "@/lib/platform";
import {
  initOneSignal,
  requestPushPermission,
  waitForSubscription,
  loginUser,
  logoutUser,
  optOutPush,
  optInPush,
  isOptedIn,
  isIOSDevice,
  isPWAInstalled,
  getDiagnostics,
} from "@/lib/push/onesignal";
import {
  initNative,
  requestNativePermission,
  loginNative,
  logoutNative,
  optInNative,
  optOutNative,
  isOptedInNative,
} from "@/lib/push/onesignalNative";

interface PushState {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  needsPWAInstall: boolean;
}

export const useOneSignalPush = () => {
  const [state, setState] = useState<PushState>({
    permission: "default",
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    needsPWAInstall: false,
  });

  useEffect(() => {
    const init = async () => {
      try {
        // Native (Capacitor iOS/Android): use OneSignal Cordova plugin.
        if (isNativePlatform()) {
          const { data, error } = await supabase.functions.invoke("get-onesignal-config");
          if (error || !data?.appId) {
            console.error("[push:native] Failed to get OneSignal config:", error);
            setState({
              permission: "default",
              isSupported: false,
              isSubscribed: false,
              isLoading: false,
              needsPWAInstall: false,
            });
            return;
          }
          await initNative(data.appId);
          const subscribed = await isOptedInNative();
          if (subscribed) {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) await loginNative(authData.user.id);
          }
          setState({
            permission: subscribed ? "granted" : "default",
            isSupported: true,
            isSubscribed: subscribed,
            isLoading: false,
            needsPWAInstall: false,
          });
          return;
        }

        // Check platform support
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          setState({
            permission: "unsupported",
            isSupported: false,
            isSubscribed: false,
            isLoading: false,
            needsPWAInstall: false,
          });
          return;
        }

        // iOS needs PWA installed
        if (isIOSDevice() && !isPWAInstalled()) {
          setState({
            permission: "default",
            isSupported: false,
            isSubscribed: false,
            isLoading: false,
            needsPWAInstall: true,
          });
          return;
        }

        // Fetch OneSignal App ID from edge function
        const { data, error } = await supabase.functions.invoke("get-onesignal-config");
        if (error || !data?.appId) {
          console.error("[push] Failed to get OneSignal config:", error);
          setState((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        // Initialize OneSignal SDK
        await initOneSignal({ appId: data.appId });

        // If already subscribed, associate with user
        const subscribed = isOptedIn();
        if (subscribed) {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            // Login only after confirming subscription exists
            await loginUser(authData.user.id);
          }
        }

        setState({
          permission: Notification.permission,
          isSupported: true,
          isSubscribed: subscribed,
          isLoading: false,
          needsPWAInstall: false,
        });
      } catch (err) {
        console.error("[push] Init error:", err);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // 1. Request permission (via OneSignal — handles native prompt internally)
      const permission = await requestPushPermission();
      if (permission !== "granted") {
        setState((prev) => ({ ...prev, permission, isLoading: false }));
        return false;
      }

      // 2. Opt in (in case previously opted out)
      await optInPush();

      // 3. Wait for subscription to be created
      const subscriptionId = await waitForSubscription(10000);
      console.log("[push] Subscription after permission:", subscriptionId);

      // 4. Associate user AFTER subscription exists
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await loginUser(authData.user.id);
        await supabase
          .from("profiles")
          .update({ notifications_enabled: true })
          .eq("user_id", authData.user.id);
      }

      setState((prev) => ({
        ...prev,
        permission: "granted",
        isSubscribed: true,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      console.error("[push] Subscribe error:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [state.isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Opt out of push (actually stops notifications)
      await optOutPush();
      // Disassociate user
      await logoutUser();

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase
          .from("profiles")
          .update({ notifications_enabled: false })
          .eq("user_id", authData.user.id);
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));
      return true;
    } catch (err) {
      console.error("[push] Unsubscribe error:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
      return false;
    }
  }, []);

  const diagnostics = useCallback(() => getDiagnostics(), []);

  return { ...state, subscribe, unsubscribe, diagnostics };
};
