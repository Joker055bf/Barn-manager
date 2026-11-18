import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const parsePrivateKey = (key: string | undefined): string | undefined => {
  if (!key) return undefined;
  
  let formatted = key.trim();

  // 1. Check if the user pasted the entire Service Account JSON by mistake
  if (formatted.startsWith('{') && formatted.endsWith('}')) {
    try {
      const obj = JSON.parse(formatted);
      if (obj.private_key) {
        return parsePrivateKey(obj.private_key);
      }
      if (obj.privateKey) {
        return parsePrivateKey(obj.privateKey);
      }
    } catch (e) {
      // Ignore JSON parse error and fall through
    }
  }

  // 2. Remove surrounding quotes (both double, single, and backticks) recursively
  let changed = true;
  while (changed) {
    changed = false;
    formatted = formatted.trim();
    if (
      (formatted.startsWith('"') && formatted.endsWith('"')) ||
      (formatted.startsWith("'") && formatted.endsWith("'")) ||
      (formatted.startsWith("`") && formatted.endsWith("`"))
    ) {
      formatted = formatted.slice(1, -1);
      changed = true;
    }
  }
  
  formatted = formatted.trim();

  // 3. Replace escaped newlines with actual newlines
  formatted = formatted.replace(/\\n/g, '\n');
  formatted = formatted.replace(/\\r/g, '\r');
  
  // 4. Ensure it has the correct PEM header and footer
  if (formatted && !formatted.includes('-----BEGIN PRIVATE KEY-----')) {
    formatted = '-----BEGIN PRIVATE KEY-----\n' + formatted;
  }
  if (formatted && !formatted.includes('-----END PRIVATE KEY-----')) {
    formatted = formatted + '\n-----END PRIVATE KEY-----';
  }

  return formatted;
};

if (!getApps().length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    console.log('Firebase env check:', {
      hasProjectId: !!projectId,
      projectIdPrefix: projectId ? `${projectId.substring(0, 6)}...` : 'undefined',
      hasClientEmail: !!clientEmail,
      clientEmailPrefix: clientEmail ? `${clientEmail.substring(0, 6)}...` : 'undefined',
      hasPrivateKey: !!rawPrivateKey,
      rawPrivateKeyLength: rawPrivateKey ? rawPrivateKey.length : 0,
      rawPrivateKeyPrefix: rawPrivateKey ? `${rawPrivateKey.trim().substring(0, 25)}...` : 'undefined',
    });

    const privateKey = parsePrivateKey(rawPrivateKey);

    console.log('Parsed private key check:', {
      hasPrivateKey: !!privateKey,
      privateKeyLength: privateKey ? privateKey.length : 0,
      startsWithHeader: privateKey ? privateKey.startsWith('-----BEGIN PRIVATE KEY-----') : false,
      endsWithFooter: privateKey ? privateKey.endsWith('-----END PRIVATE KEY-----') : false,
    });

    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      }),
    });
    console.log('Firebase Admin SDK initialized successfully!');
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.stack || error.message || error);
  }
}

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
  if (!getApps().length) {
    return res.status(500).json({
      error: 'Firebase Admin SDK not initialized',
      details: 'Missing or invalid FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY environment variables.'
    });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!idToken) return res.status(401).json({ error: 'Missing Authorization bearer token' });

  const { receiverId, title, body } = req.body || {};
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
    if (!receiver.fcmToken) return res.status(409).json({ error: 'Receiver has no registered device' });

    const notification = { title: clip(title, 120), body: clip(body, 500) };
    const response = await getMessaging().send({
      token: receiver.fcmToken,
      notification,
      webpush: {
        // Web push needs an absolute icon URL; set APP_ICON_URL on Vercel (e.g. https://<site>/icons/icon-192.png).
        notification: { ...notification, dir: 'rtl' as const, ...(process.env.APP_ICON_URL ? { icon: process.env.APP_ICON_URL } : {}) },
      },
      android: { priority: 'high' },
    });
    res.status(200).json({ success: true, response });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
}
