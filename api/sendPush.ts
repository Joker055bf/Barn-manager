import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      token,
    };

    const response = await getMessaging().send(message);
    res.status(200).json({ success: true, response });
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message', details: error.message });
  }
}
