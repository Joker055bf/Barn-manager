// Shared Firebase Admin setup for the Vercel functions. Files starting with "_" are not routes.
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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

export const adminReady = () => getApps().length > 0;

/** Every device token a user has registered (current list plus the older single field). */
export const userTokens = (data: any): string[] =>
  Array.from(new Set([...(Array.isArray(data?.fcmTokens) ? data.fcmTokens : []), data?.fcmToken].filter(Boolean)));

const DEAD_TOKEN = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

/** Error codes from the last sendToUser call per user, for diagnostics in API responses. */
export const lastSendErrors = new Map<string, string[]>();

/**
 * Sends one notification to all of a user's devices. Tokens Google reports as dead are removed
 * from the user doc so they are not retried. Returns how many devices accepted it.
 */
export async function sendToUser(userId: string, userData: any, msg: { title: string; body: string; tag?: string; link?: string }) {
  const tokens = userTokens(userData);
  if (tokens.length === 0) return 0;
  const notification = { title: msg.title.slice(0, 120), body: msg.body.slice(0, 500) };
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification,
    webpush: {
      headers: { Urgency: 'high', TTL: '43200' },
      notification: {
        ...notification, dir: 'rtl' as const, lang: 'ar',
        ...(msg.tag ? { tag: msg.tag, renotify: true } : {}),
        ...(process.env.APP_ICON_URL ? { icon: process.env.APP_ICON_URL } : {}),
      },
      ...(msg.link ? { fcmOptions: { link: msg.link } } : {}),
    },
    android: { priority: 'high' },
  });
  const errors = res.responses.filter(r => !r.success).map(r => `${r.error?.code}: ${r.error?.message}`.slice(0, 300));
  lastSendErrors.set(userId, errors);
  if (errors.length) console.warn('push failures for', userId, errors);
  const dead = tokens.filter((_, i) => !res.responses[i].success && DEAD_TOKEN.has(res.responses[i].error?.code || ''));
  if (dead.length) {
    const update: Record<string, unknown> = { fcmTokens: FieldValue.arrayRemove(...dead) };
    if (dead.includes(userData?.fcmToken)) update.fcmToken = FieldValue.delete();
    await getFirestore().collection('users').doc(userId).update(update).catch(e => console.warn('token cleanup failed', e));
  }
  return res.successCount;
}
