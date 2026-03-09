/**
 * OneSignal Web SDK v16 wrapper
 * Idempotent initialization, race-condition safe, diagnostics-ready.
 *
 * AUDIT FIXES:
 * - getOneSignal() now returns window.OneSignal (SDK object), not the deferred array
 * - Service worker scope set to "/" for site-wide push control
 * - Removed double permission request (native + OneSignal) — only OneSignal handles it
 * - Added subscription polling with timeout
 * - unsubscribe properly opts out via PushSubscription.optOut()
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

/**
 * Get the initialized OneSignal SDK object.
 * IMPORTANT: window.OneSignal is the SDK after init.
 * window.OneSignalDeferred is the init queue array — NOT the SDK.
 */
function getOneSignal(): any {
  const os = (window as any).OneSignal;
  // OneSignalDeferred is an array, the real SDK is an object with .Notifications etc.
  if (os && typeof os === "object" && !Array.isArray(os)) {
    return os;
  }
  return null;
}

/**
 * Load OneSignal SDK script dynamically (only once)
 */
function loadSDKScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="OneSignalSDK.page"]')) {
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
 * Sleep utility for polling
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("onesignal_init_timeout")), 15000);

        (window as any).OneSignalDeferred = (window as any).OneSignalDeferred || [];
        (window as any).OneSignalDeferred.push(async (OneSignal: any) => {
          try {
            await OneSignal.init({
              appId: config.appId,
              allowLocalhostAsSecureOrigin: true,
              serviceWorkerPath: "/push/onesignal/OneSignalSDKWorker.js",
              serviceWorkerParam: { scope: "/" },
              notifyButton: { enable: false },
              promptOptions: { autoPrompt: false },
            });
            clearTimeout(timeout);
            console.log("[push] OneSignal initialized successfully");
            resolve();
          } catch (err) {
            clearTimeout(timeout);
            reject(err);
          }
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
 * Uses OneSignal's Notifications.requestPermission() which handles
 * the native prompt internally. Do NOT call Notification.requestPermission()
 * separately — it breaks Safari and iOS PWA.
 */
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!canUsePush()) return "denied";

  try {
    const OS = getOneSignal();
    if (OS?.Notifications?.requestPermission) {
      await OS.Notifications.requestPermission();
    } else {
      // Fallback: native API only if OneSignal not ready
      console.warn("[push] OneSignal not ready, using native permission request");
      await Notification.requestPermission();
    }
  } catch (err) {
    console.error("[push] Permission request failed:", err);
  }

  return "Notification" in window ? Notification.permission : "denied";
}

/**
 * Wait for push subscription to be created (polling with timeout).
 * After permission is granted, OneSignal takes a moment to create the subscription.
 */
export async function waitForSubscription(maxWaitMs = 10000): Promise<string | null> {
  const maxAttempts = Math.ceil(maxWaitMs / 500);
  for (let i = 0; i < maxAttempts; i++) {
    const id = getSubscriptionId();
    if (id) {
      console.log("[push] Subscription ready:", id);
      return id;
    }
    await sleep(500);
  }
  console.warn("[push] Subscription not ready after", maxWaitMs, "ms");
  return null;
}

/**
 * Associate push subscription with authenticated user.
 * IMPORTANT: Call AFTER subscription exists (use waitForSubscription first).
 */
export async function loginUser(userId: string): Promise<void> {
  try {
    const OS = getOneSignal();
    if (OS?.login) {
      await OS.login(userId);
      console.log("[push] User logged in:", userId);
    } else {
      console.warn("[push] OneSignal SDK not ready for login");
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
 * Opt out of push notifications (removes subscription).
 * This is different from logout — it actually disables push delivery.
 */
export async function optOutPush(): Promise<void> {
  try {
    const OS = getOneSignal();
    if (OS?.User?.PushSubscription?.optOut) {
      await OS.User.PushSubscription.optOut();
      console.log("[push] User opted out of push");
    }
  } catch (err) {
    console.error("[push] Opt-out failed:", err);
  }
}

/**
 * Opt back in to push notifications.
 */
export async function optInPush(): Promise<void> {
  try {
    const OS = getOneSignal();
    if (OS?.User?.PushSubscription?.optIn) {
      await OS.User.PushSubscription.optIn();
      console.log("[push] User opted in to push");
    }
  } catch (err) {
    console.error("[push] Opt-in failed:", err);
  }
}

/**
 * Check if user is opted in to push
 */
export function isOptedIn(): boolean {
  try {
    const OS = getOneSignal();
    if (!OS) return false;
    // Check PushSubscription.optedIn first (most reliable)
    if (OS.User?.PushSubscription?.optedIn === true) return true;
    if (OS.User?.PushSubscription?.optedIn === false) return false;
    // Fallback to permission check
    return OS.Notifications?.permission === true;
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
