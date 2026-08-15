import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  onDisconnect,
  push,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL?.trim();
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();

const isFirebaseConfigured = Boolean(apiKey && (databaseURL || projectId));

const firebaseConfig = {
  apiKey,
  authDomain,
  ...(databaseURL ? { databaseURL } : {}),
  projectId,
};

function getFirebaseClientApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = getFirebaseClientApp();
    db = databaseURL ? getDatabase(app, databaseURL) : getDatabase(app);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase client initialization error:", error);
  }
} else if (typeof window !== "undefined") {
  console.warn(
    "[Firebase] Missing NEXT_PUBLIC_FIREBASE_* environment variables. Realtime database and auth features are disabled."
  );
}

export async function ensureFirebaseAuth() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.error("Auto anonymous sign-in failed:", err);
    throw new Error(`Firebase Auth Error: ${err.message || err.code}`);
  }
}

export { app, db, auth };
export {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  off,
  onDisconnect,
  push,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
};
export { signInAnonymously, signInWithCustomToken, signOut, onAuthStateChanged };
