import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDN_EfGYKfKC7UKFnNkSN1X5Wy9CljQtpA",
  authDomain: "barn-manager-c311f.firebaseapp.com",
  projectId: "barn-manager-c311f",
  storageBucket: "barn-manager-c311f.firebasestorage.app",
  messagingSenderId: "703014749431",
  appId: "1:703014749431:web:dcd3c0827562b9d6e43ff2",
  measurementId: "G-NF8SX1XMRL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
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
