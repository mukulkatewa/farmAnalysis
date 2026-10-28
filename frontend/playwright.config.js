import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./browser-tests',fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:5174',headless:true,viewport:{width:1440,height:1050},
    launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH},screenshot:'only-on-failure'},
  webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',url:'http://127.0.0.1:5174',reuseExistingServer:false,
    env:{VITE_USE_FIREBASE_EMULATORS:'true',VITE_FIREBASE_API_KEY:'demo-key',VITE_FIREBASE_PROJECT_ID:'demo-farm-analysis',VITE_FIREBASE_AUTH_DOMAIN:'demo-farm-analysis.firebaseapp.com',VITE_FIREBASE_APP_ID:'demo-app',VITE_OPENWEATHER_API_KEY:'',VITE_GOOGLE_MAPS_API_KEY:''}},
});
