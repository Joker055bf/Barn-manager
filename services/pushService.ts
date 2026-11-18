import { arrayRemove, arrayUnion, deleteField, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { safeStorage } from '../utils/storage';
import type { PushKind } from '../utils/alertRules';

// The push endpoint lives on Vercel (api/sendPush.ts). GitHub Pages and the Android build have no
// /api, so set VITE_PUSH_API_URL in .env.local to the full Vercel URL, e.g.
//   VITE_PUSH_API_URL=https://<your-project>.vercel.app/api/sendPush
const PUSH_API_URL: string = (import.meta as any).env?.VITE_PUSH_API_URL || '/api/sendPush';

/**
 * Sends a push notification to another member of the same farm.
 * The server looks up the receiver's devices, checks the caller is in the same farm and honours
 * the receiver's notification settings for `kind`.
 */
export const sendPush = async (receiverId: string, title: string, body: string, kind?: PushKind): Promise<void> => {
  const fbUser = auth.currentUser;
  if (!fbUser) return;
  const idToken = await fbUser.getIdToken();
  const res = await fetch(PUSH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ receiverId, title, body, kind }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Push failed (${res.status}): ${detail}`);
  }
};

// ---- this device's token ------------------------------------------------------------------
// A user can enable notifications on several devices; each token is added to users/{id}.fcmTokens.
const DEVICE_TOKEN_KEY = 'rai_push_token';

export const saveDeviceToken = async (userId: string, token: string) => {
  const previous = safeStorage.getItem(DEVICE_TOKEN_KEY);
  const update: Record<string, unknown> = { fcmToken: token, fcmTokens: arrayUnion(token) };
  await updateDoc(doc(db, 'users', userId), update);
  if (previous && previous !== token) {
    // The browser rotated this device's token; drop the stale one.
    await updateDoc(doc(db, 'users', userId), { fcmTokens: arrayRemove(previous) }).catch(() => {});
  }
  safeStorage.setItem(DEVICE_TOKEN_KEY, token);
};

/** Call before signing out so this device stops receiving the account's notifications. */
export const removeDeviceToken = async (userId: string, currentSingleToken?: string) => {
  const token = safeStorage.getItem(DEVICE_TOKEN_KEY);
  safeStorage.removeItem(DEVICE_TOKEN_KEY);
  if (!token) return;
  const update: Record<string, unknown> = { fcmTokens: arrayRemove(token) };
  if (currentSingleToken === token) update.fcmToken = deleteField();
  await updateDoc(doc(db, 'users', userId), update).catch(e => console.warn('Removing device token failed:', e));
};

export const savePushPrefs = (userId: string, prefs: Partial<Record<PushKind, boolean>>) =>
  updateDoc(doc(db, 'users', userId), { pushPrefs: prefs });
