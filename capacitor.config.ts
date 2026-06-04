import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.receitafitgen.app',
  appName: 'Receita Fit Gen',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
