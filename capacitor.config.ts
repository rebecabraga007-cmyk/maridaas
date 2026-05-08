import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.healthmedia.maridas',
  appName: 'Maridaas',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
