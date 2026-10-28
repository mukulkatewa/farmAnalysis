import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(
  varName => !import.meta.env[varName]
);

if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars);
  console.error('Please create a .env file in the frontend directory with the required Firebase configuration.');
  console.error('See .env.example for reference.');
}

// Initialize Firebase
let app;
let auth;
let db;
let rtdb;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  if(import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});
    connectFirestoreEmulator(db,'127.0.0.1',8680);
  }
  rtdb = getDatabase(app);

  // Set error handling for auth
  auth.onAuthStateChanged(() => {
    // AuthProvider handles account changes. Do not log account details here.
  }, (error) => {
    console.error('Firebase Auth Error:', error);
    // Don't show error if it's just a network issue or API key validation
    if (error.code !== 'auth/network-request-failed' && error.code !== 'auth/api-key-not-valid') {
      console.error('Error details:', error.message);
    }
  });

} catch (error) {
  console.error('Firebase initialization error:', error);
  console.error('Please check your Firebase configuration in .env file');
}

export { app, auth, db, rtdb };
