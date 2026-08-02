import { describe, it, expect } from "vitest";
import { detectInAppBrowser } from "@/lib/browserEnv";

// User-agents reais dos navegadores embutidos que mais aparecem no tráfego pago.
const UAS = {
  instagramIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 335.0.0.34.105 (iPhone14,5; iOS 17_5_1; pt_BR; pt-BR; scale=3.00; 1170x2532; 608092included)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.90 Mobile Safari/537.36 Instagram 325.0.0.35.91 Android",
  facebookIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone14,5;FBMD/iPhone;FBSN/iOS;FBSV/17.5;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5]",
  tiktokAndroid:
    "Mozilla/5.0 (Linux; Android 12; V2111 Build/SP1A.210812.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/107.0.5304.105 Mobile Safari/537.36 BytedanceWebview/d8a21c6",
  safariIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

describe("detectInAppBrowser", () => {
  it("detecta o navegador interno do Instagram (iOS e Android)", () => {
    expect(detectInAppBrowser(UAS.instagramIOS)).toBe("instagram");
    expect(detectInAppBrowser(UAS.instagramAndroid)).toBe("instagram");
  });

  it("detecta Facebook e TikTok", () => {
    expect(detectInAppBrowser(UAS.facebookIOS)).toBe("facebook");
    expect(detectInAppBrowser(UAS.tiktokAndroid)).toBe("tiktok");
  });

  it("não marca navegadores normais como in-app", () => {
    expect(detectInAppBrowser(UAS.safariIOS)).toBeNull();
    expect(detectInAppBrowser(UAS.chromeAndroid)).toBeNull();
    expect(detectInAppBrowser(UAS.chromeDesktop)).toBeNull();
  });

  it("trata user-agent vazio como navegador comum", () => {
    expect(detectInAppBrowser("")).toBeNull();
  });
});
