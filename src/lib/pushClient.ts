import { urlBase64ToUint8Array } from "@/lib/utils";

export function isPushSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) await existing.unsubscribe();

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
  });
}

export function extractSubscriptionKeys(subscription: PushSubscription): { p256dh: string; auth: string } {
  const key = subscription.getKey("p256dh");
  const auth = subscription.getKey("auth");
  if (!key || !auth) throw new Error("missing_subscription_keys");

  const p256dh = btoa(String.fromCharCode(...new Uint8Array(key)));
  const authKey = btoa(String.fromCharCode(...new Uint8Array(auth)));

  return { p256dh, auth: authKey };
}

export function createLocalNotification(
  title: string,
  options?: NotificationOptions
): Notification | undefined {
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
}
