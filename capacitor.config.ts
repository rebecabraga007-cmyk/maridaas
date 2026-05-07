import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maridas.app',
  appName: 'maridaas',
  webDir: 'dist',
  server: {
    url: 'https://ec743521-4cbf-4c3e-a2cd-e2adacbf5879.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
