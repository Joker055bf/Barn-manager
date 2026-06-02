import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";
import { safeStorage } from "./utils/storage";

// Helper to construct configuration dynamically
const getFirebaseConfig = () => {
  let apiKey = "AIzaSyDN_EfGYKfKC7UKFnNkSN1X5Wy9CljQtpA";
  if (typeof window !== 'undefined') {
    try {
      const savedKey = safeStorage.getItem('rai_firebase_api_key');
      if (savedKey && savedKey.trim()) {
        apiKey = savedKey.trim();
      }
    } catch (e) {
      console.warn("Failed to retrieve custom firebase API key from safeStorage:", e);
    }
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
