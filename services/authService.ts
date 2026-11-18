// Firebase Authentication layer.
//
// Accounts used to be checked in the browser against plaintext passwords stored on the
// `users` documents, which meant every visitor could read every password. Now every account
// has a Firebase Auth identity and the Firestore rules (firestore.rules) decide what it can touch.
//
// Collections this file maintains:
//   users/{userId}        profile; `authUid` + `authEmail` point at the Auth account. No password.
//   auth_links/{authUid}  { userId } so the rules can map request.auth.uid -> users doc.
//   usernames/{name}      { userId, authEmail } so a username can be turned into a sign-in email.
//
// Legacy accounts (plaintext `password`, no `authUid`) are migrated the first time they sign in.

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  verifyBeforeUpdateEmail,
  User as FirebaseUser,
  UserCredential,
  Auth,
} from 'firebase/auth';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, deleteField, query, where, limit,
} from 'firebase/firestore';
import { auth, db, getSecondaryAuth } from '../firebase';
import { User, WorkerPermissions, DEFAULT_WORKER_PERMISSIONS } from '../types';
import { generateId } from '../utils/animalHelpers';
import { tr } from '../constants/i18n';

// Workers (and owners without a usable email) get an address on this domain. Nothing is ever sent to it.
const SYNTHETIC_DOMAIN = 'accounts.rai-barn.app';

export const normalizeUsername = (u: string) => u.trim().toLowerCase();
const syntheticEmail = (userId: string, version?: number) =>
  `${userId}${version ? `.${version}` : ''}@${SYNTHETIC_DOMAIN}`.toLowerCase();
export const isSyntheticEmail = (email?: string | null) => !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_DOMAIN}`);
const looksLikeEmail = (s?: string) => !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

// Firebase requires 6+ characters but the app has always allowed 4, so the stored secret is prefixed.
// A password set through Firebase's own reset-email page is not prefixed, hence the raw fallback.
const pad = (pw: string) => `rai:${pw}`;
const isBadCredential = (e: any) =>
  ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']
    .includes(e?.code);

const signInFlexible = async (a: Auth, email: string, pw: string): Promise<UserCredential> => {
  try {
    return await signInWithEmailAndPassword(a, email, pad(pw));
  } catch (e: any) {
    if (pw.length >= 6 && isBadCredential(e)) return await signInWithEmailAndPassword(a, email, pw);
    throw e;
  }
};

export class AuthError extends Error {}

export const authErrorMessage = (e: any): string => {
  if (e instanceof AuthError) return e.message;
  switch (e?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return tr('اسم المستخدم أو كلمة المرور غير صحيحة');
    case 'auth/too-many-requests':
      return tr('محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.');
    case 'auth/network-request-failed':
      return tr('تعذر الاتصال بالإنترنت.');
    case 'auth/email-already-in-use':
      return tr('البريد الإلكتروني مستخدم في حساب آخر.');
    case 'auth/invalid-email':
      return tr('البريد الإلكتروني غير صالح.');
    case 'auth/operation-not-allowed':
      return tr('تسجيل الدخول بالبريد غير مفعّل في Firebase Console (Authentication → Sign-in method → Email/Password).');
    case 'auth/requires-recent-login':
      return tr('لأمان حسابك سجّل الخروج ثم الدخول مرة أخرى وأعد المحاولة.');
    case 'permission-denied':
      return tr('ليس لديك صلاحية لهذه العملية.');
    default:
      return e?.message || 'حدث خطأ غير متوقع';
  }
};

const ensureUsernameMapping = async (username: string, userId: string, authEmail: string) => {
  const name = normalizeUsername(username);
  if (!name) return;
  const ref = doc(db, 'usernames', name);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().userId !== userId) {
    // Two legacy accounts shared a username; the first to migrate keeps it.
    console.warn(`Username "${name}" already belongs to another account.`);
    return;
  }
  if (!snap.exists() || snap.data().authEmail !== authEmail) {
    await setDoc(ref, { userId, authEmail });
  }
};

// ---- Provisioning guard -------------------------------------------------------------------
// Creating or signing in an Auth account fires onAuthStateChanged before the auth_links/users
// writes that follow have landed. If the session listener resolved the profile then, it found no
// link, signed the user out, and the remaining writes failed (half-migrated accounts). While a
// login/registration is in flight the listener waits, and resolves once it is done.
let provisioning = 0;
const provisioningDone = new Set<() => void>();
export const isProvisioning = () => provisioning > 0;
export const onProvisioningDone = (fn: () => void) => {
  provisioningDone.add(fn);
  return () => { provisioningDone.delete(fn); };
};
const provision = async <T>(work: () => Promise<T>): Promise<T> => {
  provisioning++;
  try {
    return await work();
  } finally {
    provisioning--;
    if (provisioning === 0) provisioningDone.forEach(fn => fn());
  }
};

/**
 * Finishes an account whose migration stopped part-way: creates the missing auth_links entry,
 * removes the temporary legacyClaim (it held the old password) and the username mapping.
 */
const repairAccount = async (authUid: string, userId: string) => {
  const linkRef = doc(db, 'auth_links', authUid);
  if (!(await getDoc(linkRef)).exists()) await setDoc(linkRef, { userId });
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const data = snap.data();
  if ('legacyClaim' in data) {
    await updateDoc(userRef, { legacyClaim: deleteField() });
  }
  if (data.username && data.authEmail) {
    await ensureUsernameMapping(data.username, userId, data.authEmail).catch(e => console.warn('username mapping', e));
  }
};

/** Loads the profile behind a signed-in Auth account, repairing link/mapping/email drift. */
export const resolveSessionUser = async (fbUser: FirebaseUser): Promise<User | null> => {
  const linkSnap = await getDoc(doc(db, 'auth_links', fbUser.uid));
  if (!linkSnap.exists()) return null;
  const userId = linkSnap.data().userId as string;
  const userSnap = await getDoc(doc(db, 'users', userId));
  if (!userSnap.exists()) return null;
  const data = userSnap.data() as User;
  // A worker whose password the owner reset keeps an orphaned Auth account; it must not get in.
  if (data.authUid !== fbUser.uid) return null;

  // The owner confirmed a new email through verifyBeforeUpdateEmail: follow it.
  const email = fbUser.email?.toLowerCase();
  if (email && email !== data.authEmail) {
    await updateDoc(doc(db, 'users', userId), { authEmail: email });
    data.authEmail = email;
  }
  await ensureUsernameMapping(data.username, userId, data.authEmail!).catch(e => console.warn('username mapping', e));
  return { ...data, id: userId };
};

/** Signs a legacy account (plaintext password on its users doc) into a new Auth account. */
const migrateLegacyAccount = async (userId: string, data: any, password: string) => {
  const preferred = data.role === 'owner' && looksLikeEmail(data.email) ? data.email.trim().toLowerCase() : syntheticEmail(userId);
  const tryEmail = async (email: string): Promise<UserCredential> => {
    try {
      return await createUserWithEmailAndPassword(auth, email, pad(password));
    } catch (e: any) {
      if (e?.code !== 'auth/email-already-in-use') throw e;
      // A previous attempt may have created it already.
      return await signInFlexible(auth, email, password);
    }
  };

  let email = preferred;
  let cred: UserCredential;
  try {
    cred = await tryEmail(preferred);
  } catch (e: any) {
    if (preferred === syntheticEmail(userId)) throw e;
    // The owner's real email is taken by someone else: fall back to a private address.
    email = syntheticEmail(userId);
    cred = await tryEmail(email);
  }

  const ref = doc(db, 'users', userId);
  // The rules accept this claim only when legacyClaim equals the stored password.
  await updateDoc(ref, { authUid: cred.user.uid, authEmail: email, legacyClaim: password, password: deleteField() });
  await setDoc(doc(db, 'auth_links', cred.user.uid), { userId });
  await updateDoc(ref, { legacyClaim: deleteField() });
  await ensureUsernameMapping(data.username, userId, email).catch(e => console.warn('username mapping', e));
};

/** Username or email + password. Throws an AuthError / Firebase error on failure. */
export const loginWithCredentials = (identifier: string, password: string): Promise<void> =>
  provision(() => loginInner(identifier, password));

const loginInner = async (identifier: string, password: string): Promise<void> => {
  const id = identifier.trim();
  if (!id || !password) throw new AuthError(tr('يرجى إدخال اسم المستخدم وكلمة المرور'));

  if (id.includes('@')) {
    await signInFlexible(auth, id.toLowerCase(), password);
    return;
  }

  const name = normalizeUsername(id);
  const mapping = await getDoc(doc(db, 'usernames', name));
  if (mapping.exists()) {
    try {
      const cred = await signInFlexible(auth, mapping.data().authEmail, password);
      await repairAccount(cred.user.uid, mapping.data().userId);
      return;
    } catch (e) {
      if (!isBadCredential(e)) throw e;
      // Fall through: a not-yet-migrated account may share this username.
    }
  }

  // Legacy lookup. The rules only allow single-document username queries here.
  let legacy: { id: string; data: any } | null = null;
  for (const candidate of Array.from(new Set([id, name]))) {
    const snap = await getDocs(query(collection(db, 'users'), where('username', '==', candidate), limit(1)));
    if (!snap.empty) { legacy = { id: snap.docs[0].id, data: snap.docs[0].data() }; break; }
  }
  if (!legacy) throw new AuthError(tr('اسم المستخدم أو كلمة المرور غير صحيحة'));

  if (legacy.data.authEmail) {
    // Migrated, but possibly only part-way (no link / mapping yet): sign in and finish it.
    const cred = await signInFlexible(auth, legacy.data.authEmail, password);
    await repairAccount(cred.user.uid, legacy.id);
    return;
  }
  if (legacy.data.password !== password) throw new AuthError(tr('اسم المستخدم أو كلمة المرور غير صحيحة'));
  await migrateLegacyAccount(legacy.id, legacy.data, password);
};

export const registerOwner = (username: string, password: string, name: string, email: string) =>
  provision(() => registerOwnerInner(username, password, name, email));

const registerOwnerInner = async (username: string, password: string, name: string, email: string) => {
  const uname = normalizeUsername(username);
  if ((await getDoc(doc(db, 'usernames', uname))).exists()) throw new AuthError(tr('اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.'));
  const authEmail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, authEmail, pad(password));
  const userId = generateId();
  const newUser: User = {
    id: userId,
    ownerId: userId,
    name,
    username: uname,
    role: 'owner',
    createdAt: new Date().toISOString(),
    permissions: DEFAULT_WORKER_PERMISSIONS,
    email: authEmail,
    authUid: cred.user.uid,
    authEmail,
  };
  await setDoc(doc(db, 'users', userId), newUser);
  await setDoc(doc(db, 'auth_links', cred.user.uid), { userId });
  await setDoc(doc(db, 'usernames', uname), { userId, authEmail });
};

/** Creates an Auth account for someone else without touching the signed-in owner's session. */
const provisionAccount = async (email: string, password: string) => {
  const secondary = getSecondaryAuth();
  const cred = await createUserWithEmailAndPassword(secondary, email, pad(password));
  await signOut(secondary);
  return cred.user.uid;
};

export const createWorkerAccount = async (
  ownerId: string,
  fields: {
    username: string; password: string; name: string; permissions: WorkerPermissions; settingsPin: string;
    accessiblePens: string[]; avatar?: string; permissionsPerBarn?: { [barnId: string]: WorkerPermissions };
  }
) => {
  const uname = normalizeUsername(fields.username);
  if (!uname) throw new AuthError(tr('يرجى إدخال اسم المستخدم'));
  if ((await getDoc(doc(db, 'usernames', uname))).exists()) throw new AuthError(tr('اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.'));
  const workerId = generateId();
  const authEmail = syntheticEmail(workerId);
  const authUid = await provisionAccount(authEmail, fields.password);
  const worker: User = {
    id: workerId,
    ownerId,
    name: fields.name,
    username: uname,
    role: 'worker',
    permissions: fields.permissions,
    settingsPin: fields.settingsPin,
    accessiblePens: fields.accessiblePens,
    avatar: fields.avatar || '',
    permissionsPerBarn: fields.permissionsPerBarn || {},
    createdAt: new Date().toISOString(),
    authUid,
    authEmail,
  };
  await setDoc(doc(db, 'users', workerId), worker);
  await setDoc(doc(db, 'auth_links', authUid), { userId: workerId });
  await setDoc(doc(db, 'usernames', uname), { userId: workerId, authEmail });
};

/** Owner sets a new password for a worker. Without a server this means a fresh Auth account. */
export const resetWorkerPassword = async (worker: User, newPassword: string) => {
  const authEmail = syntheticEmail(worker.id, Date.now());
  const authUid = await provisionAccount(authEmail, newPassword);
  await updateDoc(doc(db, 'users', worker.id), { authUid, authEmail, password: deleteField() });
  await setDoc(doc(db, 'auth_links', authUid), { userId: worker.id });
  await setDoc(doc(db, 'usernames', normalizeUsername(worker.username)), { userId: worker.id, authEmail });
};

export const deleteWorkerAccount = async (worker: User) => {
  await deleteDoc(doc(db, 'users', worker.id));
  const ref = doc(db, 'usernames', normalizeUsername(worker.username));
  const snap = await getDoc(ref).catch(() => null);
  if (snap?.exists() && snap.data().userId === worker.id) await deleteDoc(ref);
};

export const verifyCurrentPassword = async (password: string): Promise<boolean> => {
  const fbUser = auth.currentUser;
  if (!fbUser?.email) return false;
  for (const secret of password.length >= 6 ? [pad(password), password] : [pad(password)]) {
    try {
      await reauthenticateWithCredential(fbUser, EmailAuthProvider.credential(fbUser.email, secret));
      return true;
    } catch (e) {
      if (!isBadCredential(e)) throw e;
    }
  }
  return false;
};

/** Call right after verifyCurrentPassword (Firebase wants a recent sign-in). */
export const changeOwnPassword = async (newPassword: string) => {
  if (!auth.currentUser) throw new AuthError(tr('يجب تسجيل الدخول'));
  await updatePassword(auth.currentUser, pad(newPassword));
};

export const changeUsername = async (user: User, newUsername: string) => {
  const next = normalizeUsername(newUsername);
  const prev = normalizeUsername(user.username);
  if (!next) throw new AuthError(tr('يرجى إدخال اسم المستخدم'));
  if (next === prev) return;
  if ((await getDoc(doc(db, 'usernames', next))).exists()) throw new AuthError(tr('اسم المستخدم مستخدم بالفعل. اختر اسماً آخر.'));
  await updateDoc(doc(db, 'users', user.id), { username: next });
  await setDoc(doc(db, 'usernames', next), { userId: user.id, authEmail: user.authEmail });
  const old = await getDoc(doc(db, 'usernames', prev)).catch(() => null);
  if (old?.exists() && old.data().userId === user.id) await deleteDoc(doc(db, 'usernames', prev));
};

/**
 * Owner changes the email on the profile. The sign-in email follows only after the owner clicks
 * the confirmation link Firebase sends; resolveSessionUser then syncs it.
 */
export const changeOwnerEmail = async (user: User, newEmail: string) => {
  const email = newEmail.trim().toLowerCase();
  if (!looksLikeEmail(email)) throw new AuthError(tr('البريد الإلكتروني غير صالح.'));
  await updateDoc(doc(db, 'users', user.id), { email });
  if (auth.currentUser && auth.currentUser.email?.toLowerCase() !== email) {
    await verifyBeforeUpdateEmail(auth.currentUser, email);
    return true; // confirmation email sent
  }
  return false;
};

export const sendOwnerPasswordReset = async (email: string) => {
  const e = email.trim().toLowerCase();
  if (!looksLikeEmail(e)) throw new AuthError(tr('يرجى إدخال بريد إلكتروني صحيح'));
  await sendPasswordResetEmail(auth, e);
};

export const logout = () => signOut(auth);
