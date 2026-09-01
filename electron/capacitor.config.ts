import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medrae.app',
  appName: 'Medrae-Nursing',
  webDir: 'dist',

  server: {
    url: 'https://medrae.vercel.app', // <--- Put your Vercel link here!
    cleartext: true
  }

};

export default config;