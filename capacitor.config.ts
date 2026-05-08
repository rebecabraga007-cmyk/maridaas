import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.maridas.app',
  appName: 'maridaas',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
