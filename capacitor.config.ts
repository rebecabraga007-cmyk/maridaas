import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ec7435214cbf4c3ea2cde2adacbf5879',
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
