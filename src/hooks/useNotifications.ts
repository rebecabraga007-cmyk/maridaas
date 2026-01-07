import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NotificationState {
  permission: NotificationPermission | "unsupported";
  isSupported: boolean;
}

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    permission: "default",
    isSupported: false
  });

  useEffect(() => {
    if ("Notification" in window) {
      setState({
        permission: Notification.permission,
        isSupported: true
      });
    } else {
      setState({
        permission: "unsupported",
        isSupported: false
      });
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!state.isSupported) {
      console.warn("Notifications not supported");
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));
      
      if (permission === "granted") {
        // Save notification preference to user profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ notifications_enabled: true })
            .eq("user_id", user.id);
        }
      }
      
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }, [state.isSupported]);

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (state.permission !== "granted") {
      console.warn("Notification permission not granted");
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: "/logo.png",
        badge: "/logo.png",
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    sendLocalNotification
  };
};
