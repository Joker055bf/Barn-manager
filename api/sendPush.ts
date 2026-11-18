import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminReady, sendToUser } from './_firebaseAdmin';
import { pushKindEnabled, PushKind } from '../utils/alertRules';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Resolves the Firebase Auth caller to their users doc (same mapping the Firestore rules use).
const resolveCaller = async (idToken: string) => {
  const decoded = await getAuth().verifyIdToken(idToken);
  const db = getFirestore();
  const link = await db.collection('auth_links').doc(decoded.uid).get();
  if (!link.exists) return null;
  const userId = link.data()!.userId as string;
  const user = await db.collection('users').doc(userId).get();
  if (!user.exists || user.data()!.authUid !== decoded.uid) return null;
  const data = user.data()!;
  return { userId, farmId: data.role === 'owner' ? userId : data.ownerId as string };
};

const clip = (v: unknown, max: number) => String(v ?? '').slice(0, max);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Callers authenticate with a Firebase ID token, so any origin (GitHub Pages, Android) may call.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!adminReady()) {
    return res.status(500).json({
      error: 'Firebase Admin SDK not initialized',
      details: 'Missing or invalid FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY environment variables.'
    });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return res.status(401).json({ error: 'Missing Authorization bearer token' });

  const { receiverId, title, body, kind } = req.body || {};
  if (!receiverId || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const caller = await resolveCaller(idToken).catch(() => null);
    if (!caller) return res.status(401).json({ error: 'Invalid session' });

    const receiverSnap = await getFirestore().collection('users').doc(String(receiverId)).get();
    if (!receiverSnap.exists) return res.status(404).json({ error: 'Receiver not found' });
    const receiver = receiverSnap.data()!;
    const receiverFarm = receiver.role === 'owner' ? receiverSnap.id : receiver.ownerId;
    if (receiverFarm !== caller.farmId) return res.status(403).json({ error: 'Receiver is not in your farm' });
    // The receiver can switch kinds off in Settings (chat messages, worker actions).
    if (kind && !pushKindEnabled(receiver.pushPrefs, kind as PushKind)) {
      return res.status(200).json({ success: true, skipped: 'disabled by receiver' });
    }
    const delivered = await sendToUser(receiverSnap.id, receiver, {
      title: clip(title, 120), body: clip(body, 500), tag: kind ? `${kind}-${caller.farmId}` : undefined,
    });
    if (delivered === 0) return res.status(409).json({ error: 'Receiver has no registered device' });
    res.status(200).json({ success: true, delivered });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
}
