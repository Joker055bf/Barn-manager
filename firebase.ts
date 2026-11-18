import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { safeStorage } from "./utils/storage";

// Helper to construct configuration dynamically
const getFirebaseConfig = () => {
  const apiKey = "AIzaSyDN_EfGYKfKC7UKFnNkSN1X5Wy9CljQtpA";
  if (typeof window !== 'undefined') {
    // Older versions let the owner override the API key from Settings; that option is gone,
    // so drop any key a device still has saved.
    try {
      safeStorage.removeItem('rai_firebase_api_key');
      safeStorage.removeItem('rai_vapid_key');
    } catch { /* ignore */ }
  }
  return {
    apiKey: apiKey,
    authDomain: "barn-manager-c311f.firebaseapp.com",
    projectId: "barn-manager-c311f",
    storageBucket: "barn-manager-c311f.firebasestorage.app",
    messagingSenderId: "703014749431",
    appId: "1:703014749431:web:dcd3c0827562b9d6e43ff2",
    measurementId: "G-NF8SX1XMRL"
  };
};

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

// A second app instance lets the owner create a worker's Auth account without being signed out.
export const getSecondaryAuth = () => {
  const name = 'worker-provisioning';
  const secondary = getApps().find(a => a.name === name) || initializeApp(firebaseConfig, name);
  return getAuth(secondary);
};

let analyticsInstance = null;
if (typeof window !== 'undefined') {
  try {
    analyticsInstance = getAnalytics(app);
  } catch (e) {
    console.warn("Firebase Analytics not initialized or not supported:", e);
  }
}
export const analytics = analyticsInstance;

export const getFirebaseMessaging = async () => {
  if (typeof window !== 'undefined') {
    try {
      const { isSupported, getMessaging } = await import("firebase/messaging");
      const supported = await isSupported();
      if (supported) {
        return getMessaging(app);
      }
    } catch (e) {
      console.warn("Firebase Messaging not supported:", e);
    }
  }
  return null;
};
