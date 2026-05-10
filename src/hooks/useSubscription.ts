import { useCallback, useMemo } from "react";
import { isIOSNative, isPaymentsAllowed } from "@/lib/platform";

/**
 * Centralized subscription / premium gating.
 *
 * Apple Guideline 3.1.1 compliance:
 *  - On iOS native builds we MUST NOT redirect to external checkout.
 *  - Until StoreKit (in-app purchase) is wired up, we keep premium
 *    features unlocked on iOS so reviewers can exercise the app.
 *  - Any UI that triggers external payment flows must be hidden when
 *    `canShowUpgradeUI === false`.
 */
export function useSubscription() {
  const canShowUpgradeUI = useMemo(() => isPaymentsAllowed(), []);
  // Temporary policy: iOS users get premium-equivalent access until
  // StoreKit is integrated. Web/Android continue to use the existing
  // Stripe-powered flow handled elsewhere.
  const isPremium = useMemo(() => isIOSNative(), []);

  const startCheckout = useCallback(async () => {
    if (isIOSNative()) {
      // Hard guard: never open external payment URLs on iOS.
      throw new Error(
        "External checkout is disabled on iOS. Use in-app purchase instead."
      );
    }
    // Web/Android: caller should perform the existing Stripe redirect.
    // This hook intentionally does not import Stripe code so it stays
    // safe to call from any platform.
    return { redirect: true } as const;
  }, []);

  // Stub kept here so future StoreKit work has an obvious entry point.
  const purchaseIOS = useCallback(async () => {
    throw new Error("StoreKit purchase not yet implemented.");
  }, []);

  return { canShowUpgradeUI, isPremium, startCheckout, purchaseIOS };
}
