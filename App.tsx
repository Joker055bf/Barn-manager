import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, MoreVertical, LayoutGrid, Calendar, ChevronLeft, ArrowRight, Star, Dna, Settings, Check, X, Filter, Target,
  Warehouse, Wheat, ShieldCheck, Activity, Wallet, Eye, Edit, Trash2, Syringe, ArrowRightLeft, Skull, FileText, LayoutDashboard, MoreHorizontal, LogOut, Users, Shield, History, Share2, Banknote, BarChart3, Baby, HeartPulse, MessageCircle, ArrowUp, ArrowDown
} from 'lucide-react';
import { ChatModal } from './components/ChatModal';
import { PenModal } from './components/PenModal';
import { SheepModal } from './components/SheepModal';
import { MoveSheepModal } from './components/MoveSheepModal';
import { MedicalModal } from './components/MedicalModal';
import { VaccinationGuide } from './components/VaccinationGuide';
import { ProductionStats } from './components/ProductionStats';
import { ReorderPensModal } from './components/ReorderPensModal';
import { FeedManager } from './components/FeedManager';
import { FinanceManager } from './components/FinanceManager';
import { SheepStatsModal } from './components/SheepStatsModal';
import { ReportsModal } from './components/ReportsModal';
import { SettingsModal } from './components/SettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { WorkerManageModal } from './components/WorkerManageModal';
import { SwipeableBarnCard } from './components/SwipeableBarnCard';
import { DeathsModal } from './components/DeathsModal';
import { Pen, MedicalRecord, FeedItem, FeedLogEntry, Sheep, SheepType, ChatMessage, Expense, Sale, Death, User, WorkerPermissions, ActivityEntry, DEFAULT_WORKER_PERMISSIONS } from './types';
import CustomAlert, { AlertType } from './components/CustomAlert';
import { ReportType } from './components/ReportsModal';
import { getAnimalMetadata, calculateVaccineDueDate, getAnimalAgeLabel, generateId } from './utils/animalHelpers';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const colorNames: { [key: string]: string } = {
  '#EF4444': 'أحمر',
  '#F59E0B': 'برتقالي',
  '#10B981': 'أخضر',
  '#3B82F6': 'أزرق',
  '#6366F1': 'نيلي',
  '#8B5CF6': 'بنفسجي',
  '#EC4899': 'وردي',
  '#FACC15': 'أصفر'
};
import { translations } from './constants/translations';
import { shareFile } from './utils/shareUtils';
import { db, getFirebaseMessaging } from './firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import { safeStorage } from './utils/storage';

// ────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pens' | 'sheepList' | 'vaccines' | 'feed' | 'expenses'>('pens');

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = safeStorage.getItem('rai_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to parse rai_session from safeStorage:", e);
      return null;
    }
  });

  const [users, setUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Sync custom Firebase API Key & VAPID Key between database and local browser storage (for owner and workers)
  useEffect(() => {
    if (!currentUser) return;
    
    // Find the owner user to read the configuration from
    const ownerUser = currentUser.role === 'owner' 
      ? currentUser 
      : users.find(u => u.role === 'owner');
      
    if (!ownerUser) return;
    
    const localApiKey = safeStorage.getItem('rai_firebase_api_key') || '';
    const remoteApiKey = ownerUser.firebaseApiKey || '';
    
    const localVapidKey = safeStorage.getItem('rai_vapid_key') || '';
    const remoteVapidKey = ownerUser.vapidKey || '';
    
    let needsReload = false;
    
    if (remoteApiKey !== localApiKey) {
      if (remoteApiKey) {
        safeStorage.setItem('rai_firebase_api_key', remoteApiKey);
      } else {
        safeStorage.removeItem('rai_firebase_api_key');
      }
      needsReload = true;
    }
    
    if (remoteVapidKey !== localVapidKey) {
      if (remoteVapidKey) {
        safeStorage.setItem('rai_vapid_key', remoteVapidKey);
      } else {
        safeStorage.removeItem('rai_vapid_key');
      }
    }
    
    if (needsReload) {
      console.log('Firebase API Key updated from owner Firestore record, reloading page to apply...');
      window.location.reload();
    }
  }, [currentUser, users]);

  const isOwner = currentUser?.role === 'owner';
  const ownerId = isOwner ? currentUser?.id : currentUser?.ownerId;
  
  const can = (permission: keyof WorkerPermissions, specificPenId?: string | null) => {
    if (isOwner) return true;
    if (!currentUser) return false;
    let targetBarnId = specificPenId || selectedGroupId;
    if (targetBarnId && targetBarnId.startsWith('mortality:')) {
      targetBarnId = targetBarnId.replace('mortality:', '');
    }
    if (targetBarnId) {
      const p = pens.find(x => x.id === targetBarnId);
      if (p && p.parentId) targetBarnId = p.parentId;
    }
    if (targetBarnId && currentUser.permissionsPerBarn?.[targetBarnId]) {
      return currentUser.permissionsPerBarn[targetBarnId][permission];
    }
    return currentUser.permissions?.[permission] ?? DEFAULT_WORKER_PERMISSIONS[permission];
  };

  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  const logActivity = async (action: string, detail: string, serialNumber?: string, tagColor?: string, changes?: string[]) => {
    if (!currentUser || !ownerId) return;
    const entry: ActivityEntry = JSON.parse(JSON.stringify({
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      detail,
      timestamp: new Date().toISOString(),
      serialNumber: serialNumber || null,
      tagColor: tagColor || null,
      changes: changes || null
    }));
    try {
      await addDoc(collection(db, 'farms', ownerId, 'activity'), entry);
    } catch (e) {
      console.error("Error logging activity: ", e);
    }
  };

  
  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: () => { }
  });

  const showAlert = (type: AlertType, title: string, message: string | React.ReactNode, onConfirm?: () => void) => {
    setAlertConfig({
      isOpen: true,
      type,
      title,
      message,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const showConfirm = (title: string, message: string | React.ReactNode, onConfirm: () => void, onCancel?: () => void) => {
    setAlertConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmLabel: 'نعم، متأكد',
      cancelLabel: 'تراجع',
      onConfirm: () => {
        onConfirm();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setAlertConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };
  const handleUpdateProfile = async (name: string, username?: string, password?: string, email?: string, vapidKey?: string, firebaseApiKey?: string) => {
    if (!currentUser) return;
    await handleUpdateUser(currentUser.id, { name, username, password, email, vapidKey, firebaseApiKey });
    if (name) setOwnerName(name);
  };

  const handleTestNotifications = async () => {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        // 1. Add listeners first to guarantee we catch the registration event
        await PushNotifications.addListener('registration', async (token) => {
          console.log('FCM Token الموحد للجهاز:', token.value);
          
          if (currentUser) {
            await updateDoc(doc(db, 'users', currentUser.id), { 
              fcmToken: token.value,
              platform: Capacitor.getPlatform(),
              updatedAt: new Date().toISOString()
            });
            setCurrentUser(prev => prev ? { ...prev, fcmToken: token.value } : null);
            const saved = safeStorage.getItem('rai_session');
            if (saved) {
              const session = JSON.parse(saved);
              session.fcmToken = token.value;
              safeStorage.setItem('rai_session', JSON.stringify(session));
            }
          }

          // Trigger a test push notification
          try {
            await fetch('/api/sendPush', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: token.value,
                title: 'تطبيق راعي 🐑',
                body: 'رائع جداً! تم تنشيط واختبار نظام إشعارات البث الهاتفي لجهازك بنجاح 100%!'
              })
            });
          } catch (pushErr) {
            console.error('Failed to send test push to native device:', pushErr);
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM Native Registration Error:', err);
          showAlert('error', 'فشل التسجيل في النظام', 'تعذر تسجيل جهازك لتلقي التنبيهات: ' + (err.error || 'خطأ غير معروف'));
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('تم استقبال إشعار والتطبيق مفتوح:', notification);
          showAlert('success', notification.title || 'تنبيه جديد', notification.body || '');
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('المستخدم ضغط على الإشعار خارج التطبيق:', action.notification);
        });

        // 2. Request Permissions
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
          showAlert('error', 'الصلاحية مطلوبة', 'يرجى تفعيل صلاحية الإشعارات من إعدادات النظام لتلقي التنبيهات.');
          return;
        }

        // 3. Register device
        await PushNotifications.register();
        showAlert('success', 'تم تفعيل التنبيهات', 'جهازك الآن جاهز لاستقبال الإشعارات خارج التطبيق تماماً مثل الواتساب. تم طلب إرسال تنبيه تجريبي!');

      } else {
        // Web Platform (Web Push Notifications)
        if (typeof Notification === 'undefined') {
          showAlert('error', 'غير مدعوم', 'هذا المتصفح أو بيئة التشغيل لا تدعم الإشعارات الفورية.');
          return;
        }
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showAlert('warning', 'الصلاحية مطلوبة', 'يرجى منح صلاحية الإشعارات من إعدادات المتصفح أو الهاتف لتشغيل الخدمة.');
          return;
        }

        showAlert('warning', 'جاري التفعيل', 'جاري تسجيل الخدمة وجلب رمز التنبيهات الآمن...');

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          showAlert('error', 'خطأ في الخدمة', 'فشل تهيئة نظام التنبيهات Firebase Cloud Messaging.');
          return;
        }

        if (!('serviceWorker' in navigator)) {
          showAlert('error', 'غير مدعوم', 'متصفحك لا يدعم تقنية Service Worker لتشغيل الإشعارات الخلفية.');
          return;
        }

        // Explicitly register /firebase-messaging-sw.js with explicit scope to be 100% reliable
        const swUrl = '/firebase-messaging-sw.js';

        const registration = await navigator.serviceWorker.register(swUrl, {
          scope: '/'
        });
        console.log('FCM Service Worker registered smoothly:', registration);

        // الانتظار حتى يتفعل في خلفية المتصفح بالكامل
        const serviceWorker = registration.installing || registration.waiting || registration.active;
        if (serviceWorker && serviceWorker.state !== 'activated') {
          await new Promise<void>((resolve) => {
            const stateChangeHandler = () => {
              if (serviceWorker.state === 'activated') {
                serviceWorker.removeEventListener('statechange', stateChangeHandler);
                resolve();
              }
            };
            serviceWorker.addEventListener('statechange', stateChangeHandler);
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const { getToken } = await import('firebase/messaging');
        
        const vapidKey = currentUser?.vapidKey || safeStorage.getItem('rai_vapid_key') || 'BGMIAO07gwGiD4klhaaOlQzjBTF4qJg702MXtB5Or4rm2wjdrLkZ562L7AY6uWD9kE1zjm5bxpLM9643wBKWp1E';
        
        let currentToken = '';
        try {
          console.log('Attempting FCM subscription with VAPID key:', vapidKey);
          currentToken = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registration
          });
        } catch (firstErr: any) {
          console.warn('FCM registration with primary VAPID key failed, trying fallback default key...', firstErr);
          try {
            // Fallback Stage: Try without specifying a vapidKey to let Firebase use the default key
            currentToken = await getToken(messaging, {
              serviceWorkerRegistration: registration
            });
            console.log('FCM subscription succeeded with default VAPID key fallback.');
          } catch (secondErr: any) {
            console.error('FCM subscription failed in both stages:', secondErr);
            // Throw the primary error to show the troubleshooting UI
            throw firstErr;
          }
        }

        if (!currentToken) {
          showAlert('error', 'فشل جلب الرمز', 'لم نتمكن من الحصول على رمز التنبيهات من خوادم Google Cloud.');
          return;
        }

        // Save token to Firestore
        if (currentUser) {
          await updateDoc(doc(db, 'users', currentUser.id), { fcmToken: currentToken });
          setCurrentUser(prev => prev ? { ...prev, fcmToken: currentToken } : null);
          const saved = safeStorage.getItem('rai_session');
          if (saved) {
            const session = JSON.parse(saved);
            session.fcmToken = currentToken;
            safeStorage.setItem('rai_session', JSON.stringify(session));
          }
        }

        showAlert('warning', 'جاري إرسال التنبيه', 'تم جلب الرمز وتوثيقه بنجاح! جاري طلب إرسال تنبيه تجريبي لهاتفك...');

        // Call sendPush endpoint directly with user's own token
        const res = await fetch('/api/sendPush', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: currentToken,
            title: 'تطبيق راعي 🐑',
            body: 'رائع جداً! تم تنشيط واختبار نظام إشعارات البث الهاتفي بنجاح 100%!'
          })
        });

        if (res.ok) {
          showAlert('success', 'تم التفعيل بنجاح', 'تهانينا! تم تفعيل إشعارات الهاتف بنجاح، وستصلك رسالة تنبيه تجريبية خلال ثوانٍ!');
        } else {
          const errData = await res.json().catch(() => ({}));
          showAlert('error', 'فشل الإرسال', `تم تسجيل الرمز بنجاح ولكن فشل السيرفر في الإرسال: ${errData.details || errData.error || 'خطأ غير معروف'}`);
        }
      }

    } catch (e: any) {
      console.error('Test notifications failed:', e);
      const errorMsg = e.message || '';
      const isCredentialError = errorMsg.includes('auth') || 
                                errorMsg.includes('credential') || 
                                errorMsg.includes('subscribe-failed') ||
                                errorMsg.includes('token-subscribe-failed');

      if (isCredentialError) {
        showAlert(
          'error',
          'عطل في مصادقة الإشعارات (FCM)',
          <div className="space-y-3 text-right font-medium text-xs leading-relaxed" dir="rtl">
            <p className="text-red-600 dark:text-red-400 font-black">
              فشل المشروع في المصادقة مع خوادم Google Cloud/Firebase لرموز الويب.
            </p>
            <p className="text-gray-700 dark:text-slate-300">
              يرجى التحقق من إعدادات مشروعك في كونسول Firebase بالطرق التالية:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[11px] text-gray-600 dark:text-slate-400 pr-2">
              <li>
                <strong>قيود مفتاح API Key في GCP:</strong> اذهب إلى <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-[#795548] dark:text-orange-400 underline font-bold">منصة Google Cloud {"->"} Credentials</a> وقم بتعديل مفتاح المتصفح وتأكد من تفعيل صلاحية <strong>"FCM Registration API"</strong> و <strong>"Firebase Cloud Messaging API"</strong> للمفتاح.
              </li>
              <li>
                <strong>مفتاح VAPID المخصص:</strong> توليد مفتاح جديد من إعدادات مشروع Firebase {"->"} Cloud Messaging {"->"} Web configuration، ثم وضعه في <strong>"إعدادات الإشعارات المتقدمة"</strong> أسفل نافذة الإعدادات.
              </li>
            </ol>
            <p className="text-[10px] text-red-500 font-bold mt-2 border-t pt-2 border-gray-100 dark:border-slate-800">
              تفاصيل المشكلة الفنية: {errorMsg}
            </p>
          </div>
        );
      } else {
        showAlert('error', 'عطل غير متوقع', e.message || 'تعذر استكمال اختبار التنبيهات.');
      }
    }
  };

  const handleUpdateUser = async (userId: string, updates: { name?: string, username?: string, password?: string, email?: string, vapidKey?: string, firebaseApiKey?: string }) => {
    try {
      const cleanUpdates: any = {};
      if (updates.name !== undefined) cleanUpdates.name = updates.name;
      if (updates.username !== undefined) cleanUpdates.username = updates.username;
      if (updates.password !== undefined) cleanUpdates.password = updates.password;
      if (updates.email !== undefined) cleanUpdates.email = updates.email;
      if (updates.vapidKey !== undefined) cleanUpdates.vapidKey = updates.vapidKey;
      if (updates.firebaseApiKey !== undefined) cleanUpdates.firebaseApiKey = updates.firebaseApiKey;

      await updateDoc(doc(db, 'users', userId), cleanUpdates);
      
      if (currentUser && currentUser.id === userId) {
        const updatedUser = { ...currentUser, ...cleanUpdates };
        setCurrentUser(updatedUser);
        localStorage.setItem('rai_session', JSON.stringify(updatedUser)); // backup fallback if available
        safeStorage.setItem('rai_session', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Error updating user:', e);
      throw e;
    }
  };

  const handleShareApp = async () => {
    try {
      if (typeof navigator.share !== 'undefined') {
        await navigator.share({
          title: 'تطبيق راعي لإدارة الحظائر',
          text: 'أفضل نظام لإدارة الحظائر والمواشي بدقة عالية.',
          url: window.location.href
        });
      } else {
        showAlert('warning', 'عذراً', 'ميزة المشاركة غير مدعومة في متصفحك');
      }
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  const handleLogout = () => {
    safeStorage.removeItem('rai_session');
    setCurrentUser(null);
    window.location.reload();
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    safeStorage.setItem('rai_session', JSON.stringify(user));
  };

  const handleRegisterOwner = async (username: string, password: string, name: string, email?: string) => {
    const userId = generateId();
    const newUser: User = {
      id: userId,
      ownerId: userId, // For owners, ownerId is their own ID
      name,
      username,
      password,
      role: 'owner',
      createdAt: new Date().toISOString(),
      permissions: DEFAULT_WORKER_PERMISSIONS,
      email
    };
    await setDoc(doc(db, 'users', newUser.id), newUser);
    handleLogin(newUser);
  };

  const handleRegisterWorker = async (
    username: string, 
    password: string, 
    name: string, 
    permissions: WorkerPermissions, 
    settingsPin: string, 
    accessiblePens: string[], 
    avatar?: string, 
    permissionsPerBarn?: { [barnId: string]: WorkerPermissions }
  ) => {
    if (!ownerId) return;
    
    // Check if username already exists globally to prevent message leaks / duplicates
    try {
      const normalizedUsername = username.trim().toLowerCase();
      const q = query(collection(db, 'users'), where('username', '==', normalizedUsername));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        showAlert('error', 'اسم المستخدم غير متاح', 'اسم المستخدم هذا محجوز مسبقاً! يرجى اختيار اسم آخر لتجنب تداخل الحسابات.');
        return;
      }
    } catch (checkError: any) {
      console.error('Check Duplicate Username Error:', checkError);
    }

    const workerId = generateId();
    const newWorker: User = {
      id: workerId,
      ownerId: ownerId,
      name,
      username: username.trim().toLowerCase(),
      password,
      role: 'worker',
      permissions,
      settingsPin,
      accessiblePens,
      avatar: avatar || '',
      permissionsPerBarn: permissionsPerBarn || {},
      createdAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', newWorker.id), newWorker);
      logActivity('إدارة العمال', `تمت إضافة العامل ${name}`);
      showAlert('success', 'تمت الإضافة', `تم تسجيل العامل ${name} بنجاح`);
    } catch (e: any) {
      console.error('Register Worker Error:', e);
      showAlert('error', 'خطأ', 'فشل في إضافة العامل: ' + e.message);
    }
  };

  const handleUpdateWorkerPermissions = async (
    userId: string, 
    permissions: WorkerPermissions, 
    accessiblePens: string[], 
    avatar?: string, 
    permissionsPerBarn?: { [barnId: string]: WorkerPermissions }
  ) => {
    try {
      await updateDoc(doc(db, 'users', userId), { 
        permissions, 
        accessiblePens,
        avatar: avatar || '',
        permissionsPerBarn: permissionsPerBarn || {}
      });
      logActivity('إدارة العمال', `تم تحديث بيانات العامل`);
    } catch (e: any) {
      console.error('Update Worker Error:', e);
    }
  };

  const handleDeleteWorker = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      logActivity('إدارة العمال', `تم حذف حساب عامل`);
    } catch (e) {
      console.error('Delete Worker Error:', e);
    }
  };

  // Navigation State
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPenId, setSelectedPenId] = useState<string | null>(null);
  const [barnTab, setBarnTab] = useState<'pens' | 'stock' | 'health' | 'finance' | 'feed' | 'vaccines' | 'expenses' | 'deaths'>('pens');
  const [returnToDashboard, setReturnToDashboard] = useState(false);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appLanguage, setAppLanguage] = useState<'ar' | 'en'>(() => (safeStorage.getItem('rai_lang') as 'ar' | 'en') || 'ar');
  const [appTheme, setAppTheme] = useState<'light' | 'dark'>(() => (safeStorage.getItem('rai_theme') as 'light' | 'dark') || 'light');

  // Apply Settings Effects
  useEffect(() => {
    safeStorage.setItem('rai_lang', appLanguage);
    document.dir = appLanguage === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = appLanguage;
  }, [appLanguage]);

  useEffect(() => {
    safeStorage.setItem('rai_theme', appTheme);
    if (appTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [appTheme]);

  const t = translations[appLanguage];

  // Data States
  const [pens, setPens] = useState<Pen[]>([]);
  const [rawSheep, setRawSheep] = useState<Sheep[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deaths, setDeaths] = useState<Death[]>([]);
  const [ownerName, setOwnerName] = useState('المالك');

  // Dashboard Stats
  // Derived filtered sheep list (solves stale closure and worker permissions)
  const allSheep = React.useMemo(() => {
    const accessIds = currentUser?.accessiblePens || [];
    if (isOwner) return rawSheep;
    
    return rawSheep.filter(s => {
      if (!s.penId) return false;
      if (accessIds.includes(s.penId)) return true;
      
      // Mortality Check: If it's a virtual mortality pen, link it to the barn
      if (s.penId.startsWith('mortality:')) {
        const barnId = s.penId.split(':')[1]?.trim();
        if (barnId && accessIds.includes(barnId)) return true;
      }
      
      // Check if parent pen is in accessIds
      const currentPen = pens.find(p => p.id === s.penId);
      if (currentPen?.parentId && accessIds.includes(currentPen.parentId)) return true;
      
      // Secondary check: if navigation is inside a parent pen, also check that parent
      if (selectedGroupId && accessIds.includes(selectedGroupId)) {
          const parent = pens.find(p => p.id === s.penId)?.parentId;
          if (parent === selectedGroupId) return true;
      }

      return false;
    });
  }, [rawSheep, pens, currentUser?.accessiblePens, isOwner, selectedGroupId]);

  const totalAnimals = allSheep.length;
  const sickCount = allSheep.filter(s => s.status === 'sick').length;
  const healthyCount = totalAnimals - sickCount;

  // New: Financial Stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenseVal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenseVal;

  // New: Smart Alerts
  const alerts = [
    ...allSheep
      .filter(s => s.medicalRecords?.some(r => {
        if (r.type !== 'vaccine') return false;
        const dueDate = new Date(calculateVaccineDueDate(r.date, r.name));
        const diff = dueDate.getTime() - Date.now();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // Next 7 days
      }))
      .map(s => ({ id: `vac_${s.id}`, type: 'warning', message: `تحصين مستحق للأغنام: ${s.serialNumber}` })),

    ...feedItems
      .filter(f => f.quantity < 50) // Threshold 50
      .map(f => ({ id: `feed_${f.id}`, type: 'danger', message: `نقص حاد في العلف: ${f.name} (${f.quantity} ${f.unit})` }))
  ];

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheepModalOpen, setIsSheepModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [barnSearchQuery, setBarnSearchQuery] = useState('');
  const [isReorderPensOpen, setIsReorderPensOpen] = useState(false);
  const [isSectionFilterDropdownOpen, setIsSectionFilterDropdownOpen] = useState(false);
  const [isBarnFilterDropdownOpen, setIsBarnFilterDropdownOpen] = useState(false);
  const [showMiscarriageInput, setShowMiscarriageInput] = useState(false);
  const [miscarriageReason, setMiscarriageReason] = useState('');
  const sectionFilterRef = useRef<HTMLDivElement>(null);
  const barnFilterRef = useRef<HTMLDivElement>(null);

  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [reportsInitialTab, setReportsInitialTab] = useState<ReportType>('overview');
  const [isRecentsOpen, setIsRecentsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [recentsDateFilter, setRecentsDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [recentsTypeFilter, setRecentsTypeFilter] = useState<'all' | 'birth' | 'death' | 'medical' | 'expense'>('all');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [unreadChatPerUser, setUnreadChatPerUser] = useState<Record<string, number>>({});
  const [isActionMenuOpen, setIsActionMenu] = useState(false);
  const [isEditingOwner, setIsEditingOwner] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [medicalModalOptions, setMedicalModalOptions] = useState<{ defaultStatusOnSave?: 'healthy' | 'sick', allowNoName?: boolean, defaultRecordType?: 'vaccine' | 'treatment' | 'checkup' }>({});
  const [reproductionDate, setReproductionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isWorkerManageOpen, setIsWorkerManageOpen] = useState(false);
  const [isWorkerActivityOpen, setIsWorkerActivityOpen] = useState(false);
  const [workerActivityFilter, setWorkerActivityFilter] = useState<'all' | 'add' | 'edit' | 'delete' | 'medical' | 'finance'>('all');
  const [workerFilter, setWorkerFilter] = useState<string>('all');
  const [workerDateFilter, setWorkerDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');


  // Editing / Action States
  const [editingPen, setEditingPen] = useState<Pen | undefined>(undefined);
  const [editingSheep, setEditingSheep] = useState<Sheep | undefined>(undefined);
  const [selectedSheepForAction, setSelectedSheepForAction] = useState<Sheep | undefined>(undefined);

  // Batch Action State
  const [batchAction, setBatchAction] = useState<{ type: string, action: 'move' | 'vaccinate' } | null>(null);

  // Modal for Deceased Sheep
  const [isDeathsModalOpen, setIsDeathsModalOpen] = useState(false);

  // Explicit state for what we are adding (Group/Barn vs Section)
  const [isAddingGroup, setIsAddingGroup] = useState(false);

  // Security / Data Privacy State
  const [tapCount, setTapCount] = useState(0);
  const [isDataUnlocked, setIsDataUnlocked] = useState(isOwner);

  // Sync isDataUnlocked with isOwner
  useEffect(() => {
    if (isOwner) setIsDataUnlocked(true);
  }, [isOwner]);

  const handleVersionTap = () => {
    if (isOwner) return; // Owner doesn't need to unlock
    const newCount = tapCount + 1;
    if (newCount >= 5) {
      const pin = prompt('أدخل الرمز السري لعرض البيانات:');
      if (pin === currentUser?.settingsPin) {
        setIsDataUnlocked(true);
        setTapCount(0);
      } else if (pin !== null) {
        showAlert('error', 'خطأ في الدخول', 'الرمز السري غير صحيح');
        setTapCount(0);
      } else {
        setTapCount(0);
      }
    } else {
      setTapCount(newCount);
      // Reset count after 3 seconds of inactivity
      const timer = setTimeout(() => setTapCount(0), 3000);
      return () => clearTimeout(timer);
    }
  };



  // --- Logic for Automatic Feed Deduction (Retroactive Check) ---
  const processAutoFeedDeduction = (items: FeedItem[]): FeedItem[] => {
    const now = new Date();
    let hasChanges = false;

    const updatedItems = items.map(item => {
      // Skip if no daily consumption set or empty stock
      const hasConsumption = item.consumptionMethod === 'varied'
        ? (item.variedDailyConsumption && Object.values(item.variedDailyConsumption).some(val => (val || 0) > 0))
        : (item.dailyConsumption && item.dailyConsumption > 0);

      if (!hasConsumption || item.quantity <= 0) {
        return item;
      }

      // Determine when we last checked (or last updated manually)
      const lastCheckStr = item.lastAutoDeduction || item.lastUpdated;
      const lastCheck = new Date(lastCheckStr);

      // We want to find how many "8:00 AM" milestones have occurred between lastCheck and now
      let deductionsCount = 0;

      // Start checking from the day of lastCheck
      let cursorDate = new Date(lastCheck);
      // Set cursor to 8:00 AM of that day
      cursorDate.setHours(8, 0, 0, 0);

      // If the last check was already AFTER 8 AM on that day, move to the next day's 8 AM to start counting
      if (lastCheck >= cursorDate) {
        cursorDate.setDate(cursorDate.getDate() + 1);
      }

      // Loop to count how much we passed until now
      let totalToDeduct = 0;
      
      while (cursorDate <= now) {
        deductionsCount++;
        
        // Calculate amount for this specific day
        if (item.consumptionMethod === 'varied' && item.variedDailyConsumption) {
          const dayOfWeek = cursorDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
          const amountForDay = item.variedDailyConsumption[dayOfWeek] || 0;
          totalToDeduct += amountForDay;
        } else {
          totalToDeduct += (item.dailyConsumption || 0);
        }

        cursorDate.setDate(cursorDate.getDate() + 1); // Move to next day
      }

      if (deductionsCount > 0 && totalToDeduct > 0) {
        hasChanges = true;
        // Don't go below zero
        const newQuantity = Math.max(0, item.quantity - totalToDeduct);
        const actualDeducted = item.quantity - newQuantity;

        if (actualDeducted > 0) {
          // Create a log entry for this auto deduction
          const logEntry: FeedLogEntry = {
            id: crypto.randomUUID(),
            date: now.toISOString(), // Logged at current time
            amount: actualDeducted,
            type: 'consume',
            isAuto: true // Mark as automatic
          };

          // Append to logs (keep last 50)
          const newLogs = [logEntry, ...(item.logs || [])].slice(0, 50);

          return {
            ...item,
            quantity: newQuantity,
            lastAutoDeduction: now.toISOString(), // Update last check time
            logs: newLogs
          };
        }
      }

      return item;
    });

    return hasChanges ? updatedItems : items;
  };

  // Support legacy accounts: if ownerId is missing but user is owner, use their ID
  // const ownerId = currentUser?.ownerId || (currentUser?.role === 'owner' ? currentUser?.id : null); // Removed legacy check

  // --- Users Sync (Authentication Layer) ---
  // This effect runs independently of ownerId to ensure AuthScreen has user data for login
  const fetchActivityLog = async (ownerId: string) => {
    try {
      const q = query(collection(db, 'activity_log'), where('ownerId', '==', ownerId));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityEntry));
        activities.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setActivityLog(activities);
      });
      return unsubscribe;
    } catch (error) {
      console.error("Error fetching activity log:", error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chat_messages'),
      where('receiverId', '==', currentUser.id),
      where('read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadChatCount(snapshot.docs.length);
      const perUser: Record<string, number> = {};
      snapshot.docs.forEach(doc => {
        const senderId = doc.data().senderId;
        if (senderId) {
          perUser[senderId] = (perUser[senderId] || 0) + 1;
        }
      });
      setUnreadChatPerUser(perUser);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Sync unread messages with PWA App Badge (Home Screen notification dot)
  useEffect(() => {
    if ('setAppBadge' in navigator) {
      if (unreadChatCount > 0) {
        (navigator as any).setAppBadge(unreadChatCount).catch(console.error);
      } else if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch(console.error);
      }
    }
  }, [unreadChatCount]);

  // Request Push Notification Permission & Save Token
  useEffect(() => {
    if (!currentUser) return;
    const setupPushNotifications = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        if (typeof Notification === 'undefined') {
          console.warn("Push Notifications are not supported by this browser.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          import('firebase/messaging').then(({ getToken, onMessage }) => {
            const vapidKey = currentUser?.vapidKey || safeStorage.getItem('rai_vapid_key') || 'BGMIAO07gwGiD4klhaaOlQzjBTF4qJg702MXtB5Or4rm2wjdrLkZ562L7AY6uWD9kE1zjm5bxpLM9643wBKWp1E';
            
            const handleTokenRetrieve = async () => {
              let currentToken = '';
              try {
                currentToken = await getToken(messaging, { vapidKey });
              } catch (firstErr: any) {
                console.warn('FCM auto-registration with VAPID key failed, trying fallback default key...', firstErr);
                try {
                  currentToken = await getToken(messaging);
                } catch (secondErr: any) {
                  console.error('FCM auto-registration failed in both stages:', secondErr);
                  throw firstErr;
                }
              }
              return currentToken;
            };

            handleTokenRetrieve()
              .then(async (currentToken) => {
                if (currentToken && currentUser.fcmToken !== currentToken) {
                  await updateDoc(doc(db, 'users', currentUser.id), { fcmToken: currentToken });
                  setCurrentUser(prev => prev ? { ...prev, fcmToken: currentToken } : null);
                  const saved = safeStorage.getItem('rai_session');
                  if (saved) {
                    const session = JSON.parse(saved);
                    session.fcmToken = currentToken;
                    safeStorage.setItem('rai_session', JSON.stringify(session));
                  }
                }
              })
              .catch((err) => {
                console.log('An error occurred while retrieving token. ', err);
              });

            onMessage(messaging, (payload) => {
              console.log('Foreground Message received. ', payload);
              if (Notification.permission === 'granted') {
                try {
                  new Notification(payload.notification?.title || 'رسالة جديدة', {
                    body: payload.notification?.body || 'لديك رسالة جديدة في مدير الحظائر',
                    icon: '/assets/logo.jpg',
                  });
                } catch (e) {
                  console.error('Failed to show foreground notification:', e);
                }
              }
            });
          });
        }
      } catch (e) {
        console.error('Push setup failed:', e);
      }
    };
    setupPushNotifications();
  }, [currentUser?.id]);

  useEffect(() => {
    // If we're already logged in as a worker, we only need to sync our own owner's users
    // But for the Login screen, we need to fetch all potentially available accounts
    let usersRef: any = collection(db, 'users');
    
    // If logged in as owner, we only care about our own workers
    if (currentUser && isOwner) {
       usersRef = query(collection(db, 'users'), where('ownerId', '==', ownerId));
    }

    const unsub = onSnapshot(usersRef, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      setIsLoadingUsers(false);
    }, (err) => {
      console.error("Users Sync Error:", err);
      setIsLoadingUsers(false);
    });

    return () => unsub();
  }, [currentUser?.id, isOwner, ownerId]);

  // Data Sync (Conditional on OwnerID)
  useEffect(() => {
    if (!ownerId) return;
    const unsubscribes: (() => void)[] = [];

    // 1. Pens Sync
    const pensRef = collection(db, 'farms', ownerId, 'pens');
    unsubscribes.push(onSnapshot(pensRef, (snapshot) => {
      setPens(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pen)));
    }));

    // 2. Sheep Sync
    const sheepRef = collection(db, 'farms', ownerId, 'sheep');
    unsubscribes.push(onSnapshot(sheepRef, (snapshot) => {
      const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sheep));
      setRawSheep(raw);
    }));

    // 3. Feed Sync
    const feedRef = collection(db, 'farms', ownerId, 'feed');
    unsubscribes.push(onSnapshot(feedRef, (snapshot) => {
      setFeedItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FeedItem)));
    }));

    // 4. Expenses Sync
    const expensesRef = collection(db, 'farms', ownerId, 'expenses');
    unsubscribes.push(onSnapshot(expensesRef, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
    }));

    // 4.1 Sales Sync
    const salesRef = collection(db, 'farms', ownerId, 'sales');
    unsubscribes.push(onSnapshot(salesRef, (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sale)));
    }));

    // 4.2 Deaths Sync
    const deathsRef = collection(db, 'farms', ownerId, 'deaths');
    unsubscribes.push(onSnapshot(deathsRef, (snapshot) => {
      setDeaths(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Death)));
    }));

    // 5. Activity Log Sync
    const activityRef = query(
      collection(db, 'farms', ownerId, 'activity'),
      limit(200)
    );
    unsubscribes.push(onSnapshot(activityRef, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityEntry));
      setActivityLog(logs.sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
    }));

    // 6. Users Sync moved to its own effect above for better reliability
  
    return () => unsubscribes.forEach(unsub => unsub());
  }, [ownerId, isOwner]);

  // Personal Settings Persistence (safeStorage)
  useEffect(() => { safeStorage.setItem('rai_lang', appLanguage); }, [appLanguage]);
  useEffect(() => { safeStorage.setItem('rai_theme', appTheme); }, [appTheme]);

  // Click outside for custom section & barn filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sectionFilterRef.current && !sectionFilterRef.current.contains(event.target as Node)) {
        setIsSectionFilterDropdownOpen(false);
      }
      if (barnFilterRef.current && !barnFilterRef.current.contains(event.target as Node)) {
        setIsBarnFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatic Feed Deduction Trigger (Retroactive)
  useEffect(() => {
    if (!ownerId || feedItems.length === 0) return;
    const updated = processAutoFeedDeduction(feedItems);
    const changedItems = updated.filter((item, idx) => {
      // Find matching original item by ID for safer comparison
      const original = feedItems.find(f => f.id === item.id);
      return original && (item.quantity !== original.quantity || item.lastAutoDeduction !== original.lastAutoDeduction);
    });

    if (changedItems.length > 0) {
      changedItems.forEach(async (item) => {
        try {
          await updateDoc(doc(db, 'farms', ownerId, 'feed', item.id), {
            quantity: item.quantity,
            lastAutoDeduction: item.lastAutoDeduction,
            logs: item.logs
          });
          console.log(`[Auto-Deduction] Updated feed item ${item.name}`);
        } catch (e) {
          console.error(`[Auto-Deduction] Error updating feed item ${item.name}:`, e);
        }
      });
    }
  }, [feedItems, ownerId]);

  // Background Breeding Timer (Revert lactation/mother status to 'empty' after 3 months / 90 days)
  useEffect(() => {
    if (!ownerId || rawSheep.length === 0) return;
    const now = new Date();
    const updateMotherStates = async () => {
      for (const s of rawSheep) {
        if (s.gender === 'female' && s.reproductionStatus === 'mother' && s.lactationStartDate) {
          const start = new Date(s.lactationStartDate);
          const diffTime = Math.abs(now.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 90) {
            try {
              await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), {
                reproductionStatus: 'empty',
                lactationStartDate: null
              });
            } catch (e) {
              console.error("Error auto-updating breeding status for animal " + s.serialNumber, e);
            }
          }
        }
      }
    };
    updateMotherStates();
  }, [rawSheep, ownerId]);


  const handleSaveExpense = async (expense: Expense) => {
    if (!ownerId) {
      showAlert('error', 'تنبيه', 'خطأ: لم يتم العثور على هوية المشروع. يرجى تسجيل الدخول مجدداً.');
      return;
    }
    try {
      await setDoc(doc(db, 'farms', ownerId, 'expenses', expense.id), expense);
      logActivity('إضافة مصروف', `${expense.title}: ${expense.amount} ريال`);
    } catch (e: any) { 
      console.error('Expense Save Error:', e);
      showAlert('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ المصروف: ' + (e.message || e));
    }
  };

  const handleSaveSale = async (sale: Sale) => {
    if (!ownerId) {
      showAlert('error', 'تنبيه', 'خطأ: لم يتم العثور على هوية المشروع. يرجى تسجيل الدخول مجدداً.');
      return;
    }
    try {
      await setDoc(doc(db, 'farms', ownerId, 'sales', sale.id), sale);
      logActivity('إضافة مبيعات', `${sale.title}: ${sale.amount} ريال`);
    } catch (e: any) { 
      console.error('Sale Save Error:', e);
      showAlert('error', 'فشل الحفظ', 'حدث خطأ أثناء حفظ المبيعات: ' + (e.message || e));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!ownerId || !can('canDeleteExpenses')) return;
    showConfirm('حذف مصروف', 'هل أنت متأكد من حذف هذا المصروف؟', async () => {
      try {
        await deleteDoc(doc(db, 'farms', ownerId, 'expenses', id));
      } catch (e: any) { console.error('Delete Expense Error:', e); }
    });
  };

  const handleDeleteSale = async (id: string) => {
    if (!ownerId || !can('canDeleteExpenses')) return;
    showConfirm('حذف سجل مبيعات', 'هل أنت متأكد من حذف هذا السجل؟', async () => {
      try {
        await deleteDoc(doc(db, 'farms', ownerId, 'sales', id));
      } catch (e: any) { console.error('Delete Sale Error:', e); }
    });
  };

  const handleSaveDeath = async (death: Death) => {
    if (!ownerId) return;
    try {
      await setDoc(doc(db, 'farms', ownerId, 'deaths', death.id), death);
      // Removed deleteDoc: The sheep should remain in mortality pen instead of being deleted
      logActivity('تسجيل وفاة', `${death.type} - ${death.reason}`);
    } catch (e: any) { console.error('Death Save Error:', e); }
  };

  // --- Feed/Inventory Handlers ---
  const handleUpdateFeed = async (newItems: FeedItem[]) => {
    if (!ownerId) {
      showAlert('error', 'خطأ في المزامنة', 'خطأ: لم يتم اكتشاف هوية المالك لمزامنة المخزون. يرجى إعادة تسجيل الدخول.');
      return;
    }
    try {
      // Sync all items to Firestore
      for (const item of newItems) {
        const cleanItem = JSON.parse(JSON.stringify(item));
        await setDoc(doc(db, 'farms', ownerId, 'feed', item.id), cleanItem);
      }
      logActivity('تحديث المخزون', `تم تحديث بيانات الأعلاف والمؤن`);
      // Note: Full local state also gets updated via onSnapshot automatically
    } catch (e: any) {
      console.error('Feed Sync Error:', e);
      showAlert('error', 'خطأ في المزامنة', `خطأ في مزامنة المخزون: ${e.message || e}`);
    }
  };

  // --- Pen/Group Handlers ---
  const handleSavePen = async (pen: Pen) => {
    if (!ownerId) {
      showAlert('error', 'خطأ في النظام', 'خطأ فني: لم يتم العثور على هوية المشروع (ownerId). يرجى تسجيل الخروج والدخول مرة أخرى ضروري جداً.');
      return;
    }
    
    let penToSave: any = { ...pen };
    if (!editingPen) {
      let isMainPen = false;
      if (!isAddingGroup && selectedGroupId) {
        const siblings = pens.filter(p => p.parentId === selectedGroupId);
        if (siblings.length === 0) isMainPen = true;
      }
      penToSave = {
        ...pen,
        isGroup: isAddingGroup || false,
        parentId: isAddingGroup ? null : (selectedGroupId || null),
        isMain: isMainPen
      };
    }

    // Deep sanitize to remove any 'undefined' which Firestore hates
    const cleanPen = JSON.parse(JSON.stringify(penToSave));

    try {
      await setDoc(doc(db, 'farms', ownerId, 'pens', pen.id), cleanPen);
      
      if (pen.ownerName) {
        await updateDoc(doc(db, 'users', ownerId), { name: pen.ownerName });
      }
      
      logActivity(editingPen ? 'تعديل قسم/حظيرة' : 'إضافة قسم/حظيرة', `تمت معالجة ${pen.name}`);
      setIsModalOpen(false);
      // alert('تم الحفظ بنجاح في السحابة!');
    } catch (e: any) { 
      console.error('Firebase Error:', e);
      showAlert('error', 'فشل الحفظ', `عذراً، فشل الحفظ في السحابة. \nالسبب: ${e.message || e}`);
    }

    setEditingPen(undefined);
  };

  const handleReorderPens = async (orderedPens: Pen[]) => {
    if (!ownerId) return;
    try {
      // Local optimistic update for instant responsive feel
      setPens(prev => {
        const copy = [...prev];
        orderedPens.forEach((op, index) => {
          const idx = copy.findIndex(p => p.id === op.id);
          if (idx !== -1) {
            copy[idx] = { ...copy[idx], sortOrder: index };
          }
        });
        return copy;
      });

      // Save to Firebase asynchronously
      const promises = orderedPens.map((pen, index) => {
        const penRef = doc(db, 'farms', ownerId, 'pens', pen.id);
        return updateDoc(penRef, { sortOrder: index });
      });
      await Promise.all(promises);
      logActivity('ترتيب الأقسام', 'تم تحديث ترتيب الأقسام بنجاح');
    } catch (e: any) {
      console.error('Failed to save pens order:', e);
      showAlert('error', 'فشل حفظ الترتيب', `فشل تحديث الترتيب في السحابة: ${e.message || e}`);
    }
  };

  const handleDeletePen = async (id: string, isGroup: boolean) => {
    if (!ownerId || !isOwner) return;
    const penToDelete = pens.find(p => p.id === id);
    const title = isGroup ? 'حذف حظيرة' : 'حذف قسم';
    const msg = isGroup
      ? 'حذف الحظيرة الرئيسية سيؤدي لحذف جميع الأقسام بداخلها. هل أنت متأكد؟'
      : 'هل أنت متأكد من حذف هذا القسم؟ سيتم نقل جميع الحيوانات إلى القسم الرئيسي إن وجد.';

    showConfirm(title, msg, async () => {
      try {
        if (isGroup) {
          // Delete children first
          const children = pens.filter(p => p.parentId === id);
          for (const child of children) {
            await deleteDoc(doc(db, 'farms', ownerId, 'pens', child.id));
          }
          await deleteDoc(doc(db, 'farms', ownerId, 'pens', id));
          logActivity('حذف حظيرة', `تم حذف حظيرة ${penToDelete?.name || ''}`);
        } else {
          if (penToDelete && penToDelete.parentId) {
            const mainPen = pens.find(p => p.parentId === penToDelete.parentId && p.isMain && p.id !== id);
            if (mainPen) {
              const animalsToMove = allSheep.filter(s => s.penId === id);
              for (const s of animalsToMove) {
                await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), { penId: mainPen.id });
              }
            }
          }
          await deleteDoc(doc(db, 'farms', ownerId, 'pens', id));
          logActivity('حذف قسم', `تم حذف قسم ${penToDelete?.name || ''}`);
        }
        if (selectedGroupId === id) setSelectedGroupId(null);
      } catch (e) {
        console.error(e);
      }
    });
  };

  const openEditModal = (pen: Pen) => {
    setEditingPen(pen);
    // If it has children or parentId is null/undefined, it MIGHT be a group, but let's rely on the explicit format
    // Actually, simpler: check the 'isGroup' flag or if we are at root level editing a barn
    setIsAddingGroup(pen.isGroup === true || !pen.parentId);
    setIsModalOpen(true);
  };

  const openAddBarnModal = () => {
    setIsAddingGroup(true);
    setEditingPen(undefined);
    setIsModalOpen(true);
  };

  const openAddSectionModal = () => {
    setIsAddingGroup(false);
    setEditingPen(undefined);
    setIsModalOpen(true);
  };

  const enterGroup = (id: string) => {
    setSelectedGroupId(id);
    setActiveTab('pens');
    setBarnTab('pens'); // Default to pens tab
  };

  // --- Sheep Handlers ---

  const enterSheepList = (penId: string) => {
    setSelectedPenId(penId);
    setActiveTab('sheepList');
  }

  const handleSaveSheep = async (sheepData: Sheep | Sheep[], expense?: { amount: number, date: string }) => {
    if (!ownerId) return;
    const sheepList = Array.isArray(sheepData) ? sheepData : [sheepData];
    
    try {
      for (const s of sheepList) {
        // Sanitize to remove any 'undefined' which Firestore hates
        const isNew = !editingSheep || (Array.isArray(sheepData) && sheepData.length > 1);
        const cleanSheep = JSON.parse(JSON.stringify({
          ...s,
          addedBy: isNew ? (currentUser?.name || 'غير معروف') : (s.addedBy || (currentUser?.name || 'غير معروف'))
        }));
        await setDoc(doc(db, 'farms', ownerId, 'sheep', s.id), cleanSheep);
      }
      
      if (editingSheep && !Array.isArray(sheepData)) {
        const changes: string[] = [];
        const newSheep = sheepData as Sheep;
        
        if (editingSheep.type !== newSheep.type) {
          changes.push(`تغيير الصنف من (${editingSheep.type}) إلى (${newSheep.type})`);
        }
        if (editingSheep.gender !== newSheep.gender) {
          changes.push(`تغيير الجنس من (${editingSheep.gender === 'male' ? 'ذكر' : 'أنثى'}) إلى (${newSheep.gender === 'male' ? 'ذكر' : 'أنثى'})`);
        }
        if (editingSheep.reproductionStatus !== newSheep.reproductionStatus) {
          const getRepStatusLabel = (status?: string) => {
            if (status === 'pregnant') return 'مضرع';
            if (status === 'mother') return 'أم مرضعة';
            return 'غير مضرع';
          };
          changes.push(`تغيير حالة الإخصاب من (${getRepStatusLabel(editingSheep.reproductionStatus)}) إلى (${getRepStatusLabel(newSheep.reproductionStatus)})`);
        }
        if (editingSheep.healthStatus !== newSheep.healthStatus && (editingSheep.healthStatus || newSheep.healthStatus)) {
          const getHealthLabel = (st?: string) => st === 'sick' ? 'مريض' : 'سليم';
          changes.push(`تغيير الحالة الصحية من (${getHealthLabel(editingSheep.healthStatus)}) إلى (${getHealthLabel(newSheep.healthStatus)})`);
        }
        if (editingSheep.tagColor !== newSheep.tagColor) {
          const oldColorLabel = colorNames[editingSheep.tagColor || ''] || 'بدون لون';
          const newColorLabel = colorNames[newSheep.tagColor || ''] || 'بدون لون';
          changes.push(`تعديل لون الشارة من (${oldColorLabel}) إلى (${newColorLabel})`);
        }
        if (editingSheep.serialNumber !== newSheep.serialNumber) {
          changes.push(`تعديل الرقم التسلسلي من (#${editingSheep.serialNumber}) إلى (#${newSheep.serialNumber})`);
        }
        if (editingSheep.penId !== newSheep.penId) {
          const oldPenName = pens.find(p => p.id === editingSheep.penId)?.name || 'غير معروف';
          const newPenName = pens.find(p => p.id === newSheep.penId)?.name || 'غير معروف';
          changes.push(`نقل من قسم (${oldPenName}) إلى (${newPenName})`);
        }
        
        const detailsText = changes.length > 0 ? `تم تعديل #${newSheep.serialNumber} (${changes.join(' | ')})` : `تم تعديل بيانات #${newSheep.serialNumber}`;
        logActivity('تعديل حيوان', detailsText, newSheep.serialNumber, newSheep.tagColor, changes);
      } else {
        if (!Array.isArray(sheepData)) {
          const newSheep = sheepData as Sheep;
          logActivity('إضافة حيوان', `تمت إضافة رأس #${newSheep.serialNumber} (${newSheep.type})`, newSheep.serialNumber, newSheep.tagColor);
        } else {
          logActivity('إضافة حيوان', `تمت إضافة ${sheepList.length} رأس`);
        }
      }
    } catch (e: any) { 
      console.error('Sheep Save Error:', e);
      showAlert('error', 'فشل الحفظ', `خطأ في حفظ الحيوانات: ${e.message || e}`);
    }
    setEditingSheep(undefined);
    setIsSheepModalOpen(false);
  };

  const handleDeleteSheep = async (id: string, skipConfirm: boolean = false) => {
    if (!ownerId || !can('canDeleteAnimals')) return;
    const performDelete = async () => {
      const sheepToDelete = allSheep.find(s => s.id === id);
      try {
        await deleteDoc(doc(db, 'farms', ownerId, 'sheep', id));
        if (sheepToDelete) {
          logActivity('حذف حيوان', `تم حذف #${sheepToDelete.serialNumber} (${sheepToDelete.type})`, sheepToDelete.serialNumber, sheepToDelete.tagColor);
        }
      } catch (e) { console.error(e); }
    };

    if (skipConfirm) {
      performDelete();
    } else {
      showConfirm('حذف حيوان', 'هل أنت متأكد من حذف هذا الرأس نهائياً؟', performDelete);
    }
  };

  const openNewSheepModal = (penId?: string) => {
    setEditingSheep(undefined);
    if (penId) setSelectedPenId(penId);
    setIsSheepModalOpen(true);
  };

  const openEditSheepModal = (sheep: Sheep) => {
    setEditingSheep(sheep);
    setIsSheepModalOpen(true);
  };

  // --- Move Sheep Logic ---
  const openMoveModal = (sheep: Sheep) => {
    setSelectedSheepForAction(sheep);
    setIsMoveModalOpen(true);
  };

  const handleMoveSheep = async (targetPenId: string, quantity?: number, gender?: 'male' | 'female', reason?: string) => {
    if (!targetPenId || !ownerId) return;

    const isTargetExcl = targetPenId.includes('mortality') || pens.find(p => p.id === targetPenId)?.isExclusion;

    if (isTargetExcl && !can('canAddDeath')) {
      showAlert('error', 'صلاحية غير متوفرة', 'ليس لديك صلاحية للقيام بالاستبعاد.');
      return;
    }

    let finalReason = reason;
    if (isTargetExcl && !finalReason) {
      // Reason should come from MoveSheepModal directly
      finalReason = 'غير محدد';
    }

    try {
      if (batchAction && batchAction.action === 'move') {
        const typeToMove = batchAction.type;
        const candidates = allSheep.filter(s =>
          s.penId === selectedPenId &&
          s.type === typeToMove &&
          (!gender || s.gender === gender)
        );
        const toMove = quantity ? candidates.slice(0, quantity) : candidates;
        if (toMove.length === 0) return;

        const sourcePen = pens.find(p => p.id === selectedPenId);
        const sourceName = sourcePen?.name || 'قسم غير معروف';
        const targetPenName = pens.find(p => p.id === targetPenId)?.name || (targetPenId.includes('mortality') ? 'المستبعدة' : 'قسم جديد');

        for (const s of toMove) {
          const isTargetExclusion = targetPenId.includes('mortality');
          const moveEntry = {
            fromPenId: s.penId,
            toPenId: targetPenId,
            fromPenName: sourceName,
            toPenName: targetPenName,
            movedBy: currentUser?.name || 'غير معروف',
            date: new Date().toISOString().split('T')[0]
          };
          const updatedHistory = [...(s.movementHistory || []), moveEntry];

          await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), {
            penId: targetPenId,
            notes: finalReason && isTargetExclusion ? finalReason : s.notes,
            exclusionDate: isTargetExclusion ? new Date().toISOString() : (s.exclusionDate || null),
            movementHistory: updatedHistory
          });
        }
        if (targetPenId.includes('mortality')) {
          logActivity('استبعاد حيوان', `تم استبعاد ${toMove.length} رأس. السبب: ${finalReason || 'غير محدد'}`);
        } else {
          logActivity('نقل جماعي', `تم نقل ${toMove.length} رأس من [${sourceName}] إلى [${targetPenName}]`);
        }
        setBatchAction(null);
      } else if (selectedSheepForAction) {
        const sourcePen = pens.find(p => p.id === (selectedPenId || selectedSheepForAction.penId));
        const sourceName = sourcePen?.name || 'قسم غير معروف';
        const isExcl = targetPenId.includes('mortality') || pens.find(p => p.id === targetPenId)?.isExclusion;
        const targetPenName = pens.find(p => p.id === targetPenId)?.name || (targetPenId.includes('mortality') ? 'المستبعدة' : 'قسم جديد');
        
        const moveEntry = {
          fromPenId: selectedSheepForAction.penId,
          toPenId: targetPenId,
          fromPenName: sourceName,
          toPenName: targetPenName,
          movedBy: currentUser?.name || 'غير معروف',
          date: new Date().toISOString().split('T')[0]
        };
        const updatedHistory = [...(selectedSheepForAction.movementHistory || []), moveEntry];

        await updateDoc(doc(db, 'farms', ownerId, 'sheep', selectedSheepForAction.id), {
          penId: targetPenId,
          notes: finalReason && targetPenId.includes('mortality') ? finalReason : selectedSheepForAction.notes,
          exclusionDate: isExcl ? new Date().toISOString() : (selectedSheepForAction.exclusionDate || null),
          movementHistory: updatedHistory
        });
        if (isExcl) {
          logActivity('استبعاد حيوان', `تم استبعاد #${selectedSheepForAction.serialNumber}. السبب: ${finalReason || 'غير محدد'}`, selectedSheepForAction.serialNumber, selectedSheepForAction.tagColor);
        } else {
          logActivity('نقل حيوان', `تم نقل #${selectedSheepForAction.serialNumber} من [${sourceName}] إلى [${targetPenName}]`, selectedSheepForAction.serialNumber, selectedSheepForAction.tagColor);
        }
        setSelectedSheepForAction(undefined);
      }
    } catch (e) { console.error(e); }

    setIsMoveModalOpen(false);
  };

  // --- Medical Record Logic ---
  const openMedicalModal = (sheep: Sheep, options?: { defaultStatusOnSave?: 'healthy' | 'sick', allowNoName?: boolean, defaultRecordType?: 'vaccine' | 'treatment' | 'checkup' }) => {
    setSelectedSheepForAction(sheep);
    setMedicalModalOptions(options || {});
    setIsMedicalModalOpen(true);
  };

  const handleAddMedicalRecord = async (record: MedicalRecord) => {
    if (!ownerId) return;
    const now = new Date().toISOString();
    const newRecord = { ...record, createdAt: record.createdAt || now };

    try {
      if (batchAction && batchAction.action === 'vaccinate') {
        const toVaccinate = allSheep.filter(s => s.penId === selectedPenId && s.type === batchAction.type);
        for (const s of toVaccinate) {
          await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), {
            medicalRecords: [...(s.medicalRecords || []), newRecord]
          });
        }
        logActivity('تلقيح جماعي', `تم تلقيح ${toVaccinate.length} رأس - ${record.name}`);
        setBatchAction(null);
      } else if (selectedSheepForAction) {
        const updateData: any = {
          medicalRecords: [...(selectedSheepForAction.medicalRecords || []), newRecord]
        };
        if (medicalModalOptions.defaultStatusOnSave) {
          updateData.status = medicalModalOptions.defaultStatusOnSave;
        }
        await updateDoc(doc(db, 'farms', ownerId, 'sheep', selectedSheepForAction.id), updateData);
        const recordTypeLabel = record.type === 'vaccine' ? 'تطعيم' : (record.type === 'treatment' ? 'علاج' : 'فحص');
        logActivity('سجل طبي', `${recordTypeLabel}: ${record.name} (#${selectedSheepForAction.serialNumber})`, selectedSheepForAction.serialNumber, selectedSheepForAction.tagColor);
        // Locally update the selected sheep so the modal reflects the change
        setSelectedSheepForAction({
          ...selectedSheepForAction,
          ...updateData
        });
      }
    } catch (e) { console.error(e); }
    
    setIsMedicalModalOpen(false);
  };

  // --- Helpers ---
  const getOccupancyColor = (current: number, max: number) => {
    const ratio = current / max;
    if (ratio >= 0.9) return 'bg-red-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const calculateAgeDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const birth = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (months < 0) { years--; months += 12; }
    if (years > 0) return `${years} سنة`;
    return `${months} شهر`;
  };

  // Local getAnimalAgeLabel removed in favor of utils function


  const hasPendingVaccines = (sheep: Sheep) => {
    const metadata = getAnimalMetadata(sheep.type);
    const vaccines = metadata?.vaccines || [];
    return vaccines.some(v => {
      const record = sheep.medicalRecords?.find(r => r.type === 'vaccine' && r.name === v.name);
      if (record) return false; // Taken

      const dueDate = calculateVaccineDueDate(sheep.birthDate, v.age);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays <= 7;
    });
  };

  // --- Renderers ---
  // --- Renderers ---



  const renderDeceasedSheepRow = (sheep: Sheep) => {
    // Helper to resolve parent serial
    const getParentSerial = (id: string | undefined) => {
      if (!id) return '-';
      const parent = allSheep.find(s => s.id === id || s.serialNumber === id);
      return parent ? parent.serialNumber : id;
    };

    return (
      <div key={sheep.id} className="bg-white border border-red-100 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-sm transition gap-4 opacity-75">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-gray-100 text-gray-500">
            <Skull size={20} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800 flex items-center gap-2">
              {sheep.serialNumber}
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{sheep.type}</span>
            </h4>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <span>{calculateAgeDisplay(sheep.birthDate)}</span>
              <span>•</span>
              {sheep.exclusionDate && (
                <>
                  <span className="text-gray-500" dir="ltr">{new Date(sheep.exclusionDate).toLocaleDateString('en-GB')}</span>
                  <span>•</span>
                </>
              )}
              <span className="text-red-400">{sheep.notes}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Dna size={14} className="text-gray-400" />
          <span className="text-xs">الأم: {getParentSerial(sheep.motherId)} / الأب: {getParentSerial(sheep.fatherId)}</span>
        </div>
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end">
          <button onClick={() => handleDeleteSheep(sheep.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="حذف نهائي">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  const handleSellAnimal = async (idOrType: string, reason: string, isBatch: boolean = false, quantity: number = 1, gender?: string) => {
    if (isBatch) {
      if (!selectedGroupId || !quantity || quantity <= 0) return;

      const type = idOrType;
      // Find candidate sheep in the current group
      const candidates = allSheep.filter(s =>
        pens.find(p => p.id === s.penId)?.parentId === selectedGroupId &&
        s.type === type &&
        (!gender || s.gender === gender)
      );

      // Limit by quantity
      const sheepToSell = candidates.slice(0, quantity);

      if (sheepToSell.length === 0) return;

      const title = `بيع ${isBatch ? (sheepToSell.length + ' رأس من ' + idOrType) : ('الحيوان #' + idOrType)}`;
      const msg = `هل أنت متأكد من إتمام هذه العملية؟ سيتم نقل الحيوان إلى سجل المستبعدة.`;

      showConfirm('تأكيد البيع', msg, async () => {
        const targetMortalityPenId = selectedGroupId ? `mortality:${selectedGroupId} ` : '';
        if (!targetMortalityPenId) return;

        try {
          if (isBatch) {
            for (const s of sheepToSell) {
              await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), {
                penId: targetMortalityPenId,
                notes: reason || 'تم البيع',
                exclusionDate: new Date().toISOString()
              });
            }
          } else {
            const sheep = sheepToSell as Sheep;
            await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), {
              penId: targetMortalityPenId,
              notes: reason || 'تم البيع',
              exclusionDate: new Date().toISOString()
            });
          }

          // Update localized state if needed (optional since Firebase listener will handle it)
          const countsByPen = isBatch 
            ? (sheepToSell as Sheep[]).reduce((acc: any, s: any) => { acc[s.penId] = (acc[s.penId] || 0) + 1; return acc; }, {})
            : { [ (sheepToSell as Sheep).penId ]: 1 };

          setPens(pens.map(p => {
             if (countsByPen[p.id]) {
               return { ...p, currentCount: Math.max(0, (p.currentCount || 0) - countsByPen[p.id]) };
             }
             return p;
          }));
        } catch (e) {
          console.error('Error on sale:', e);
        }
      });
    }
  };

  const [viewingSheep, setViewingSheep] = useState<Sheep | undefined>(undefined);
  const [reproductionConfirmState, setReproductionConfirmState] = useState<{
    sheep: Sheep,
    currentStatus: string,
    nextStatus: string,
    expectedDurationDays: number
  } | null>(null);

  useEffect(() => {
    if (reproductionConfirmState) {
      setReproductionDate(new Date().toISOString().split('T')[0]);
    }
  }, [reproductionConfirmState]);

  const renderSheepRow = (sheep: Sheep) => (
    <div
      key={sheep.id}
      onClick={() => setViewingSheep(sheep)}
      className={`relative rounded-3xl p-4 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group aspect-square sm:aspect-auto ${sheep.gender === 'male' ? 'bg-blue-50/30' : 'bg-pink-50/30'} border border-gray-100 hover-glow dark:border-slate-800 dark:bg-slate-900 premium-shadow`}
    >
      <div
        className={`px-4 py-2 rounded-2xl flex items-center justify-center shadow-md text-white min-w-[70px] ${sheep.tagColor ? '' : (sheep.gender === 'male' ? 'bg-blue-500' : 'bg-emerald-500')} `}
        style={{ backgroundColor: sheep.tagColor || undefined }}
      >
        <span className="font-black text-xl tracking-tighter">{sheep.serialNumber}</span>
      </div>

      <span className={`text-sm font-black uppercase tracking-wider ${sheep.gender === 'male' ? 'text-blue-600' : 'text-pink-600'} `}>{sheep.type}</span>

      {hasPendingVaccines(sheep) && (
        <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
      )}
    </div>
  );

  const calculateDetailedAge = (dateStr: string) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    let days = now.getDate() - birth.getDate();

    if (days < 0) {
      months--;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} سنة`);
    if (months > 0) parts.push(`${months} شهر`);
    if (days > 0) parts.push(`${days} يوم`);

    return parts.length > 0 ? parts.join(' و ') : 'اليوم';
  };



  const renderDetailCard = (sheep: Sheep) => {
    const getMotherInfo = () => {
      if (!sheep.motherId) return null;
      const mother = allSheep.find(s => s.id === sheep.motherId || s.serialNumber === sheep.motherId);
      return mother ? { serialNumber: mother.serialNumber, tagColor: mother.tagColor } : { serialNumber: sheep.motherId, tagColor: undefined };
    };

    return (
      <div className="bg-[#FCFBF4] rounded-[2.5rem] p-6 w-full max-w-sm mx-auto shadow-2xl animate-scale-in dark:bg-slate-900">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${sheep.tagColor ? 'text-white' : (sheep.gender === 'male' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600')} `}
              style={{ backgroundColor: sheep.tagColor || undefined }}
            >
              <Dna size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-gray-900 text-2xl dark:text-gray-100">{sheep.serialNumber}</h4>
                <span className="text-lg font-bold text-gray-500">
                  {sheep.type}
                </span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {sheep.gender === 'male' ? 'ذكر' : 'أنثى'} • {getAnimalAgeLabel(sheep.birthDate, sheep.type, sheep.gender)}
                </span>
                <span className="text-xs text-blue-500 font-bold mt-0.5" dir="rtl">{calculateDetailedAge(sheep.birthDate)}</span>
                
                {/* Mother Tag & Number Display */}
                {(() => {
                  const motherInfo = getMotherInfo();
                  if (!motherInfo) return null;
                  return (
                    <div className="flex items-center gap-1.5 mt-2 bg-pink-50/40 dark:bg-pink-900/10 px-2 py-1 rounded-xl border border-pink-100/30 w-fit">
                      <span className="text-[10px] font-black text-pink-700 dark:text-pink-300">رقم الأم:</span>
                      <div 
                        className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10 shrink-0" 
                        style={{ backgroundColor: motherInfo.tagColor || '#D7CCC8' }}
                      />
                      <span className="text-[10.5px] font-extrabold text-gray-800 dark:text-gray-200">{motherInfo.serialNumber}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
          <button onClick={() => setViewingSheep(undefined)} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition dark:hover:bg-slate-800">
            <X size={24} />
          </button>
        </div>

        {sheep.nickname && (
          <div className="mb-4 flex items-center gap-2 bg-orange-50/50 p-2 rounded-xl border border-orange-100 dark:bg-orange-900/10 dark:border-orange-800/20">
            <Star size={14} className="text-orange-500" />
            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">{sheep.nickname}</span>
          </div>
        )}

        {sheep.notes && (
          <div className="text-sm text-gray-600 bg-white/50 border border-gray-100 rounded-2xl p-4 mb-6 text-right dark:bg-slate-800 dark:border-slate-700/50">
            <span className="font-black text-gray-400 block mb-2 text-[10px] uppercase tracking-widest">الملاحظات</span>
            <p className="dark:text-gray-300 leading-relaxed text-xs">{sheep.notes}</p>
          </div>
        )}

        {/* Status Buttons */}
        <div className="flex items-center justify-center gap-3 mb-6 mt-2">
          {/* Health Status Button */}
          {sheep.status === 'sick' ? (
            <button
              onClick={async () => {
                showConfirm('تأكيد الشفاء', `هل أنت متأكد من تسجيل الشفاء لهذه الحالة؟`, async () => {
                  try {
                      await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), { status: 'healthy' });
                      setViewingSheep(undefined);
                  } catch (e) {
                      console.error('Update status error:', e);
                      showAlert('error', 'خطأ', 'حدث خطأ أثناء تحديث الحالة.');
                  }
                });
              }}
              className="flex-1 flex flex-row-reverse items-center justify-center gap-2 py-3 px-2 text-[11px] font-black text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-2xl shadow-sm transition"
            >
              مريض
              <Activity size={16} className="text-red-500" />
            </button>
          ) : (
            <button
              onClick={() => {
                setViewingSheep(undefined);
                openMedicalModal(sheep, { defaultStatusOnSave: 'sick', allowNoName: true, defaultRecordType: 'treatment' });
              }}
              className="flex-1 flex flex-row-reverse items-center justify-center gap-2 py-3 px-2 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-2xl shadow-sm transition"
            >
              سليم
              <HeartPulse size={16} className="text-emerald-500" />
            </button>
          )}

          {/* Reproduction Status Button (Females Only) */}
          {sheep.gender === 'female' && (() => {
            const ageLabel = getAnimalAgeLabel(sheep.birthDate, sheep.type, sheep.gender);
            const isBaby = ageLabel === 'طفل' || ageLabel === 'حوار' || ageLabel === 'مخلول' || ageLabel === 'صوص' || ageLabel === 'فرخ' || ageLabel === 'زغلول' || ageLabel === 'صوص البط' || ageLabel === 'فـريخ';
            if (isBaby) return null;

            if (!sheep.reproductionStatus || sheep.reproductionStatus === 'empty') {
              return (
                <button
                  onClick={() => setReproductionConfirmState({ sheep, currentStatus: 'empty', nextStatus: 'pregnant', expectedDurationDays: 150 })}
                  className="flex-1 flex flex-row-reverse items-center justify-center gap-2 py-3 px-2 text-[11px] font-black text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-2xl shadow-sm transition"
                >
                  غير مضرع
                  <Baby size={16} className="text-amber-500" />
                </button>
              );
            } else if (sheep.reproductionStatus === 'pregnant') {
              const daysPregnant = sheep.pregnancyDate ? Math.max(0, Math.floor((Date.now() - new Date(sheep.pregnancyDate).getTime()) / (1000 * 60 * 60 * 24))) : 0;
              const remainingDays = Math.max(0, 150 - daysPregnant);
              return (
                <button
                  onClick={() => setReproductionConfirmState({ sheep, currentStatus: 'pregnant', nextStatus: 'mother', expectedDurationDays: 90 })}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-2 font-black text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-2xl shadow-sm transition animate-pulse"
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>مضرع</span>
                    <Baby size={16} className="text-rose-500" />
                  </div>
                  <span className="text-[9px] opacity-80">(باقي {remainingDays} يوم)</span>
                </button>
              );
            } else {
              let remainingLactation = 90;
              if (sheep.lactationStartDate) {
                const startTime = new Date(sheep.lactationStartDate).getTime();
                if (!isNaN(startTime)) {
                  const daysLactation = Math.max(0, Math.floor((Date.now() - startTime) / (1000 * 60 * 60 * 24)));
                  remainingLactation = Math.max(0, 90 - daysLactation);
                }
              }
              return (
                <button
                  onClick={() => setReproductionConfirmState({ sheep, currentStatus: 'mother', nextStatus: 'empty', expectedDurationDays: 0 })}
                  className="flex-1 flex flex-col items-center justify-center gap-1 py-2 px-2 font-black text-pink-700 bg-pink-50 border border-pink-200 hover:bg-pink-100 rounded-2xl shadow-sm transition"
                >
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span>أم حضانة</span>
                    <Baby size={16} className="text-pink-500" />
                  </div>
                  <span className="text-[9px] opacity-80">(باقي {remainingLactation} يوم)</span>
                </button>
              );
            }
          })()}
        </div>

        {/* Warning if pregnant for > 5 months */}
        {sheep.gender === 'female' && sheep.reproductionStatus === 'pregnant' && sheep.pregnancyDate && (() => {
          const start = new Date(sheep.pregnancyDate);
          const diffDays = Math.ceil(Math.abs(Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 150) {
            return (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold p-2.5 rounded-xl text-center mb-6">
                ⚠️ تنبيه: مضى أكثر من 5 أشهر على الحمل!
              </div>
            );
          }
          return null;
        })()}

        <div className="grid grid-cols-3 gap-3">
          {can('canAddMedical') && (
            <button onClick={() => { setViewingSheep(undefined); openMedicalModal(sheep); }} className="relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 transition premium-shadow dark:bg-purple-900/20 dark:text-purple-300">
              <Syringe size={20} />
              تحصين
              {hasPendingVaccines(sheep) && (
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
              )}
            </button>
          )}

          {can('canMoveAnimals') && (
            <button onClick={() => { setViewingSheep(undefined); openMoveModal(sheep); }} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-orange-700 bg-orange-50 hover:bg-orange-100 transition premium-shadow dark:bg-orange-900/20 dark:text-orange-300">
              <ArrowRightLeft size={20} />
              نقل
            </button>
          )}

          {can('canEditAnimals') && (
            <button onClick={() => { setViewingSheep(undefined); openEditSheepModal(sheep); }} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 transition premium-shadow dark:bg-blue-900/20 dark:text-blue-300">
              <Edit size={20} />
              تعديل
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- Logic for Views ---


  // Unified Display Logic: If selectedGroupId exists, show children. If NOT, show Root Groups/Pens.
  // Filter pens for workers
  const visiblePens = pens.filter(p => {
    if (isOwner) return true;
    if (!currentUser?.accessiblePens || currentUser.accessiblePens.length === 0) return false;
    
    // Worker can see a pen if it's in their accessiblePens list OR if its parent is in the list
    if (currentUser.accessiblePens.includes(p.id)) return true;
    
    let currentPen: Pen | undefined = p;
    while (currentPen?.parentId) {
        if (currentUser.accessiblePens.includes(currentPen.parentId)) return true;
        currentPen = pens.find(x => x.id === currentPen?.parentId);
    }
    return false;
  });

  const displayedPens = selectedGroupId
    ? visiblePens.filter(p => p.parentId === selectedGroupId)
    : visiblePens.filter(p => p.isGroup || !p.parentId); // Show groups AND orphan pens at root level

  const selectedGroup = pens.find(p => p.id === selectedGroupId);

  // Derived state for owner name
  const activeOwnerName = selectedGroup?.ownerName || ownerName;

  // Handler for saving owner name
  const handleSaveOwnerName = (newName: string) => {
    if (selectedGroup) {
      const updatedPens = pens.map(p => p.id === selectedGroup.id ? { ...p, ownerName: newName } : p);
      setPens(updatedPens);
    } else {
      setOwnerName(newName);
    }
    setIsEditingOwner(false);
  };
  const selectedPen = pens.find(p => p.id === selectedPenId);
  const displayedSheep = (selectedPenId
    ? allSheep.filter(s => s.penId === selectedPenId)
    : selectedGroupId
      ? allSheep.filter(s => pens.find(p => p.id === s.penId)?.parentId === selectedGroupId)
      : [])
    .sort((a, b) => {
      // Primary: Tag Color (Alphabetical)
      const colorA = a.tagColor || '';
      const colorB = b.tagColor || '';
      if (colorA < colorB) return -1;
      if (colorA > colorB) return 1;

      // Secondary: Serial Number (Numeric)
      const numA = parseInt(a.serialNumber.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.serialNumber.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  // Mortality & Available Pens
  const mortalityPenId = selectedGroupId ? `mortality:${selectedGroupId} ` : '';
  // Relaxed filter to catch any whitespace variations or format mismatches
  const deceasedSheep = selectedGroupId ? allSheep.filter(s => s.penId.startsWith('mortality:') && s.penId.includes(selectedGroupId)) : [];

  const availablePensForMove = selectedGroupId ? [
    ...pens.filter(p => p.parentId === selectedGroupId && p.id !== selectedPenId && !p.isGroup),
    {
      id: mortalityPenId,
      name: 'المستبعدة',
      capacity: 9999,
      currentCount: deceasedSheep.length,
      isMain: false,
      parentId: selectedGroupId
    } as Pen
  ] : [];

  // Filter global sheep list for the current barn (for vaccines view)
  // We assume sheep belong to sub-pens of the barn.
  const barnSheep = selectedGroupId
    ? allSheep.filter(s => pens.find(p => p.id === s.penId)?.parentId === selectedGroupId)
    : [];

  const currentMetadata = getAnimalMetadata(selectedGroup?.animalType || 'sheep');

  // --- Renderers ---
  const renderPenCard = (pen: Pen) => {
    const penSheep = allSheep.filter(s => s.penId === pen.id);
    const maleCount = penSheep.filter(s => s.gender === 'male').length;
    const femaleCount = penSheep.filter(s => s.gender === 'female').length;
    
    // Chart Configuration
    const radius = 35;
    const strokeWidth = 10;
    const circumference = 2 * Math.PI * radius;
    const center = 50;

    const malePercent = penSheep.length ? maleCount / penSheep.length : 0;
    const femalePercent = penSheep.length ? femaleCount / penSheep.length : 0;
    const maleStroke = malePercent * circumference;
    const femaleStroke = femalePercent * circumference;
    const femaleOffset = -maleStroke;

    const getTextPos = (angleDeg: number, r: number = 35) => {
      const rad = (angleDeg - 90) * (Math.PI / 180);
      return {
        x: center + r * Math.cos(rad),
        y: center + r * Math.sin(rad)
      };
    };

    const maleAngle = malePercent * 360;
    const femaleAngle = femalePercent * 360;
    const malePos = getTextPos(maleAngle / 2);
    const femalePos = getTextPos(maleAngle + femaleAngle / 2);

    return (
      <div
        key={pen.id}
        onClick={() => pen.isGroup ? enterGroup(pen.id) : enterSheepList(pen.id)}
        className="flex-none w-[48%] md:w-[280px] snap-center flex flex-col bg-[#FCFBF4] rounded-[2.5rem] p-5 shadow-sm border border-gray-100/50 transition-all duration-500 relative cursor-pointer hover:shadow-xl hover:border-[#795548]/20 group hover-glow dark:bg-slate-900 dark:border-slate-800"
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-lg text-[#3E2723] dark:text-gray-200 group-hover:text-[#795548] transition-colors line-clamp-1 w-full text-center">
            {pen.name}
          </h3>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center my-4">
          <div className="relative w-32 h-32 premium-shadow rounded-full">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} className="dark:stroke-slate-800" />
              {maleCount > 0 && (
                <circle
                  cx="50" cy="50" r={radius} fill="none"
                  stroke="#3b82f6" strokeWidth={strokeWidth}
                  strokeDasharray={`${maleStroke} ${circumference}`}
                  strokeLinecap="round"
                />
              )}
              {femaleCount > 0 && (
                <circle
                  cx="50" cy="50" r={radius} fill="none"
                  stroke="#10b981" strokeWidth={strokeWidth}
                  strokeDasharray={`${femaleStroke} ${circumference}`}
                  strokeDashoffset={femaleOffset}
                  strokeLinecap="round"
                />
              )}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <span className="text-3xl font-black text-[#3E2723] dark:text-gray-100">{pen.currentCount || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 uppercase">رأس</span>
            </div>

            {maleCount > 0 && (
              <div
                className="absolute w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white dark:bg-blue-900 dark:text-blue-200 dark:border-slate-800"
                style={{ left: `${malePos.x}%`, top: `${malePos.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {maleCount}
              </div>
            )}
            {femaleCount > 0 && (
              <div
                className="absolute w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-black shadow-md border-2 border-white dark:bg-emerald-900 dark:text-emerald-200 dark:border-slate-800"
                style={{ left: `${femalePos.x}%`, top: `${femalePos.y}%`, transform: 'translate(-50%, -50%)' }}
              >
                {femaleCount}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-center gap-2 w-full">
          <button
            onClick={(e) => { e.stopPropagation(); pen.isGroup ? enterGroup(pen.id) : enterSheepList(pen.id); }}
            className="flex-1 bg-[#3E2723] text-white h-10 rounded-2xl text-xs font-black hover:bg-[#5D4037] transition flex items-center justify-center gap-2 shadow-lg dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Eye size={16} />
            <span>عرض</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(pen); }}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400"
          >
            <Edit size={16} />
          </button>

          {isOwner && (
            <button
              onClick={(e) => { e.stopPropagation(); handleDeletePen(pen.id, pen.isGroup || false); }}
              className="w-10 h-10 flex items-center justify-center rounded-2xl bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 transition border border-gray-100 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    );
  };

  // === AUTH GUARD ===
  if (!currentUser) {
    return (
      <AuthScreen
        users={users}
        isLoading={isLoadingUsers}
        onLogin={handleLogin}
        onRegisterOwner={handleRegisterOwner}
        onUpdateUser={handleUpdateUser}
      />
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-[#fcfbf4] transition-colors duration-300 dark:bg-slate-950 dark:text-gray-100" dir={appLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Persistent Logout & Settings Buttons */}
      {(activeTab === 'dashboard' || (activeTab === 'pens' && !selectedGroupId)) && (
        <div className="fixed top-6 left-6 right-6 z-[100] pointer-events-none flex justify-between items-center" dir="rtl">
          <div className="flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={handleLogout} 
              className="text-gray-400 hover:text-red-500 transition-all duration-300 bg-white p-3.5 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl active:scale-90 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
              title={t.logout}
            >
              <LogOut size={22} strokeWidth={2.5} className="rotate-180" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 pointer-events-auto">
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="text-gray-400 hover:text-[#795548] transition-all duration-300 bg-white p-3.5 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl active:scale-90 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
              title={t.settings}
            >
              <Settings size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Global Header - Simplified/Restored */}
      {/* Hide Header on Dashboard AND Root Pens View (My Barns List) */}
      {activeTab !== 'dashboard' && !(activeTab === 'pens' && !selectedGroupId) && !(activeTab === 'pens' && selectedGroupId && barnTab !== 'pens') && (
        <div className="bg-white/90 backdrop-blur-sm p-4 shadow-sm sticky top-0 z-30 mb-0 dark:bg-slate-900 dark:border-b dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {(activeTab === 'pens' && selectedGroupId) || (activeTab === 'sheepList') ? (
                <button
                  onClick={() => {
                    if (activeTab === 'sheepList') { setSelectedPenId(null); setActiveTab('pens'); }
                    else { setSelectedGroupId(null); }
                  }}
                  className="p-2 rounded-xl bg-[#fcfbf4] hover:bg-gray-100 text-gray-500 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-400"
                >
                  <ArrowRight size={20} className="rtl:rotate-180" />
                </button>
              ) : null}

              {selectedPen ? (
                <h1 className="text-xl font-bold text-[#3E2723] flex items-center gap-3 dark:text-gray-100">
                  {selectedPen.name}
                </h1>
              ) : selectedGroup ? (
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-[#3E2723] dark:text-gray-100 leading-tight">
                    {selectedGroup.name}
                  </h1>
                  <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 mt-0.5">
                    عدد الأقسام: {pens.filter(p => p.parentId === selectedGroupId).length}
                  </span>
                </div>
              ) : (
                <h1 className="text-xl font-bold text-[#3E2723] flex items-center gap-3 dark:text-gray-100">
                  {t.myBarns}
                </h1>
              )}
            </div>

            {/* Global Header Actions (Moved from inner header) */}
            <div className="flex items-center gap-2 shrink-0">
              {activeTab === 'pens' && selectedGroupId && (
                <>
                  {can('canAddAnimals') && <button onClick={() => openNewSheepModal()} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-bold border border-orange-100 dark:bg-orange-900/20 whitespace-nowrap"><Dna size={12} /> {t.head} <Plus size={10} /></button>}
                  {can('canAddPens') && <button onClick={openAddSectionModal} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold border border-blue-100 dark:bg-blue-900/20 whitespace-nowrap"><Warehouse size={12} /> قسم <Plus size={10} /></button>}
                  <button 
                    onClick={() => setIsChatOpen(true)} 
                    className="relative flex items-center justify-center p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition dark:bg-emerald-900/20 dark:border-emerald-900/50"
                    title="رسايل"
                  >
                    <MessageCircle size={16} />
                    {unreadChatCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-white text-[9px] items-center justify-center font-bold">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                        </span>
                      </span>
                    )}
                  </button>
                </>
              )}
              {activeTab === 'sheepList' && selectedPen && (
                <div className="flex items-center gap-2">
                  <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl text-[10px] font-bold dark:bg-slate-800 dark:text-gray-400">
                    {displayedSheep.length} {currentMetadata.headLabel}
                  </span>
                  {isOwner && can('canAddAnimals') && (
                    <button 
                      onClick={() => openNewSheepModal(selectedPen.id)} 
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-bold border border-orange-100 dark:bg-orange-900/20 whitespace-nowrap"
                    >
                      <Plus size={14} /> {t.head}
                    </button>
                  )}
                   {/* Edit Section Button */}
                  {can('canEditPens') && (
                    <button 
                      onClick={() => { setEditingPen(selectedPen); setIsAddingGroup(false); setIsModalOpen(true); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold border border-indigo-100 hover:bg-indigo-100 transition dark:bg-indigo-900/20 dark:border-indigo-900/50 whitespace-nowrap"
                      title="تعديل القسم"
                    >
                      <Edit size={12} /> تعديل
                    </button>
                  )}
                  {can('canDeletePens') && (
                    <button 
                      onClick={() => showConfirm('تأكيد الحذف', `هل أنت متأكد من حذف ${selectedPen.name}؟`, () => { handleDeletePen(selectedPen.id, false); setSelectedPenId(null); setActiveTab('pens'); })}
                      className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-100 transition dark:bg-red-900/20 dark:border-red-900/50"
                      title="حذف القسم"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-24 relative premium-gradient">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="p-4 md:p-8 animate-fade-in">
             <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
               <h2 className="text-2xl font-bold mb-4">{t.farmSummary}</h2>
               {/* Dashboard content was implied but activeTab dashboard logic is minimal here */}
               <p className="text-gray-500">نظرة عامة على المزرعة...</p>
             </div>
          </div>
        )}

        {/* Pens / Barns View */}
        {activeTab === 'pens' && (
          <div className="p-4 md:p-8 space-y-6 animate-fade-in h-fit min-h-full flex flex-col">
            {!selectedGroupId ? (
              /* Root View (Barns List) */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex flex-col items-center justify-center pt-12 pb-8 mb-8 relative animate-slide-up">
              <div className="relative group">
                <div className="w-16 h-16 rounded-2xl bg-[#3E2723] flex items-center justify-center text-white mb-4 shadow-xl premium-shadow animate-scale-in dark:bg-orange-600 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Warehouse size={32} />
                </div>
              </div>
                  
                  <h2 className="text-4xl font-black text-[#3E2723] dark:text-gray-100 tracking-tight">{t.myBarns}</h2>
                  <div className="w-16 h-1.5 bg-[#795548] rounded-full mt-4 dark:bg-orange-600 opacity-20"></div>
                  <p className="text-[9px] text-gray-400 font-black mt-4 uppercase tracking-[0.2em]">من تطوير JokeR_β</p>
                </div>

                 {/* Section Filtering & Custom Reordering Controls (Root View) */}
                 <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-6 gap-3" dir="rtl">
                   {/* Search/Filter Barns Dropdown */}
                   <div className="relative flex-1" ref={barnFilterRef}>
                     <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none z-10" />
                     <button
                       type="button"
                       onClick={() => setIsBarnFilterDropdownOpen(!isBarnFilterDropdownOpen)}
                       className="w-full pr-8 pl-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548] dark:text-white shadow-sm flex items-center justify-between text-right cursor-pointer text-gray-700 dark:text-gray-200"
                     >
                       <span>{barnSearchQuery || 'كل الحظائر'}</span>
                       <div className="text-gray-400 w-3 h-3 flex items-center justify-center text-[10px]">
                         ▼
                       </div>
                     </button>

                     {isBarnFilterDropdownOpen && (
                       <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                         <div className="p-2 space-y-1">
                           <button
                             type="button"
                             onClick={() => {
                               setBarnSearchQuery('');
                               setIsBarnFilterDropdownOpen(false);
                             }}
                             className={`w-full text-right px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                               barnSearchQuery === ''
                                 ? 'bg-[#795548] text-white shadow-md'
                                 : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                             }`}
                           >
                             كل الحظائر
                           </button>
                           {displayedPens.map((p) => (
                             <button
                               key={p.id}
                               type="button"
                               onClick={() => {
                                 setBarnSearchQuery(p.name);
                                 setIsBarnFilterDropdownOpen(false);
                               }}
                               className={`w-full text-right px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                                 barnSearchQuery === p.name
                                   ? 'bg-[#795548] text-white shadow-md'
                                   : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                               }`}
                             >
                               {p.name}
                             </button>
                           ))}
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Reorder Button */}
                   {can('canReorderPens') && (
                     <button
                       onClick={() => setIsReorderPensOpen(true)}
                       className="flex items-center gap-1 px-3 py-2 bg-[#795548]/10 text-[#795548] rounded-xl text-[10px] font-black hover:bg-[#795548] hover:text-white transition-all dark:bg-orange-500/10 dark:text-orange-400 whitespace-nowrap shadow-sm border border-[#795548]/5 dark:border-orange-500/10"
                       title="إعادة ترتيب الأقسام"
                     >
                       <ArrowRightLeft size={12} className="rotate-90" />
                       <span>ترتيب الأقسام</span>
                     </button>
                   )}
                 </div>

                  <div className="flex-1 px-4 sm:px-6 lg:px-8">
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-32">
                     {(() => {
                       const filteredBarns = displayedPens
                         .filter(pen => pen.name.toLowerCase().includes(barnSearchQuery.toLowerCase()))
                         .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                       return filteredBarns.map((pen) => {
                         const sectionsCount = pens.filter(p => p.parentId === pen.id).length;
                         return (
                           <div key={pen.id} className="hover-glow transition-all">
                             <SwipeableBarnCard onEdit={() => openEditModal(pen)} canEdit={isOwner || can('canEditBarns')} canDelete={isOwner || can('canDeleteBarns')}
                               name={pen.name} 
                               sectionsCount={sectionsCount}
                               onClick={() => enterGroup(pen.id)} 
                               onDelete={() => handleDeletePen(pen.id, true)} 
                             />
                           </div>
                         );
                       });
                     })()}
                   </div>
                 </div>

                {/* Square FAB for Add Barn - Restricted to Owners/Permission */}
                {(isOwner || can('canAddBarns')) && (
                  <div className="fixed bottom-32 left-6 md:left-12 z-[100] pointer-events-none">
                    <button 
                      onClick={openAddBarnModal} 
                      className="pointer-events-auto w-14 h-14 bg-[#795548] text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all dark:bg-orange-600 premium-shadow animate-pulse-subtle"
                      title={t.addBarn}
                    >
                      <Plus size={32} />
                    </button>
                  </div>
                )}

                <div className="fixed bottom-10 left-0 right-0 p-6 flex flex-col items-center gap-4 pointer-events-none">
                </div>
              </div>
            ) : (
              /* Inside Barn View */
              <div className="flex-1 flex flex-col min-h-0 relative">
                {barnTab === 'pens' && (
                  <div className="flex-1 flex flex-col overflow-hidden">

                    <div className="flex-1 overflow-y-auto pb-40 pt-6">
                      {/* Section Filtering & Custom Reordering Controls */}
                      <div className="flex items-center justify-between px-4 md:px-8 mb-4 gap-3" dir="rtl">
                        {/* Search/Filter Sections Input */}
                        <div className="relative flex-1" ref={sectionFilterRef}>
                          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none z-10" />
                          <button
                            type="button"
                            onClick={() => setIsSectionFilterDropdownOpen(!isSectionFilterDropdownOpen)}
                            className="w-full pr-8 pl-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-[#795548] focus:ring-1 focus:ring-[#795548] dark:text-white shadow-sm flex items-center justify-between text-right cursor-pointer text-gray-700 dark:text-gray-200"
                          >
                            <span>{sectionSearchQuery || 'كل الأقسام'}</span>
                            <div className="text-gray-400 w-3 h-3 flex items-center justify-center text-[10px]">
                              ▼
                            </div>
                          </button>

                          {isSectionFilterDropdownOpen && (
                            <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                              <div className="p-2 space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSectionSearchQuery('');
                                    setIsSectionFilterDropdownOpen(false);
                                  }}
                                  className={`w-full text-right px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                                    sectionSearchQuery === ''
                                      ? 'bg-[#795548] text-white shadow-md'
                                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  كل الأقسام
                                </button>
                                {displayedPens.map((p) => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setSectionSearchQuery(p.name);
                                      setIsSectionFilterDropdownOpen(false);
                                    }}
                                    className={`w-full text-right px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                                      sectionSearchQuery === p.name
                                        ? 'bg-[#795548] text-white shadow-md'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                                    }`}
                                  >
                                    {p.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Reorder Button */}
                        {can('canReorderPens') && (
                          <button
                            onClick={() => setIsReorderPensOpen(true)}
                            className="flex items-center gap-1 px-3 py-2 bg-[#795548]/10 text-[#795548] rounded-xl text-[10px] font-black hover:bg-[#795548] hover:text-white transition-all dark:bg-orange-500/10 dark:text-orange-400 whitespace-nowrap shadow-sm border border-[#795548]/5 dark:border-orange-500/10"
                            title="إعادة ترتيب الأقسام"
                          >
                            <ArrowRightLeft size={12} className="rotate-90" />
                            <span>ترتيب الأقسام</span>
                          </button>
                        )}
                      </div>

                      <div className="flex overflow-x-auto snap-x gap-4 no-scrollbar pb-6 px-4 md:px-8">
                        {displayedPens
                          .filter(pen => pen.name.includes(sectionSearchQuery))
                          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                          .map(pen => (
                          <div key={pen.id} onClick={() => enterSheepList(pen.id)} className="flex-none w-32 h-40 snap-center bg-white/95 backdrop-blur-sm rounded-[2rem] p-3 shadow-lg border border-gray-100 cursor-pointer dark:bg-slate-900 dark:border-slate-800 flex flex-col items-center justify-between hover:scale-[1.03] transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-orange-500/5 rounded-bl-3xl" />
                            <div className="w-10 h-10 rounded-2xl bg-[#795548]/5 flex items-center justify-center text-[#795548] mb-1 group-hover:bg-[#795548] group-hover:text-white transition-colors dark:bg-orange-500/10 dark:text-orange-500">
                               <Warehouse size={20} />
                            </div>
                            <h3 className="font-black text-[11px] text-[#3E2723] dark:text-gray-100 text-center truncate w-full px-1 mb-1">{pen.name}</h3>
                            <div className="flex items-center gap-1 mb-2">
                               <span className="text-xl font-black text-[#795548] dark:text-orange-500">{allSheep.filter(s => s.penId === pen.id).length}</span>
                               <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">{t.head}</span>
                            </div>
                            <div className="flex gap-1 w-full">
                               <button onClick={(e) => { e.stopPropagation(); enterSheepList(pen.id); }} className="flex-1 bg-gray-50 text-gray-500 py-1.5 rounded-xl text-[9px] font-black dark:bg-slate-800 hover:bg-[#795548] hover:text-white transition-all border border-gray-100 dark:border-slate-700">التفاصيل</button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {displayedPens.length > 0 && (() => {
                        const barnAnimals = allSheep.filter(s => {
                          const pen = pens.find(p => p.id === s.penId);
                          return (pen?.parentId === selectedGroupId || pen?.id === selectedGroupId) && !s.penId?.includes('mortality');
                        });
                        const total = barnAnimals.length;
                        if (total === 0) return null;
                        
                        const typeCounts = barnAnimals.reduce((acc, s) => {
                          const key = s.type; // Removed tagColor from key as requested
                          acc[key] = (acc[key] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>);
                        
                        const chartData = Object.entries(typeCounts).map(([name, value]) => ({ 
                          name, value, color: barnAnimals.find(s => s.type === name)?.tagColor || '#D7CCC8' 
                        }));
                        
                        const radius = 75;
                        const circumference = 2 * Math.PI * radius;
                        let acc = 0;

                        return (
                          <>
                             {can('canViewProduction') && (
                              <div className="mt-8 space-y-3 px-4 md:px-8">
                                <h3 className="text-[10px] font-black text-[#3E2723] dark:text-gray-100 text-right uppercase tracking-[0.2em]">{t.typeStats}</h3>
                                <div className="bg-white/90 rounded-[2rem] p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-6 dark:bg-slate-900 dark:border-slate-800 backdrop-blur-md">
                                  <div className="flex-1 grid gap-2 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                                    {chartData.map((d, i) => (
                                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50/50 dark:bg-slate-800 justify-start transition-all hover:bg-gray-100/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color && d.color.startsWith('#') ? d.color : (d.color === 'yellow' ? '#FDD835' : (d.color === 'red' ? '#E53935' : '#D7CCC8')) }} />
                                          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{d.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-[#3E2723] dark:text-gray-100 shrink-0 ml-auto">{d.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="relative w-20 h-20 shrink-0">
                                    <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 filter drop-shadow-sm">
                                      <circle cx="90" cy="90" r={radius} fill="none" stroke="#f3f4f6" strokeWidth={18} className="dark:stroke-slate-800" />
                                      {chartData.map((d, i) => {
                                        const p = (d.value as number) / (total as number);
                                        const dash = p * circumference;
                                        const off = -(acc * circumference);
                                        acc += p;
                                        return <circle key={i} cx="90" cy="90" r={radius} fill="none" stroke={d.color && d.color.startsWith('#') ? d.color : '#D7CCC8'} strokeWidth={18} strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-1000" />;
                                      })}
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                                      <span className="text-xl font-black text-[#3E2723] dark:text-gray-100">{total}</span>
                                      <span className="text-[7px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">{t.head}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                              {/* Recent Events Section (Inside Barn View) - Under Type Stats */}
                              {can('canViewEvents') && (
                                <div className="mt-8 px-4 md:px-8 animate-fade-in">
                                  <div className="bg-white/95 rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800 backdrop-blur-md">
                                    <div className="flex justify-between items-center mb-6">
                                      <button onClick={() => setIsRecentsOpen(true)} className="text-[10px] font-bold text-gray-400 hover:text-[#795548] flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg transition dark:bg-slate-800">
                                        سجل كامل <ChevronLeft size={10} className="rotate-180" />
                                      </button>
                                      
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">الأحداث الأخيرة</h3>
                                        <div className="p-1.5 bg-pink-50 text-pink-700 rounded-lg dark:bg-pink-900/20"><Calendar size={14} /></div>
                                      </div>
                                    </div>
                                    
                                    {activityLog.length === 0 ? (
                                      <div className="text-center py-6 text-gray-300 font-bold text-xs">لا توجد أحداث مسجلة بالحظيرة</div>
                                    ) : (
                                      <div className="relative pr-3 space-y-5 before:absolute before:right-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800">
                                        {activityLog.slice(0, 5).map(log => {
                                          // Determine dot color based on action type
                                          let dotColor = 'bg-slate-400 border-slate-200';
                                          if (log.action.includes('سجل طبي') || log.action.includes('تلقيح') || log.action.includes('تحصين') || log.action.includes('علاج') || log.action.includes('شفاء') || log.action.includes('صحة')) {
                                            dotColor = 'bg-purple-500 border-purple-200';
                                          } else if (log.action.includes('إضافة') || log.action.includes('تسجيل')) {
                                            dotColor = 'bg-emerald-500 border-emerald-200';
                                          } else if (log.action.includes('نقل') || log.action.includes('تحديث') || log.action.includes('تعديل')) {
                                            dotColor = 'bg-orange-500 border-orange-200';
                                          } else if (log.action.includes('حذف') || log.action.includes('استبعاد') || log.action.includes('وفاة')) {
                                            dotColor = 'bg-red-500 border-red-200';
                                          }

                                          const isExpanded = expandedActivityId === log.id;

                                           return (
                                             <div key={log.id} className="relative flex flex-col animate-scale-in">
                                               <div className="flex items-start justify-between gap-4 pr-6">
                                                 {/* Dot marker */}
                                                 <div className={`absolute right-[9px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-[#FCFBF4] dark:border-slate-900 ${dotColor} shadow-sm shrink-0`} />
                                                 
                                                 {/* Right content: Action details */}
                                                 <div className="flex-1 text-right min-w-0 pr-1">
                                                   <h4 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 leading-snug">
                                                     {log.action}
                                                   </h4>
                                                   <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center justify-start gap-1 leading-relaxed">
                                                     {(log.tagColor || (log.serialNumber ? allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor : undefined)) && (
                                                       <span 
                                                         className="w-2.5 h-2.5 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                                         style={{ backgroundColor: log.tagColor || allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor }}
                                                       />
                                                     )}
                                                     <span className="truncate">{log.detail || 'تحديث بيانات الحلال'}</span>
                                                   </p>
                                                 </div>

                                                 {/* Left content: Date & Show details button */}
                                                 <div className="text-left flex flex-col items-start shrink-0">
                                                   <span className="text-[9px] font-extrabold text-gray-400 leading-none">
                                                     {new Date(log.timestamp).toLocaleDateString('ar-EG', { numberingSystem: 'latn' })}
                                                   </span>
                                                   <button
                                                     onClick={() => setExpandedActivityId(isExpanded ? null : log.id)}
                                                     className="text-[9px] font-black text-orange-600 hover:text-orange-800 transition-colors mt-1 cursor-pointer hover:underline bg-transparent border-0 p-0"
                                                   >
                                                     {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                                                   </button>
                                                 </div>
                                               </div>

                                               {/* Accordion dropdown content */}
                                               {isExpanded && (
                                                 <div className="mr-6 ml-2 mt-2 p-3 bg-orange-50/50 dark:bg-slate-800/50 rounded-2xl border border-orange-100/30 dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 space-y-1.5 animate-slide-up text-right">
                                                   {can('canViewActivity') && <div><span className="text-gray-400">القائم بالعمل: </span>{log.userName}</div>}
                                                   <div><span className="text-gray-400">الإجراء: </span>{log.action}</div>
                                                   <div><span className="text-gray-400">التفاصيل: </span>{log.detail || 'تحديث بيانات'}</div>
                                                    {(log.tagColor || (log.serialNumber ? allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor : undefined)) && (
                                                      <div className="flex items-center justify-start gap-1.5">
                                                        <span className="text-gray-400">لون الشارة: </span>
                                                        <span className="inline-flex items-center gap-1.5">
                                                          <span 
                                                            className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                                            style={{ backgroundColor: log.tagColor || allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor }}
                                                          />
                                                          {colorNames[log.tagColor || allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor || ''] || 'ملون'}
                                                        </span>
                                                      </div>
                                                    )}
                                                   
                                                   <div><span className="text-gray-400">التاريخ: </span>{new Date(log.timestamp).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</div>
                                                 </div>
                                               )}
                                             </div>
                                           );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                          </>
                        );
                      })() }
                    </div>
                  </div>
                )}

                {/* Sub-Tabs for Feed, Vaccines, Expenses */}
                {barnTab === 'feed' && <div className="max-w-5xl mx-auto pt-4 pb-24 px-4"><FeedManager items={feedItems} onUpdate={handleUpdateFeed} penId={selectedGroupId} animalType={selectedGroup?.animalType} onAddExpense={handleSaveExpense} isOwner={isOwner} canEdit={can('canEditFeed')} currentUser={currentUser} onShowAlert={showAlert} onShowConfirm={showConfirm} /></div>}
                {barnTab === 'vaccines' && <div className="max-w-2xl mx-auto pt-4 pb-24 px-4 flex justify-center"><VaccinationGuide sheepList={barnSheep} animalType={selectedGroup?.animalType} language={appLanguage} /></div>}
                {barnTab === 'expenses' && <div className="max-w-5xl mx-auto pt-4 pb-24 px-4"><FinanceManager penId={selectedGroupId!} expenses={expenses} sales={sales} animals={displayedSheep} animalType={selectedGroup?.animalType} onSaveExpense={handleSaveExpense} onSaveSale={handleSaveSale} onDeleteExpense={handleDeleteExpense} onDeleteSale={handleDeleteSale} isOwner={isOwner} onShowAlert={showAlert} onShowConfirm={showConfirm} /></div>}

                {/* Barn Secondary Navigation */}
                <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none">
                   <div className="bg-white border border-gray-100 rounded-2xl shadow-xl w-[90%] max-w-lg pointer-events-auto flex items-center justify-between px-2 py-2 dark:bg-slate-900 dark:border-slate-800">
                     {isOwner && <button onClick={() => setBarnTab('expenses')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'expenses' ? 'text-orange-600' : 'text-gray-400'}`}><Wallet size={24} /><span className="text-[10px] font-bold">{t.financials}</span></button>}
                     <button onClick={() => setBarnTab('vaccines')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'vaccines' ? 'text-orange-600' : 'text-gray-400'}`}><ShieldCheck size={24} /><span className="text-[10px] font-bold">{t.vaccination}</span></button>
                      <div className="relative -top-6"><button onClick={() => setIsDashboardOpen(true)} className="w-14 h-14 bg-[#795548] rounded-full shadow-lg flex items-center justify-center text-white border-4 border-[#fcfbf4] dark:bg-orange-600 dark:border-slate-950"><Plus size={28} strokeWidth={3} /></button></div>
                     <button onClick={() => setBarnTab('feed')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'feed' ? 'text-orange-600' : 'text-gray-400'}`}><Wheat size={24} /><span className="text-[10px] font-bold">{t.stock}</span></button>
                     <button onClick={() => setBarnTab('pens')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'pens' ? 'text-orange-600' : 'text-gray-400'}`}><Warehouse size={24} /><span className="text-[10px] font-bold">{t.sections}</span></button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sheep List View */}
        {activeTab === 'sheepList' && selectedPen && (
          <div className="p-4 md:p-8 space-y-6 animate-fade-in h-[calc(100vh-64px)] overflow-y-auto">
             <div className="bg-white/80 rounded-[2.5rem] shadow-sm border border-gray-100 p-6 dark:bg-slate-900">
                {displayedSheep.length > 0 ? (
                  <div className={`grid ${ (selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' }`}>
                    {(selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') ? (
                       Object.values(displayedSheep.reduce((acc, s) => {
                          const key = `${s.type}-${s.tagColor || 'none'}`;
                          if (!acc[key]) acc[key] = { type: s.type, tagColor: s.tagColor, male: 0, female: 0 };
                          if (s.gender === 'male') acc[key].male++; else acc[key].female++;
                          return acc;
                        }, {} as any)).map((group: any, idx) => (
                          <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 dark:bg-slate-900">
                             <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: group.tagColor || '#D7CCC8' }}><Dna size={18} className="text-white" /></div>
                                 <h3 className="font-bold text-gray-800 dark:text-gray-100">{group.type}</h3>
                               </div>
                               <span className="text-xs font-black bg-[#795548] text-white px-2 py-1 rounded-lg">{group.male + group.female} {currentMetadata.headLabel}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-center">
                               <div className="bg-blue-50/50 p-2 rounded-xl"><span className="text-[10px] block">ذكور</span><span className="font-black text-blue-700">{group.male}</span></div>
                               <div className="bg-pink-50/50 p-2 rounded-xl"><span className="text-[10px] block">إناث</span><span className="font-black text-pink-700">{group.female}</span></div>
                             </div>
                          </div>
                       ))
                    ) : (
                      displayedSheep.map(sheep => renderSheepRow(sheep))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-20"><Warehouse size={64} /><p className="font-bold">لا توجد بيانات</p></div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dashboard Summary Modal - Restored and Restricted */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-[#FCFBF4] w-full max-w-sm h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-[#E8E5DF] animate-scale-in dark:bg-slate-950 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-center bg-transparent no-print">
              <button 
                onClick={() => setIsDashboardOpen(false)} 
                className="p-2.5 bg-white text-gray-400 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition dark:bg-slate-900 dark:border dark:border-slate-800"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-black text-[#3E2723] flex items-center gap-3 dark:text-gray-100">
                <LayoutGrid className="text-orange-600" size={24} />
                {t.farmSummary}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-5 custom-scrollbar">
              {/* Grid Menu */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'feed', label: 'إدارة الأعلاف', icon: Wheat, color: 'text-orange-600 bg-orange-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('feed'); setIsReportsModalOpen(true); } },
                  { id: 'health', label: 'الحالة الصحية', icon: Activity, color: 'text-blue-600 bg-blue-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('health'); setIsReportsModalOpen(true); } },
                  { id: 'sales', label: 'المبيعات', icon: Banknote, color: 'text-[#00E676] bg-emerald-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('sales'); setIsReportsModalOpen(true); } },
                  { id: 'finance', label: 'المصاريف', icon: Wallet, color: 'text-green-600 bg-green-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('financial'); setIsReportsModalOpen(true); } },
                  { id: 'excluded', label: 'المستبعدة', icon: Skull, color: 'text-red-600 bg-red-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsDeathsModalOpen(true); } },
                  { id: 'production', label: 'سجل الإنتاج', icon: BarChart3, color: 'text-purple-600 bg-purple-50', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsStatsModalOpen(true); } },
                  { id: 'workers', label: 'إدارة العمال', icon: Users, color: 'text-[#795548] bg-[#795548]/10', onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsWorkerManageOpen(true); } },
                ].map(item => (
                  <button 
                    key={item.id}
                    onClick={item.onClick}
                    className="bg-white p-3 rounded-2xl border border-[#EFECE6] shadow-sm flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all dark:bg-slate-900 dark:border-slate-800 h-[5.6rem]"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.color} dark:bg-white/5`}>
                      <item.icon size={18} />
                    </div>
                    <span className="font-bold text-[10.5px] text-gray-700 dark:text-gray-200">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent Worker Activities Card (Timeline Style) */}
              <div className="bg-white border border-[#EFECE6] rounded-[2rem] p-5 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={async () => { 
                      setIsDashboardOpen(false); 
                      setReturnToDashboard(true); 
                      if (currentUser) {
                        try {
                          await updateDoc(doc(db, 'users', currentUser.id), { lastSeenEventsTime: Date.now() });
                        } catch (e) { console.error(e); }
                      }
                      setIsWorkerActivityOpen(true); 
                    }}
                    className="px-3 py-1.5 bg-[#F5F2EC] hover:bg-[#EFEBE9] text-[#795548] font-bold text-[10px] rounded-full transition-colors flex items-center gap-1"
                  >
                    عرض الكل &lt;
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-[#3E2723] dark:text-gray-100">سجل العمال</h3>
                    <History size={16} className="text-[#795548]" />
                  </div>
                </div>

                <div className="relative pr-3 space-y-5 before:absolute before:right-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800">
                  {(() => {
                    const workerActivities = activityLog.filter(log => {
                      if (log.userRole) return log.userRole === 'worker';
                      const u = users.find(user => user.id === log.userId || user.name === log.userName);
                      if (u) return u.role === 'worker';
                      return log.userName !== 'المالك' && log.userId !== currentUser?.id;
                    });

                    if (workerActivities.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-300 font-bold text-xs">لا توجد أنشطة عمال مسجلة</div>
                      );
                    }

                    return workerActivities.slice(0, 5).map(log => {
                      // Determine dot color based on action type
                      let dotColor = 'bg-slate-400 border-slate-200';
                      if (log.action.includes('سجل طبي') || log.action.includes('تلقيح') || log.action.includes('تحصين') || log.action.includes('علاج') || log.action.includes('شفاء') || log.action.includes('صحة')) {
                        dotColor = 'bg-purple-500 border-purple-200';
                      } else if (log.action.includes('إضافة') || log.action.includes('تسجيل')) {
                        dotColor = 'bg-emerald-500 border-emerald-200';
                      } else if (log.action.includes('نقل') || log.action.includes('تحديث') || log.action.includes('تعديل')) {
                        dotColor = 'bg-orange-500 border-orange-200';
                      } else if (log.action.includes('حذف') || log.action.includes('استبعاد') || log.action.includes('وفاة')) {
                        dotColor = 'bg-red-500 border-red-200';
                      }

                      const isExpanded = expandedActivityId === log.id;

                      return (
                        <div key={log.id} className="relative flex flex-col animate-scale-in">
                          <div className="flex items-start justify-between gap-4 pr-6">
                            {/* Dot marker */}
                            <div className={`absolute right-[9px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-[#FCFBF4] dark:border-slate-950 ${dotColor} shadow-sm shrink-0`} />
                            
                            {/* Right content: Action details */}
                            <div className="flex-1 text-right min-w-0 pr-1">
                              <h4 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 leading-snug">
                                {log.userName}: {log.action}
                              </h4>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center justify-start gap-1 leading-relaxed">
                                {(log.tagColor || (log.serialNumber ? allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor : undefined)) && (
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                    style={{ backgroundColor: log.tagColor || allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor }}
                                  />
                                )}
                                <span className="truncate">{log.detail || 'تحديث بيانات الحظيرة'}</span>
                              </p>
                            </div>

                            {/* Left content: Date & Show details button */}
                            <div className="text-left flex flex-col items-start shrink-0">
                              <span className="text-[9px] font-extrabold text-gray-400 leading-none">
                                {new Date(log.timestamp).toLocaleDateString('en-GB')}
                              </span>
                              <button
                                onClick={() => setExpandedActivityId(isExpanded ? null : log.id)}
                                className="text-[9px] font-black text-orange-600 hover:text-orange-800 transition-colors mt-1 cursor-pointer hover:underline bg-transparent border-0 p-0"
                              >
                                {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                              </button>
                            </div>
                          </div>

                          {/* Accordion dropdown content */}
                          {isExpanded && (
                            <div className="mr-6 ml-2 mt-2 p-3 bg-orange-50/50 dark:bg-slate-800/50 rounded-2xl border border-orange-100/30 dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 space-y-1.5 animate-slide-up text-right">
                              <div><span className="text-gray-400">العامل: </span>{log.userName}</div>
                              <div><span className="text-gray-400">الإجراء: </span>{log.action}</div>
                              <div><span className="text-gray-400">التفاصيل: </span>{log.detail || 'تحديث بيانات'}</div>

                              <div><span className="text-gray-400">التاريخ: </span>{new Date(log.timestamp).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Recent Events Full Modal */}
      {isRecentsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#fcfbf4] w-full max-w-lg h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <Calendar className="text-[#795548]" />
                  سجل الأحداث
                </h3>
                <button onClick={() => {
                  setIsRecentsOpen(false);
                  if (returnToDashboard) {
                    setIsDashboardOpen(true);
                    setReturnToDashboard(false);
                  }
                  setCustomDateRange({ start: '', end: '' }); // Reset date filter
                  setExpandedEventId(null);
                }} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-500">
                  <X size={20} />
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-1.5">
                {/* Custom Date Range Filter */}
                <div className="flex items-center gap-1 mb-1 bg-gray-50 p-1 rounded-lg border border-gray-100" dir="rtl">
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[8px] font-black text-gray-400 shrink-0">{t.dateFrom}</span>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-md px-1 py-0.5 text-[9px] outline-none focus:border-[#795548] font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[8px] font-black text-gray-400 shrink-0">{t.dateTo}</span>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-md px-1 py-0.5 text-[9px] outline-none focus:border-[#795548] font-bold"
                    />
                  </div>
                  {(customDateRange.start || customDateRange.end) && (
                    <button
                      onClick={() => setCustomDateRange({ start: '', end: '' })}
                      className="p-0.5 text-red-500 hover:bg-red-50 rounded transition shrink-0"
                      title={t.clearDate}
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>

                {/* Date Filter (Top Row) */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5" dir="rtl">
                  {[
                    { id: 'today', label: 'اليوم' },
                    { id: 'week', label: 'الأسبوع' },
                    { id: 'month', label: 'الشهر' },
                    { id: 'year', label: 'السنة' },
                    { id: 'all', label: 'الكل' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setRecentsDateFilter(f.id as any)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition ${recentsDateFilter === f.id ? 'bg-[#795548] text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Type Filter (Second Row) */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5" dir="rtl">
                  {[
                    { id: 'all', label: 'كافة الأحداث', icon: LayoutGrid },
                    { id: 'edit', label: 'تعديلات', icon: Edit },
                    { id: 'birth', label: 'ولادات/إضافة', icon: Dna },
                    { id: 'death', label: 'استبعاد/وفيات', icon: Skull },
                    { id: 'medical', label: 'علاجات/تحصين', icon: Syringe },
                    { id: 'expense', label: 'مصروفات', icon: Wallet },
                    { id: 'feed', label: 'إضافة مخزون', icon: Wheat },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setRecentsTypeFilter(f.id as any)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition border ${recentsTypeFilter === f.id ? 'bg-[#795548]/10 text-[#795548] border-[#795548]/30' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                    >
                      {f.icon && <f.icon size={9} />}
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {(() => {
                const now = new Date();
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - 7);
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                const checkDate = (dateStr: string) => {
                  const d = new Date(dateStr);
                  // Custom Range Priority
                  if (customDateRange.start && customDateRange.end) {
                    const start = new Date(customDateRange.start);
                    const end = new Date(customDateRange.end);
                    // Set end date to end of day
                    end.setHours(23, 59, 59, 999);
                    return d >= start && d <= end;
                  }

                  if (recentsDateFilter === 'all') return true;
                  if (recentsDateFilter === 'today') return d >= startOfToday;
                  if (recentsDateFilter === 'week') return d >= startOfWeek;
                  if (recentsDateFilter === 'month') return d >= startOfMonth;
                  if (recentsDateFilter === 'year') return d >= startOfYear;
                  return true;
                };

                // Isolate Data by Barn
                const relevantSheep = selectedGroupId
                // Isolate Data by Barn
                const relevantLogs = selectedGroupId
                  ? activityLog.filter(log => {
                      // 1. If it has a serialNumber, check if that sheep belongs to the current barn/group
                      if (log.serialNumber) {
                        const s = allSheep.find(sheep => sheep.serialNumber === log.serialNumber);
                        if (s) {
                          const pen = pens.find(p => p.id === s.penId);
                          return pen?.parentId === selectedGroupId || pen?.id === selectedGroupId || s.penId.startsWith('mortality:') && s.penId.includes(selectedGroupId);
                        }
                      }
                      
                      // 2. If it's a pen-specific action or log detail contains pen name of current group
                      const groupPens = pens.filter(p => p.parentId === selectedGroupId || p.id === selectedGroupId);
                      const hasGroupPenName = groupPens.some(p => log.detail?.includes(p.name));
                      if (hasGroupPenName) return true;

                      return false;
                    })
                  : activityLog;

                const allEvents = relevantLogs.map(log => {
                  let type = 'other';
                  let icon = Calendar;
                  let color = 'text-gray-600 bg-gray-50';
                  
                  if (log.action.includes('إضافة حظيرة') || log.action.includes('حظيرة')) {
                    type = 'other';
                    icon = Warehouse;
                    color = 'text-emerald-600 bg-emerald-50';
                  } else if (log.action.includes('إضافة') || log.action.includes('ولادة')) {
                    type = 'birth';
                    icon = log.action.includes('ولادة') ? Baby : Plus;
                    color = 'text-emerald-600 bg-emerald-50';
                  } else if (log.action.includes('حذف') || log.action.includes('استبعاد') || log.action.includes('وفاة') || log.action.includes('نفوق')) {
                    type = 'death';
                    icon = Skull;
                    color = 'text-red-600 bg-red-50';
                  } else if (log.action.includes('علاج') || log.action.includes('تحصين') || log.action.includes('تلقيح') || log.action.includes('طبي')) {
                    type = 'medical';
                    icon = Syringe;
                    color = 'text-purple-600 bg-purple-50';
                  } else if (log.action.includes('مصروف') || log.action.includes('مبيعات') || log.action.includes('شراء') || log.action.includes('بيع') || log.action.includes('مالي')) {
                    type = 'expense';
                    icon = Wallet;
                    color = 'text-blue-600 bg-blue-50';
                  } else if (log.action.includes('مخزون') || log.action.includes('أعلاف') || log.action.includes('حبوب')) {
                    type = 'feed';
                    icon = Wheat;
                    color = 'text-orange-600 bg-orange-50';
                  } else if (log.action.includes('نقل')) {
                    type = 'other';
                    icon = ArrowRightLeft;
                    color = 'text-indigo-600 bg-indigo-50';
                  } else if (log.action.includes('تعديل') || log.action.includes('تحديث')) {
                    type = 'edit';
                    icon = Edit;
                    color = 'text-amber-600 bg-amber-50';
                  } else if (log.action.includes('إجهاض') || log.action.includes('إلغاء')) {
                    type = 'other';
                    icon = X;
                    color = 'text-red-600 bg-red-50';
                  }

                  const logTagColor = log.tagColor || (log.serialNumber ? allSheep.find(s => s.serialNumber === log.serialNumber)?.tagColor : undefined);
                  const sheep = log.serialNumber ? allSheep.find(s => s.serialNumber === log.serialNumber || s.id === log.serialNumber) : null;
                  const sheepType = sheep?.type;

                  return {
                    id: log.id,
                    type,
                    date: log.timestamp,
                    title: log.action,
                    subtitle: (
                      <span className="flex items-center gap-1.5 flex-wrap mt-1">
                        {log.serialNumber ? (
                          <span className="bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300 px-1.5 py-0.5 rounded-md text-[10px] font-black border border-gray-200 dark:border-slate-700 shadow-sm shrink-0">
                            #{log.serialNumber}
                          </span>
                        ) : null}
                        {logTagColor && (
                          <span className="inline-flex items-center gap-1 bg-gray-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-slate-700 shrink-0">
                            <span 
                              className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm" 
                              style={{ backgroundColor: logTagColor }}
                            />
                            <span className="text-[9px] font-extrabold text-gray-500 dark:text-gray-400">{colorNames[logTagColor] || 'ملون'}</span>
                          </span>
                        )}
                        {sheepType && (
                          <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 px-1.5 py-0.5 rounded-md text-[9px] font-black border border-orange-100/50 dark:border-orange-900/30 shrink-0">
                            {sheepType}
                          </span>
                        )}
                        {can('canViewActivity') && (
                          <span className="text-[9px] text-gray-400">بواسطة: <span className="font-extrabold text-gray-600 dark:text-gray-300">{log.userName}</span></span>
                        )}
                      </span>
                    ),
                    icon,
                    color,
                    details: (
                      <div className="space-y-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right">
                        {can('canViewActivity') && <div><span className="text-gray-400">القائم بالعمل: </span>{log.userName}</div>}
                        <div><span className="text-gray-400">الإجراء: </span>{log.action}</div>
                        <div><span className="text-gray-400">التفاصيل: </span>{log.detail}</div>
                        {logTagColor && (
                          <div className="flex items-center justify-start gap-1.5">
                            <span className="text-gray-400">لون الشارة: </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm shrink-0" 
                                style={{ backgroundColor: logTagColor }}
                              />
                              {colorNames[logTagColor] || 'ملون'}
                            </span>
                          </div>
                        )}

                        <div><span className="text-gray-400">التاريخ والوقت: </span>{new Date(log.timestamp).toLocaleString('ar-EG', { numberingSystem: 'latn' })}</div>
                      </div>
                    )
                  };
                })
                .filter(e => checkDate(e.date))
                .filter(e => recentsTypeFilter === 'all' || e.type === recentsTypeFilter)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 100);

                if (allEvents.length === 0) return (
                  <div className="text-center py-20 flex flex-col items-center justify-center opacity-50">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
                      <Filter size={32} />
                    </div>
                    <p className="text-gray-400 font-bold">لا توجد نتائج لهذا التصنيف</p>
                  </div>
                );

                return allEvents.map((event) => (
                  <div key={event.id} className="flex flex-col bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start justify-between w-full">
                       {/* Icon and Titles */}
                       <div className="flex items-start gap-4">
                         <div className={`p-3 rounded-xl ${event.color} shrink-0`}>
                           <event.icon size={20} />
                         </div>
                         <div className="pt-1">
                           <h4 className="font-bold text-gray-800 text-sm mb-1">{event.title}</h4>
                           <div className="text-xs text-gray-500">{event.subtitle}</div>
                         </div>
                       </div>
                       
                       {/* Date Pill */}
                       <div className="bg-gray-50 px-2 py-1.5 rounded-xl flex flex-col items-center shrink-0">
                         <span className="text-[9px] font-bold text-gray-400" dir="ltr">{new Date(event.date).toLocaleDateString('en-GB')}</span>
                         <span className="text-[7px] font-medium text-gray-400 mt-0.5">{new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                       </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedEventId === event.id && event.details && (
                      <div className="mt-4 bg-gray-50 dark:bg-slate-900 rounded-xl p-3 border border-gray-100 dark:border-slate-800">
                        {event.details}
                      </div>
                    )}

                    {/* Toggle Button */}
                    {event.details && (
                      <button 
                        onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}
                        className="mt-3 self-start text-[10px] font-bold text-orange-500 hover:text-orange-600 transition"
                      >
                         {expandedEventId === event.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      </button>
                    )}
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Action Menu (Top Right Dropdown) */}
      {
        isActionMenuOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-end p-4 bg-black/20 backdrop-blur-sm" onClick={() => setIsActionMenu(false)}>
            <div className="bg-white w-64 mt-12 rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in" dir="rtl" onClick={e => e.stopPropagation()}>
              <div className="p-2 space-y-1">
                <button onClick={() => { setIsActionMenu(false); setIsReportsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <FileText size={18} className="text-teal-600" />
                  التقارير الشاملة
                </button>
                {can('canViewProduction') && (
                  <button onClick={() => { setIsActionMenu(false); setIsStatsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                    <Activity size={18} className="text-purple-600" />
                    سجل الانتاج و الاحصائيات
                  </button>
                )}
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setIsActionMenu(false); setIsDashboardOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <LayoutDashboard size={18} className="text-orange-600" />
                  لوحة التحكم
                </button>
                <button onClick={() => { setIsActionMenu(false); openAddBarnModal(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <Plus size={18} className="text-gray-600" />
                  إضافة حظيرة
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modals */}
      <ProductionStats
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          if (returnToDashboard) {
            setIsDashboardOpen(true);
            setReturnToDashboard(false);
          }
        }}
        allSheep={selectedGroupId ? barnSheep : allSheep}
        pens={selectedGroupId ? pens.filter(p => p.parentId === selectedGroupId || p.id === selectedGroupId) : pens}
      />
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => {
          setIsReportsModalOpen(false);
          if (returnToDashboard) {
            setIsDashboardOpen(true);
            setReturnToDashboard(false);
          }
        }}
        allSheep={selectedGroupId ? barnSheep : allSheep}
        feedItems={selectedGroupId ? feedItems.filter(f => !f.penId || f.penId === selectedGroupId || pens.find(p => p.id === f.penId)?.parentId === selectedGroupId) : feedItems}
        expenses={selectedGroupId ? expenses.filter(e => e.penId === selectedGroupId || pens.find(p => p.id === e.penId)?.parentId === selectedGroupId) : expenses}
        sales={selectedGroupId ? sales.filter(s => s.penId === selectedGroupId || pens.find(p => p.id === s.penId)?.parentId === selectedGroupId) : sales}
        pens={selectedGroupId ? pens.filter(p => p.parentId === selectedGroupId || p.id === selectedGroupId) : pens}
        barnName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.name : 'المزرعة'}
        ownerName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.ownerName || ownerName : ownerName}
        isOwner={isOwner}
        onShowAlert={showAlert}
        onShowConfirm={showConfirm}
        initialReport={reportsInitialTab}
      />
      <PenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePen} initialData={editingPen} isGroupMode={isAddingGroup} />
      <ReorderPensModal isOpen={isReorderPensOpen} onClose={() => setIsReorderPensOpen(false)} pens={pens} selectedGroupId={selectedGroupId} onSave={handleReorderPens} />
      <SheepModal 
        isOpen={isSheepModalOpen} 
        onClose={() => setIsSheepModalOpen(false)} 
        onSave={handleSaveSheep} 
        initialData={editingSheep} 
        penId={selectedPenId || (selectedGroupId ? pens.find(p => p.parentId === selectedGroupId && p.isMain)?.id : '') || ''} 
        animalType={selectedGroup?.animalType} 
        existingSheep={allSheep} 
        pens={pens} 
        currentGroupId={selectedGroupId} 
        language={appLanguage}
        onMarkAsSold={async (sheep, price, buyer, date) => {
          const sale: Sale = {
            id: generateId(),
            penId: sheep.penId,
            relatedAnimalId: sheep.serialNumber,
            title: `بيع حيوان #${sheep.serialNumber}`,
            amount: price,
            buyer,
            date,
            createdAt: new Date().toISOString(),
            category: 'sheep'
          };
          await handleSaveSale(sale);
          // Delete/Exclude the sheep
          handleDeleteSheep(sheep.id, true);
        }}
        onMarkAsDead={async (sheep, reason, date) => {
          const deathId = generateId();
          const death: Death = {
            id: deathId,
            penId: sheep.penId,
            sheepId: sheep.id,
            serialNumber: sheep.serialNumber,
            type: sheep.type,
            gender: sheep.gender,
            reason,
            date,
            notes: `استبعاد من الحظيرة`,
            createdAt: new Date().toISOString()
          };
          await handleSaveDeath(death);
          // Instead of deletion, move to mortality pen
          if (ownerId) {
            await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), {
              penId: 'mortality',
              exclusionDate: date
            });
          }
        }}
        onShowAlert={showAlert}
        onShowConfirm={showConfirm}
      />
      <MedicalModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        sheep={allSheep.find(s => s.id === selectedSheepForAction?.id) || selectedSheepForAction}
        onAddRecord={handleAddMedicalRecord}
        onUpdateStatus={async (status) => {
          if (selectedSheepForAction && ownerId) {
            try {
              await updateDoc(doc(db, 'farms', ownerId, 'sheep', selectedSheepForAction.id), { status });
            } catch (e) {
              console.error('Error updating sheep status:', e);
            }
          }
        }}
        defaultStatusOnSave={medicalModalOptions.defaultStatusOnSave}
        allowNoName={medicalModalOptions.allowNoName}
        defaultRecordType={medicalModalOptions.defaultRecordType}
      />
      <MoveSheepModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={(targetPenId, reason) => handleMoveSheep(targetPenId, undefined, undefined, reason)}
        currentPenId={selectedPenId || ''}
        availablePens={availablePensForMove}
        breakdown={batchAction && batchAction.action === 'move' ? {
          male: displayedSheep.filter(s => s.type === batchAction.type && s.gender === 'male').length,
          female: displayedSheep.filter(s => s.type === batchAction.type && s.gender === 'female').length
        } : undefined}
      />
      {/* Detail View Modal */}
      {
        viewingSheep && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingSheep(undefined)}>
            <div onClick={e => e.stopPropagation()} className="w-full max-w-sm">
              {renderDetailCard(viewingSheep)}
            </div>
          </div>
        )
      }

      {/* Reproduction Confirm Modal */}
      {reproductionConfirmState && (() => {
        const closeReproductionConfirmModal = () => {
          setReproductionConfirmState(null);
          setShowMiscarriageInput(false);
          setMiscarriageReason('');
        };

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
            <div className="bg-[#fcfbf4] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-purple-900/30 dark:text-purple-400">
                  <Baby size={32} />
                </div>
                
                {showMiscarriageInput ? (
                  <div className="space-y-4 text-right animate-fade-in">
                    <h3 className="text-xl font-black text-gray-800 mb-2 dark:text-white text-center">إلغاء الحمل (إجهاض)</h3>
                    <p className="text-xs font-bold text-gray-500 mb-4 dark:text-gray-400 leading-relaxed text-center">
                      الرجاء كتابة سبب إلغاء الحمل أو الإجهاض لحفظ التغيير في السجل:
                    </p>
                    <textarea
                      value={miscarriageReason}
                      onChange={(e) => setMiscarriageReason(e.target.value)}
                      placeholder="مثال: إجهاض تلقائي، حمل كاذب، حادث سقوط..."
                      rows={3}
                      className="w-full p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm text-right resize-none shadow-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!miscarriageReason.trim()) {
                            showAlert('error', 'خطأ', 'يجب كتابة سبب لإلغاء الحمل.');
                            return;
                          }
                          const { sheep } = reproductionConfirmState;
                          try {
                            await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), {
                              reproductionStatus: 'empty',
                              pregnancyDate: null,
                              expectedBirthDate: null
                            });
                            
                            setViewingSheep(prev => prev ? { 
                              ...prev, 
                              reproductionStatus: 'empty', 
                              pregnancyDate: undefined, 
                              expectedBirthDate: undefined
                            } : undefined);
                            
                            await logActivity('إلغاء الحمل (إجهاض)', 'تم إلغاء الحمل للحيوان #' + sheep.serialNumber + ' - السبب: ' + miscarriageReason, sheep.serialNumber, sheep.tagColor);
                            closeReproductionConfirmModal();
                            showAlert('success', 'تم إلغاء الحمل', 'تم إلغاء الحمل وتسجيل السبب بنجاح.');
                          } catch (e) { console.error(e); }
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition shadow-lg text-center"
                      >
                        تأكيد الإلغاء
                      </button>
                      <button
                        onClick={() => {
                          setShowMiscarriageInput(false);
                          setMiscarriageReason('');
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-500 font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 text-center"
                      >
                        تراجع
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-gray-800 mb-2 dark:text-white">تأكيد حالة الإنجاب</h3>
                    <p className="text-sm font-bold text-gray-500 mb-6 dark:text-gray-400 leading-relaxed">
                      {reproductionConfirmState.currentStatus === 'empty' ? 'سيتم تغيير الحالة إلى (مضرع) لمدة 5 أشهر تقريباً.' : 
                       reproductionConfirmState.currentStatus === 'pregnant' ? 'سيتم تغيير الحالة إلى (أم) لبدء فترة حضانة الرضيع (3 أشهر).' : 
                       'سيتم إعادة الحيوان إلى حالة (غير مضرع).'}
                    </p>
                    
                    {(reproductionConfirmState.nextStatus === 'pregnant' || reproductionConfirmState.nextStatus === 'mother') && (
                      <div className="mb-5 text-right space-y-1">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          {reproductionConfirmState.nextStatus === 'pregnant' ? 'تاريخ التلقيح / الحمل' : 'تاريخ الولادة'}
                        </label>
                        <input
                          type="date"
                          value={reproductionDate}
                          onChange={(e) => setReproductionDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full h-[40px] px-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:ring-1 focus:ring-purple-500 focus:bg-white outline-none transition-all font-bold text-center text-sm shadow-sm"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-3">
                      <button
                        onClick={async () => {
                          const { sheep, nextStatus, expectedDurationDays } = reproductionConfirmState;
                          try {
                            let updates: any = { reproductionStatus: nextStatus };
                            const selDate = new Date(reproductionDate);
                            if (nextStatus === 'pregnant') {
                              updates.pregnancyDate = selDate.toISOString();
                              updates.expectedBirthDate = new Date(selDate.getTime() + expectedDurationDays * 24 * 60 * 60 * 1000).toISOString();
                            } else if (nextStatus === 'mother') {
                              updates.lactationStartDate = selDate.toISOString();
                              updates.lastBirthDate = selDate.toISOString();
                            } else if (nextStatus === 'empty') {
                              updates.lactationStartDate = null;
                              updates.pregnancyDate = null;
                              updates.expectedBirthDate = null;
                              updates.weaningDate = new Date().toISOString();
                            }
                            
                            await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), updates);
                            setViewingSheep(prev => prev ? { ...prev, ...updates } : undefined);
                            closeReproductionConfirmModal();
                          } catch (e) { console.error(e); }
                        }}
                        className="w-full py-4 rounded-2xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 transition shadow-lg"
                      >
                        تأكيد {reproductionConfirmState.nextStatus === 'pregnant' ? 'الحمل' : reproductionConfirmState.nextStatus === 'mother' ? 'الولادة' : 'إنهاء الحضانة'}
                      </button>
                      
                      {reproductionConfirmState.currentStatus === 'pregnant' && (
                        <button
                          onClick={() => setShowMiscarriageInput(true)}
                          className="w-full py-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 font-black text-sm hover:bg-red-100 transition dark:bg-red-900/20 dark:border-red-900 dark:text-red-400"
                        >
                          إلغاء الحمل (إجهاض / حمل كاذب)
                        </button>
                      )}
                      
                      <button
                        onClick={closeReproductionConfirmModal}
                        className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-sm hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                      >
                        إلغاء
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={appLanguage}
        setLanguage={setAppLanguage}
        theme={appTheme}
        setTheme={setAppTheme}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        onShowAlert={showAlert}
        onTestNotifications={handleTestNotifications}
      />

      <WorkerManageModal
        isOpen={isWorkerManageOpen}
        onClose={() => {
          setIsWorkerManageOpen(false);
          if (returnToDashboard) {
            setIsDashboardOpen(true);
            setReturnToDashboard(false);
          }
        }}
        users={users}
        onAddWorker={handleRegisterWorker}
        onUpdateWorker={handleUpdateWorkerPermissions}
        onDeleteWorker={handleDeleteWorker}
        pens={pens}
        onShowAlert={showAlert}
        onShowConfirm={showConfirm}
      />

      <DeathsModal
        isOpen={isDeathsModalOpen}
        onClose={() => {
          setIsDeathsModalOpen(false);
          if (returnToDashboard) {
            setIsDashboardOpen(true);
            setReturnToDashboard(false);
          }
        }}
        onBack={() => {
          setIsDeathsModalOpen(false);
          setIsDashboardOpen(true);
          setReturnToDashboard(false);
        }}
        deaths={allSheep.filter(s => s.penId?.includes('mortality'))}
        allSheep={allSheep}
        pens={pens}
        onDelete={(id) => handleDeleteSheep(id, true)}
        barnName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.name : 'المزرعة'}
      />

      {/* Worker Activity Log Modal */}
      {isWorkerActivityOpen && isOwner && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir="rtl">
          <div className="bg-[#fcfbf4] w-full max-w-xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col dark:bg-slate-950">
            <div className="p-5 border-b border-gray-100 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                  <History className="text-[#3E2723] dark:text-orange-500" />
                  سجل العمال
                </h3>
                <button onClick={() => {
                  setIsWorkerActivityOpen(false);
                  if (returnToDashboard) {
                    setIsDashboardOpen(true);
                    setReturnToDashboard(false);
                  }
                  setWorkerFilter('all');
                }} className="p-2 bg-gray-50 hover:bg-red-50 rounded-full text-gray-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Filters for Worker Activity Log */}
              <div className="space-y-3">
                {/* Worker Filter */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
                  <button
                    onClick={() => setWorkerFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black transition whitespace-nowrap border ${workerFilter === 'all' ? 'bg-[#795548] text-white border-[#795548]' : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}
                  >
                    جميع العمال
                  </button>
                  {users.filter(u => u.role === 'worker').map(w => (
                    <button
                      key={w.id}
                      onClick={() => setWorkerFilter(w.id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black transition whitespace-nowrap border ${workerFilter === w.id ? 'bg-[#795548] text-white border-[#795548]' : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      <Users size={10} />
                      {w.name}
                    </button>
                  ))}
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
                   {[
                     { id: 'today', label: 'اليوم' },
                     { id: 'week', label: 'الأسبوع' },
                     { id: 'month', label: 'الشهر' },
                     { id: 'year', label: 'السنة' },
                   ].map(f => (
                     <button
                       key={f.id}
                       onClick={() => setWorkerDateFilter(f.id as any)}
                       className={`px-4 py-1.5 rounded-full text-[10px] font-black transition whitespace-nowrap border ${workerDateFilter === f.id ? 'bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900' : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}
                     >
                       {f.label}
                     </button>
                   ))}
                </div>

                {/* Type Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir="rtl">
                  {[
                    { id: 'all', label: 'كافة الأحداث', icon: LayoutGrid },
                    { id: 'add', label: 'ولادات/إضافة', icon: Plus },
                    { id: 'edit', label: 'تعديلات', icon: Edit },
                    { id: 'delete', label: 'استبعادات', icon: Skull, color: 'text-rose-600' },
                    { id: 'medical', label: 'علاجات/تحصين', icon: Syringe, color: 'text-purple-600' },
                    { id: 'finance', label: 'مصروفات', icon: Wallet, color: 'text-indigo-600' },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setWorkerActivityFilter(f.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition border ${workerActivityFilter === f.id ? 'bg-[#795548]/10 text-[#795548] border-[#795548]/30 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      {f.icon && <f.icon size={12} className={f.color || ''} />}
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 pt-6 custom-scrollbar relative">
              {(() => {
                const now = new Date();
                const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfYear = new Date(now.getFullYear(), 0, 1);

                const filteredLogs = activityLog
                  .filter(l => l.userRole === 'worker')
                  .filter(l => workerFilter === 'all' || l.userId === workerFilter)
                  .filter(l => {
                    const logDate = new Date(l.timestamp);
                    if (workerDateFilter === 'today') return logDate >= startOfDay;
                    if (workerDateFilter === 'week') return logDate >= startOfWeek;
                    if (workerDateFilter === 'month') return logDate >= startOfMonth;
                    if (workerDateFilter === 'year') return logDate >= startOfYear;
                    return true;
                  })
                  .filter(l => {
                    if (workerActivityFilter === 'all') return true;
                    if (workerActivityFilter === 'add') return l.action.includes('إضافة') || l.action.includes('ولادة');
                    if (workerActivityFilter === 'edit') return l.action.includes('تعديل');
                    if (workerActivityFilter === 'delete') return l.action.includes('حذف') || l.action.includes('استبعاد') || l.action.includes('وفاة');
                    if (workerActivityFilter === 'medical') return l.action.includes('طبي') || l.action.includes('تلقيح') || l.action.includes('علاج');
                    if (workerActivityFilter === 'finance') return l.action.includes('مصروف') || l.action.includes('بيع') || l.action.includes('مخزون');
                    return true;
                  });

                if (filteredLogs.length === 0) return (
                  <div className="text-center py-20 text-gray-400">
                    <History size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold">لا توجد أحداث مسجلة حالياً</p>
                  </div>
                );

                return (
                  <div className="relative pl-2 pr-12 space-y-6 before:absolute before:inset-y-0 before:right-[3.25rem] before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800" dir="rtl">
                    {filteredLogs.map((log, idx) => {
                      const getActionInfo = (action: string) => {
                        if (action.includes('إضافة') || action.includes('ولادة')) return { icon: Plus, color: 'text-emerald-600', dotColor: 'bg-emerald-500' };
                        if (action.includes('تعديل')) return { icon: Edit, color: 'text-blue-600', dotColor: 'bg-blue-500' };
                        if (action.includes('حذف') || action.includes('استبعاد') || action.includes('وفاة')) return { icon: Skull, color: 'text-rose-600', dotColor: 'bg-rose-500' };
                        if (action.includes('نقل')) return { icon: ArrowRightLeft, color: 'text-orange-600', dotColor: 'bg-orange-500' };
                        if (action.includes('طبي') || action.includes('تلقيح') || action.includes('علاج')) return { icon: Syringe, color: 'text-purple-600', dotColor: 'bg-purple-500' };
                        if (action.includes('مصروف') || action.includes('بيع')) return { icon: Wallet, color: 'text-indigo-600', dotColor: 'bg-indigo-500' };
                        return { icon: History, color: 'text-gray-600', dotColor: 'bg-gray-500' };
                      };
                      const { icon: ActionIcon, color, dotColor } = getActionInfo(log.action);
                      const d = new Date(log.timestamp);
                      const dateStr = d.toLocaleDateString('en-GB');
                      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                      
                      return (
                        <div key={log.id} className="relative flex items-start w-full">
                          {/* Date and Time Column (Absolute on the right) */}
                          <div className="absolute -right-14 top-2 flex flex-col items-center w-12 shrink-0">
                            <span className="text-[9px] font-bold text-gray-500 leading-tight">{dateStr}</span>
                            <span className="text-[8px] text-gray-400 font-medium leading-tight">{timeStr}</span>
                          </div>
                          
                          {/* Timeline Dot */}
                          <div className={`absolute -right-3 top-4 w-2 h-2 rounded-full ${dotColor} ring-4 ring-white dark:ring-slate-900 z-10`} />
                          
                          {/* Event Card */}
                          <div className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition dark:bg-slate-800/50 dark:border-slate-700 mr-2 w-full">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h4 className="font-bold text-gray-900 text-sm dark:text-gray-100 leading-tight">{log.action}</h4>
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold mb-3">العامل: {log.userName}</p>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-100 dark:border-slate-800">
                              {log.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
      <CustomAlert
        isOpen={alertConfig.isOpen}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
        confirmLabel={alertConfig.confirmLabel}
        cancelLabel={alertConfig.cancelLabel}
      />
      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentUser={currentUser} 
        users={users} 
      />

    </div>
  );
}

export default App;
