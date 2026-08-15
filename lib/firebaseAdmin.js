import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";

function getServiceAccount() {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    return null;
  }

  try {
    if (rawKey.trim().startsWith("{")) {
      return JSON.parse(rawKey);
    }
    // Handle base64 encoded string if provided
    const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    return null;
  }
}

let adminApp = null;
let adminAuth = null;
let adminDb = null;

try {
  const serviceAccount = getServiceAccount();
  if (serviceAccount) {
    adminApp =
      getApps().length === 0
        ? initializeApp({
            credential: cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
          })
        : getApps()[0];

    adminAuth = getAuth(adminApp);
    adminDb = getDatabase(adminApp);
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error);
}

export { adminApp, adminAuth, adminDb };
