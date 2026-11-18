import { useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';
import {
  loginWithCredentials, resolveSessionUser, logout as authLogout, isProvisioning, onProvisioningDone,
} from '../services/authService';
import { safeStorage } from '../utils/storage';

/**
 * The signed-in profile. It always comes from Firestore behind a Firebase Auth session,
 * never from localStorage, so editing browser storage cannot grant a role or permission.
 */
export function useAuthSession() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let triedLegacySession = false;
    let disposed = false;

    const handle = async (fbUser: FirebaseUser | null) => {
      if (disposed) return;
      try {
        if (fbUser) {
          const profile = await resolveSessionUser(fbUser);
          if (!profile) {
            await authLogout();
            return; // fires again with null
          }
          setCurrentUser(profile);
          safeStorage.removeItem('rai_session');
          setAuthReady(true);
          return;
        }

        // Sessions saved by the old client kept the password; use it once to migrate silently.
        if (!triedLegacySession) {
          triedLegacySession = true;
          const saved = safeStorage.getItem('rai_session');
          safeStorage.removeItem('rai_session');
          if (saved) {
            try {
              const legacy = JSON.parse(saved);
              if (legacy?.username && legacy?.password) {
                await loginWithCredentials(legacy.username, legacy.password);
                return; // fires again with the new user
              }
            } catch (e) {
              console.warn('Legacy session migration failed; showing login.', e);
            }
          }
        }
        setCurrentUser(null);
        setAuthReady(true);
      } catch (e) {
        console.error('Session restore failed:', e);
        setCurrentUser(null);
        setAuthReady(true);
      }
    };

    // While a login/registration is still writing auth_links/users, its sign-in event must not be
    // resolved yet (the link isn't there, which used to sign the user straight back out).
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!isProvisioning()) handle(fbUser);
    });
    const unsubDone = onProvisioningDone(() => handle(auth.currentUser));
    return () => { disposed = true; unsubAuth(); unsubDone(); };
  }, []);

  // Keep the profile live: permission or barn-access changes by the owner apply immediately,
  // and a deleted worker (or one whose password was reset) is signed out.
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.id), (snap) => {
      if (!snap.exists() || snap.data().authUid !== auth.currentUser?.uid) {
        authLogout();
        return;
      }
      setCurrentUser({ ...(snap.data() as User), id: snap.id });
    }, (err) => console.error('Profile sync error:', err));
    return () => unsub();
  }, [currentUser?.id]);

  return { currentUser, setCurrentUser, authReady };
}
