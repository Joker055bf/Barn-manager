import { auth } from '../firebase';

// The push endpoint lives on Vercel (api/sendPush.ts). GitHub Pages and the Android build have no
// /api, so set VITE_PUSH_API_URL in .env.local to the full Vercel URL, e.g.
//   VITE_PUSH_API_URL=https://<your-project>.vercel.app/api/sendPush
const PUSH_API_URL: string = (import.meta as any).env?.VITE_PUSH_API_URL || '/api/sendPush';

/**
 * Sends a push notification to another member of the same farm.
 * The server looks up the receiver's device token and checks the caller is in the same farm,
 * so device tokens never have to be handed around by the client.
 */
export const sendPush = async (receiverId: string, title: string, body: string): Promise<void> => {
  const fbUser = auth.currentUser;
  if (!fbUser) return;
  const idToken = await fbUser.getIdToken();
  const res = await fetch(PUSH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ receiverId, title, body }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Push failed (${res.status}): ${detail}`);
  }
};
