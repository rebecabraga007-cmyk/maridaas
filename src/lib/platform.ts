// Platform detection helpers used across the app to comply with
// Apple App Store guideline 3.1.1 (no external payment flows on iOS)
// and to choose between native Capacitor APIs and web fallbacks.
import { Capacitor } from "@capacitor/core";

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatform(): "ios" | "android" | "web" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
    return "web";
  } catch {
    return "web";
  }
}

export function isIOSNative(): boolean {
  return isNativePlatform() && getPlatform() === "ios";
}

export function isAndroidNative(): boolean {
  return isNativePlatform() && getPlatform() === "android";
}

/**
 * Apple Guideline 3.1.1: digital goods/subscriptions on iOS must use
 * In-App Purchase. Until StoreKit is wired up, we hide all external
 * checkout UI on iOS native builds.
 */
export function isPaymentsAllowed(): boolean {
  return !isIOSNative();
}
