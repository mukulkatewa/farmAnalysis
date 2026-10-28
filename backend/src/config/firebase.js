import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import "dotenv/config";
const credentials = process.env.FIREBASE_PRIVATE_KEY
  ? cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    })
  : applicationDefault();
const app =
  getApps()[0] ||
  initializeApp({
    credential: credentials,
    ...(process.env.FIREBASE_PROJECT_ID
      ? {
          projectId: process.env.FIREBASE_PROJECT_ID,
          databaseURL:
            process.env.FIREBASE_DATABASE_URL ||
            `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
        }
      : {}),
  });
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
