/**
 * OneSignal Web SDK v16 wrapper
 * Idempotent initialization, race-condition safe, diagnostics-ready.
 */

let initPromise: Promise<void> | null = null;
let isInitialized = false;

interface OneSignalConfig {
  appId: string;
}

// Detect iOS/iPadOS
export const isIOSDevice = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent);

// Detect if running as installed PWA
export const isPWAInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (window.navigator as any).standalone === true;

// Detect if push is available on this platform
export const canUsePush = () => {
  if (isIOSDevice() && !isPWAInstalled()) return false;
  return "Notification" in window && "serviceWorker" in navigator;
};

function getOneSignal(): any {
  return (window as any).OneSignalDeferred || (window as any).OneSignal;
}

/**
 * Load OneSignal SDK script dynamically (only once)
 */
function loadSDKScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="OneSignalSDK"]')) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("onesignal_sdk_load_failed"));
    document.head.appendChild(script);
  });
}

/**
 * Initialize OneSignal SDK — idempotent, safe to call multiple times.
 */
export async function initOneSignal(config: OneSignalConfig): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log("[push] Loading OneSignal SDK...");
      await loadSDKScript();

      // Wait for SDK to be ready via OneSignalDeferred pattern
      await new Promise<void>((resolve) => {
        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
          await OneSignal.init({
            appId: config.appId,
            allowLocalhostAsSecureOrigin: true,
            serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/push/onesignal/" },
            notifyButton: { enable: false },
            promptOptions: { autoPrompt: false },
          });
          console.log("[push] OneSignal initialized successfully");
          resolve();
        });
      });

      isInitialized = true;
    } catch (err) {
      console.error("[push] OneSignal init failed:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Request push permission — must be called from user gesture.
 * Uses native Notification API first (Safari compatible), then OneSignal opt-in.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!canUsePush()) return "denied";

  // Use native API first for Safari/iOS compatibility
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;

  // Then opt-in via OneSignal
  try {
    const OS = getOneSignal();
    if (OS?.Notifications) {
      await OS.Notifications.requestPermission();
    }
  } catch (err) {
    console.warn("[push] OneSignal opt-in fallback:", err);
  }

  return permission;
}

/**
 * Associate push subscription with authenticated user
 */
export async function loginUser(userId: string): Promise<void> {
  try {
    const OS = getOneSignal();
    if (OS?.login) {
      await OS.login(userId);
      console.log("[push] User logged in:", userId);
    }
  } catch (err) {
    console.error("[push] Login failed:", err);
  }
}

/**
 * Disassociate push subscription from user
 */
export async function logoutUser(): Promise<void> {
  try {
    const OS = getOneSignal();
    if (OS?.logout) {
      await OS.logout();
      console.log("[push] User logged out from push");
    }
  } catch (err) {
    console.error("[push] Logout failed:", err);
  }
}

/**
 * Check if user is opted in to push
 */
export function isOptedIn(): boolean {
  try {
    const OS = getOneSignal();
    return OS?.Notifications?.permission === true || OS?.User?.PushSubscription?.optedIn === true;
  } catch {
    return false;
  }
}

/**
 * Get push subscription ID
 */
export function getSubscriptionId(): string | null {
  try {
    const OS = getOneSignal();
    return OS?.User?.PushSubscription?.id || null;
  } catch {
    return null;
  }
}

/**
 * Get full diagnostics for debugging
 */
export function getDiagnostics() {
  const OS = getOneSignal();
  return {
    sdkLoaded: !!OS,
    initialized: isInitialized,
    permission: "Notification" in window ? Notification.permission : "unsupported",
    optedIn: isOptedIn(),
    subscriptionId: getSubscriptionId(),
    isIOS: isIOSDevice(),
    isPWA: isPWAInstalled(),
    canUsePush: canUsePush(),
    serviceWorkerReady: "serviceWorker" in navigator,
  };
}
