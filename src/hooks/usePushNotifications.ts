/**
 * Legacy push notifications hook — now delegates to OneSignal.
 * Kept for backward compatibility with existing consumers.
 */
import { useOneSignalPush } from "@/hooks/useOneSignalPush";

export const usePushNotifications = () => {
  const { subscribe, unsubscribe, isSubscribed, isLoading, permission, isSupported, needsPWAInstall } =
    useOneSignalPush();

  const sendLocalNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== "granted") return;
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
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    needsPWAInstall,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
};
