// Platform detection helpers used across the app to choose between
// native Capacitor APIs and web fallbacks.
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
