import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationState {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    permission: "default",
    isSupported: false,
  });

  useEffect(() => {
    if ("Notification" in window) {
      setState({
        permission: Notification.permission,
        isSupported: true,
      });
      return;
    }

    setState({
      permission: "unsupported",
      isSupported: false,
    });
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) return "denied";

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission === "granted") {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await supabase
            .from("profiles")
            .update({ notifications_enabled: true } as any)
            .eq("user_id", user.id);
        }
      }

      return permission;
    } catch {
      return "denied";
    }
  }, [state.isSupported]);

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
    requestPermission,
    sendLocalNotification,
  };
};
