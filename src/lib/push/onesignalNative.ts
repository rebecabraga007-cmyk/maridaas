/**
 * OneSignal native (Capacitor iOS/Android) wrapper.
 * Uses `onesignal-cordova-plugin`. The plugin auto-registers via cordova_plugins
 * after `npx cap sync` and exposes a global JS API.
 *
 * APNs config: handled in OneSignal dashboard (.p8 key upload). No manual Xcode setup.
 */
import { isNativePlatform } from "@/lib/platform";

let initialized = false;

function getOneSignal(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).cordova?.plugins?.OneSignal ?? (window as any).OneSignal ?? null;
}

export async function initNative(appId: string): Promise<void> {
  if (!isNativePlatform()) return;
  if (initialized) return;

  // Wait for cordova `deviceready` so plugin is bound
  await new Promise<void>((resolve) => {
    if ((window as any).cordova) {
      document.addEventListener("deviceready", () => resolve(), { once: true });
      // If already ready, deviceready won't fire — fallback timeout
      setTimeout(() => resolve(), 1500);
    } else {
      setTimeout(() => resolve(), 500);
    }
  });

  const OneSignal = getOneSignal();
  if (!OneSignal) {
    console.warn("[push:native] OneSignal plugin not available");
    return;
  }

  try {
    OneSignal.initialize(appId);
    initialized = true;
    console.log("[push:native] Initialized with appId", appId);
  } catch (err) {
    console.error("[push:native] init error", err);
  }
}

export async function requestNativePermission(): Promise<NotificationPermission> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return "denied";
  try {
    const granted: boolean = await OneSignal.Notifications.requestPermission(true);
    return granted ? "granted" : "denied";
  } catch (err) {
    console.error("[push:native] requestPermission error", err);
    return "denied";
  }
}

export async function hasNativePermission(): Promise<boolean> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return false;
  try {
    return await OneSignal.Notifications.getPermissionAsync();
  } catch {
    return false;
  }
}

export async function loginNative(userId: string): Promise<void> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  try {
    OneSignal.login(userId);
  } catch (err) {
    console.error("[push:native] login error", err);
  }
}

export async function logoutNative(): Promise<void> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  try {
    OneSignal.logout();
  } catch (err) {
    console.error("[push:native] logout error", err);
  }
}

export async function optInNative(): Promise<void> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  try {
    OneSignal.User.pushSubscription.optIn();
  } catch (err) {
    console.error("[push:native] optIn error", err);
  }
}

export async function optOutNative(): Promise<void> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return;
  try {
    OneSignal.User.pushSubscription.optOut();
  } catch (err) {
    console.error("[push:native] optOut error", err);
  }
}

export async function isOptedInNative(): Promise<boolean> {
  const OneSignal = getOneSignal();
  if (!OneSignal) return false;
  try {
    return await OneSignal.User.pushSubscription.getOptedInAsync();
  } catch {
    return false;
  }
}
