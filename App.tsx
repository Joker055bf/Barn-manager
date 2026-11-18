import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Plus, Search, MoreVertical, LayoutGrid, Calendar, ChevronLeft, ArrowRight, Star, Dna, Settings, Check, X, Filter, Target,
  Warehouse, Wheat, ShieldCheck, Activity, Wallet, Eye, Edit, Trash2, Syringe, ArrowRightLeft, Skull, FileText, LayoutDashboard, MoreHorizontal, LogOut, Users, Shield, History, Share2, Banknote, BarChart3, Baby, HeartPulse, MessageCircle, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';

import { PenModal } from './components/PenModal';
import { SheepModal } from './components/SheepModal';
import { MoveSheepModal } from './components/MoveSheepModal';
import { MedicalModal } from './components/MedicalModal';
import { VaccinationGuide } from './components/VaccinationGuide';

import { ReorderPensModal } from './components/ReorderPensModal';
import { FeedManager } from './components/FeedManager';
import { FinanceManager } from './components/FinanceManager';
import { SheepStatsModal } from './components/SheepStatsModal';


import { AuthScreen } from './components/AuthScreen';

import { SwipeableBarnCard } from './components/SwipeableBarnCard';
import { DeathsModal } from './components/DeathsModal';
import { TypeAgeStatsModal } from './components/TypeAgeStatsModal';
import { Pen, MedicalRecord, FeedItem, FeedLogEntry, Sheep, SheepType, ChatMessage, Expense, Sale, Death, User, WorkerPermissions, ActivityEntry, DEFAULT_WORKER_PERMISSIONS } from './types';
import CustomAlert, { AlertType } from './components/CustomAlert';
import { CustomSelect, Option } from './components/CustomSelect';
import type { ReportType } from './components/ReportsModal';
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
import { db, auth, getFirebaseMessaging } from './firebase';
import { collection, doc, getDoc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, getDocs, addDoc, orderBy, limit } from 'firebase/firestore';
import {
  loginWithCredentials, registerOwner, resolveSessionUser, createWorkerAccount, deleteWorkerAccount,
  resetWorkerPassword, changeOwnPassword, changeUsername, changeOwnerEmail, verifyCurrentPassword,
  sendOwnerPasswordReset, logout as authLogout, authErrorMessage,
} from './services/authService';
import { sendPush, saveDeviceToken, removeDeviceToken, savePushPrefs, getWebPushToken } from './services/pushService';
import { useAuthSession } from './hooks/useAuthSession';
import { useFarmData } from './hooks/useFarmData';

// Heavy screens load on first open (ReportsModal pulls in jsPDF + html2canvas).
const ReportsModal = lazy(() => import('./components/ReportsModal').then(m => ({ default: m.ReportsModal })));
const ProductionStats = lazy(() => import('./components/ProductionStats').then(m => ({ default: m.ProductionStats })));
const ChatModal = lazy(() => import('./components/ChatModal').then(m => ({ default: m.ChatModal })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const WorkerManageModal = lazy(() => import('./components/WorkerManageModal').then(m => ({ default: m.WorkerManageModal })));

import { safeStorage } from './utils/storage';

import { tr, isEnglish, appLocale, switchLanguage } from './constants/i18n';

// ────────────────────────

// Public web-push (VAPID) key of the Firebase project; safe to ship in the client.
const WEB_PUSH_VAPID_KEY = 'BGMIAO07gwGiD4kIhaa0lQzjBTF4qJg702MXtB50r4rm2wjdrLkZ562L7AY6uWD9kE1zjm5bxpLM9643wBKWp1E';

// Worker actions that also send a push notification to the owner's phone.
const OWNER_PUSH_ACTIONS = new Set([
  'استبعاد حيوان', 'تسجيل وفاة', 'حذف حيوان', 'حذف حظيرة', 'حذف قسم', 'نقل جماعي', 'حذف صنف',
  'إضافة مبيعات', 'إضافة مصروف', 'تأكيد ولادة', 'تحديث الحالة الصحية',
]);
// A health update is only worth a push when the animal became sick, not when it recovered.
const shouldPushOwner = (action: string, detail: string) =>
  OWNER_PUSH_ACTIONS.has(action) && !(action === 'تحديث الحالة الصحية' && detail.includes('(سليم)'));

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pens' | 'sheepList' | 'vaccines' | 'feed' | 'expenses'>('pens');

  const { currentUser, setCurrentUser, authReady } = useAuthSession();

  const [users, setUsers] = useState<User[]>([]);


  const isOwner = currentUser?.role === 'owner';
  const ownerId = isOwner ? currentUser?.id : currentUser?.ownerId;
  const { pens, setPens, rawSheep, setRawSheep, feedItems, expenses, sales, deaths, activityLog } = useFarmData(ownerId);
  
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
    // A per-barn config saved before a permission key existed must not silently deny it.
    const perBarn = targetBarnId ? currentUser.permissionsPerBarn?.[targetBarnId] : undefined;
    return perBarn?.[permission] ?? currentUser.permissions?.[permission] ?? DEFAULT_WORKER_PERMISSIONS[permission];
  };

  const lastLogTimestampMsRef = useRef<number>(0);
  const timestampSubSeqRef = useRef<number>(0);

  const logActivity = async (action: string, detail: string, serialNumber?: string | number, tagColor?: string, changes?: string[]) => {
    if (!currentUser || !ownerId) return;

    const nowMs = Date.now();
    if (nowMs === lastLogTimestampMsRef.current) {
      timestampSubSeqRef.current += 1;
    } else {
      lastLogTimestampMsRef.current = nowMs;
      timestampSubSeqRef.current = 0;
    }

    const baseIso = new Date(nowMs).toISOString();
    const uniqueTimestamp = timestampSubSeqRef.current > 0
      ? `${baseIso.replace('Z', '')}.${String(timestampSubSeqRef.current).padStart(3, '0')}Z`
      : baseIso;

    const entry: ActivityEntry = JSON.parse(JSON.stringify({
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      detail,
      timestamp: uniqueTimestamp,
      serialNumber: serialNumber !== undefined && serialNumber !== null ? String(serialNumber) : null,
      tagColor: tagColor || null,
      changes: changes || null
    }));
    try {
      await addDoc(collection(db, 'farms', ownerId, 'activity'), entry);
    } catch (e) {
      console.error("Error logging activity: ", e);
    }

    // Tell the owner's phone when a worker does something they would want to know about right away.
    if (currentUser.role === 'worker' && shouldPushOwner(action, detail)) {
      sendPush(ownerId, `${currentUser.name}: ${action}`, detail, 'activity').catch(err => console.warn('Owner push failed:', err));
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
      confirmLabel: tr("نعم، متأكد"),
      cancelLabel: tr("تراجع"),
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
            await saveDeviceToken(currentUser.id, token.value);
            await updateDoc(doc(db, 'users', currentUser.id), { 

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
            if (currentUser) {
              await sendPush(currentUser.id, 'تطبيق راعي 🐑', 'رائع جداً! تم تنشيط واختبار نظام إشعارات البث الهاتفي لجهازك بنجاح 100%!');
            }
          } catch (pushErr) {
            console.error('Failed to send test push to native device:', pushErr);
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('FCM Native Registration Error:', err);
          showAlert('error', tr("فشل التسجيل في النظام"), tr("تعذر تسجيل جهازك لتلقي التنبيهات: ") + (err.error || tr("خطأ غير معروف")));
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('تم استقبال إشعار والتطبيق مفتوح:', notification);
          showAlert('success', notification.title || tr("تنبيه جديد"), notification.body || '');
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
          showAlert('error', tr("الصلاحية مطلوبة"), tr("يرجى تفعيل صلاحية الإشعارات من إعدادات النظام لتلقي التنبيهات."));
          return;
        }

        // 3. Register device
        await PushNotifications.register();
        showAlert('success', tr("تم تفعيل التنبيهات"), tr("جهازك الآن جاهز لاستقبال الإشعارات خارج التطبيق تماماً مثل الواتساب. تم طلب إرسال تنبيه تجريبي!"));

      } else {
        // Web Platform (Web Push Notifications)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;

        if (isIOS && !isStandalone) {
          showAlert(
            'warning',
            tr("تنشيط الإشعارات للآيفون"),
            tr("لتتمكن من تفعيل الإشعارات على هاتف الآيفون، يرجى أولاً إضافة التطبيق إلى الشاشة الرئيسية:\n\n1. اضغط على زر مشاركة (Share) في متصفح Safari\n2. اختر \"إضافة إلى الشاشة الرئيسية\" (Add to Home Screen)\n3. افتح التطبيق من الأيقونة على الشاشة الرئيسية ثم اضغط على زر تفعيل التنبيهات.")
          );
          return;
        }

        if (typeof Notification === 'undefined') {
          showAlert('error', tr("غير مدعوم"), tr("هذا المتصفح أو بيئة التشغيل لا تدعم الإشعارات الفورية. لمستخدمي آيفون يرجى فتح الموقع عبر متصفح Safari وإضافته للشاشة الرئيسية أولاً."));
          return;
        }
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showAlert('warning', tr("الصلاحية مطلوبة"), tr("يرجى منح صلاحية الإشعارات من إعدادات المتصفح أو الهاتف لتشغيل الخدمة."));
          return;
        }

        showAlert('warning', tr("جاري التفعيل"), tr("جاري تسجيل الخدمة وجلب رمز التنبيهات الآمن..."));

        const messaging = await getFirebaseMessaging();
        if (!messaging) {
          showAlert('error', tr("خطأ في الخدمة"), tr("فشل تهيئة نظام التنبيهات Firebase Cloud Messaging."));
          return;
        }

        if (!('serviceWorker' in navigator)) {
          showAlert('error', tr("غير مدعوم"), tr("متصفحك لا يدعم تقنية Service Worker لتشغيل الإشعارات الخلفية."));
          return;
        }

        // Resolve against the document so the worker stays inside its own scope on a subpath deploy.
        const swUrl = new URL('firebase-messaging-sw.js', document.baseURI).href;

        const registration = await navigator.serviceWorker.register(swUrl);
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

        // No fallback without a key: a subscription made with another key can never receive pushes.
        const currentToken = await getWebPushToken(messaging, registration, WEB_PUSH_VAPID_KEY);

        if (!currentToken) {
          showAlert('error', tr("فشل جلب الرمز"), tr("لم نتمكن من الحصول على رمز التنبيهات من خوادم Google Cloud."));
          return;
        }

        // Save token to Firestore
        if (currentUser) {
          await saveDeviceToken(currentUser.id, currentToken);
          setCurrentUser(prev => prev ? { ...prev, fcmToken: currentToken } : null);
          const saved = safeStorage.getItem('rai_session');
          if (saved) {
            const session = JSON.parse(saved);
            session.fcmToken = currentToken;
            safeStorage.setItem('rai_session', JSON.stringify(session));
          }
        }

        showAlert('warning', tr("جاري إرسال التنبيه"), tr("تم جلب الرمز وتوثيقه بنجاح! جاري طلب إرسال تنبيه تجريبي لهاتفك..."));

        // Ask the push server to notify this same account (it reads the token we just saved).
        try {
          await sendPush(currentUser!.id, 'تطبيق راعي 🐑', 'رائع جداً! تم تنشيط واختبار نظام إشعارات البث الهاتفي بنجاح 100%!');
          showAlert('success', tr("تم التفعيل بنجاح"), tr("تهانينا! تم تفعيل إشعارات الهاتف بنجاح، وستصلك رسالة تنبيه تجريبية خلال ثوانٍ!"));
        } catch (pushErr: any) {
          showAlert('error', tr("فشل الإرسال"), tr("تم تسجيل الرمز بنجاح ولكن فشل السيرفر في الإرسال: {0}", pushErr?.message || 'خطأ غير معروف'));
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
          tr("عطل في مصادقة الإشعارات (FCM)"),
          <div className="space-y-3 text-start font-medium text-xs leading-relaxed" dir={isEnglish ? 'ltr' : 'rtl'}>
            <p className="text-red-600 dark:text-red-400 font-black">
              {tr("فشل المشروع في المصادقة مع خوادم Google Cloud/Firebase لرموز الويب.")}
            </p>
            <p className="text-gray-700 dark:text-slate-300">
              {tr("يرجى التحقق من إعدادات مشروعك في كونسول Firebase بالطرق التالية:")}
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[11px] text-gray-600 dark:text-slate-400 ps-2">
              <li>
                <strong>{tr("قيود مفتاح API Key في GCP:")}</strong> {tr("اذهب إلى")} <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-brand-500 dark:text-orange-400 underline font-bold">{tr("منصة Google Cloud")} {"->"} Credentials</a> {tr("وقم بتعديل مفتاح المتصفح وتأكد من تفعيل صلاحية")} <strong>"FCM Registration API"</strong> {tr("و")} <strong>"Firebase Cloud Messaging API"</strong> {tr("للمفتاح.")}
              </li>
            </ol>
            <p className="text-[10px] text-red-500 font-bold mt-2 border-t pt-2 border-gray-100 dark:border-slate-800">
              {tr("تفاصيل المشكلة الفنية:")} {errorMsg}
            </p>
          </div>
        );
      } else {
        showAlert('error', tr("عطل غير متوقع"), e.message || tr("تعذر استكمال اختبار التنبيهات."));
      }
    }
  };

  // Profile edits for the signed-in user. Password, username and email go through Firebase Auth;
  // the live profile listener picks up the Firestore side.
  const handleUpdateUser = async (userId: string, updates: { name?: string, username?: string, password?: string, email?: string, vapidKey?: string, firebaseApiKey?: string }) => {
    if (!currentUser || currentUser.id !== userId) throw new Error(tr("يمكن تعديل حسابك فقط من هنا"));
    try {
      const plain: any = {};
      if (updates.name !== undefined) plain.name = updates.name;
      if (updates.vapidKey !== undefined) plain.vapidKey = updates.vapidKey;
      if (updates.firebaseApiKey !== undefined) plain.firebaseApiKey = updates.firebaseApiKey;
      if (Object.keys(plain).length) await updateDoc(doc(db, 'users', userId), plain);

      if (updates.username !== undefined && updates.username !== currentUser.username) {
        await changeUsername(currentUser, updates.username);
      }
      if (updates.password !== undefined) {
        await changeOwnPassword(updates.password);
      }
      if (updates.email !== undefined && updates.email !== currentUser.email) {
        const sent = await changeOwnerEmail(currentUser, updates.email);
        if (sent) {
          showAlert('success', tr("تأكيد البريد"), tr("أرسلنا رابط تأكيد إلى البريد الجديد. بعد الضغط عليه سجّل الدخول بالبريد الجديد."));
        }
      }
    } catch (e) {
      console.error('Error updating user:', e);
      throw new Error(authErrorMessage(e));
    }
  };

  const handleShareApp = async () => {
    try {
      if (typeof navigator.share !== 'undefined') {
        await navigator.share({
          title: tr("تطبيق راعي لإدارة الحظائر"),
          text: tr("أفضل نظام لإدارة الحظائر والمواشي بدقة عالية."),
          url: window.location.href
        });
      } else {
        showAlert('warning', tr("عذراً"), tr("ميزة المشاركة غير مدعومة في متصفحك"));
      }
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  const handleLogout = async () => {
    safeStorage.removeItem('rai_session');
    if (currentUser) await removeDeviceToken(currentUser.id, currentUser.fcmToken);
    try { await authLogout(); } catch (e) { console.error('Logout failed:', e); }
    setCurrentUser(null);
    window.location.reload();
  };

  // AuthScreen callbacks: onAuthStateChanged takes over once Firebase signs the user in.
  const handleLogin = async (identifier: string, password: string) => {
    try {
      await loginWithCredentials(identifier, password);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  };

  const handleRegisterOwner = async (username: string, password: string, name: string, email: string) => {
    try {
      await registerOwner(username, password, name, email);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
  };

  const handleSendPasswordReset = async (email: string) => {
    try {
      await sendOwnerPasswordReset(email);
    } catch (e) {
      throw new Error(authErrorMessage(e));
    }
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
    if (!isOwner || !ownerId) {
      throw new Error(tr("يجب تسجيل الدخول بحساب المالك لإضافة عامل."));
    }
    
    try {
      await createWorkerAccount(ownerId, { username, password, name, permissions, settingsPin, accessiblePens, avatar, permissionsPerBarn });
      logActivity('إدارة العمال', `تمت إضافة العامل ${name}`);
      showAlert('success', tr("تمت الإضافة"), tr("تم تسجيل العامل {0} بنجاح", name));
    } catch (e: any) {
      console.error('Register Worker Error:', e);
      throw new Error(authErrorMessage(e));
    }
  };

  const handleResetWorkerPassword = async (userId: string, newPassword: string) => {
    if (!isOwner) return;
    const worker = users.find(u => u.id === userId && u.role === 'worker');
    if (!worker) throw new Error(tr("لم يتم العثور على العامل"));
    try {
      await resetWorkerPassword(worker, newPassword);
      logActivity('إدارة العمال', `تم تغيير كلمة مرور العامل ${worker.name}`);
    } catch (e) {
      console.error('Reset Worker Password Error:', e);
      throw new Error(authErrorMessage(e));
    }
  };

  const handleUpdateWorkerPermissions = async (
    userId: string, 
    permissions: WorkerPermissions, 
    accessiblePens: string[], 
    avatar?: string, 
    permissionsPerBarn?: { [barnId: string]: WorkerPermissions }
  ) => {
    if (!isOwner) return;

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
    if (!isOwner) return;

    const worker = users.find(u => u.id === userId && u.role === 'worker');
    if (!worker) return;
    try {
      await deleteWorkerAccount(worker);
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
    document.title = appLanguage === 'en' ? 'Rai - Barn Manager' : 'Rai - مدير الحظائر';
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
      
      // Walk every ancestor, matching visiblePens: a pen nested deeper than one level under an
      // accessible barn was shown to the worker while its animals were hidden.
      let currentPen = pens.find(p => p.id === s.penId);
      const seen = new Set<string>();
      while (currentPen?.parentId && !seen.has(currentPen.id)) {
        seen.add(currentPen.id);
        if (accessIds.includes(currentPen.parentId)) return true;
        currentPen = pens.find(p => p.id === currentPen!.parentId);
      }

      return false;
    });
  }, [rawSheep, pens, currentUser?.accessiblePens, isOwner]);

  const totalAnimals = allSheep.length;
  const sickCount = allSheep.filter(s => s.status === 'sick').length;
  const healthyCount = totalAnimals - sickCount;

  // New: Financial Stats
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalExpenseVal = expenses.reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalRevenue - totalExpenseVal;

  // Isolating Activity Logs by Barn (Group) ID
  const getBarnRelevantLogs = React.useCallback((barnId: string | null) => {
    if (!barnId) return activityLog;
    return activityLog.filter(log => {
      // 1. Farm-wide activities (inventory, feed, general management) are always relevant
      const isFarmWide = log.action.includes('مخزون') ||
                         log.action.includes('أعلاف') ||
                         log.action.includes('حبوب') ||
                         log.action.includes('صنف') ||
                         log.action.includes('تحديث الاستهلاك') ||
                         log.action.includes('إضافة مخزون') ||
                         log.action.includes('إدارة العمال');
      if (isFarmWide) return true;

      // 2. If it has a serialNumber, check if that sheep belongs or belonged to current barn/group
      if (log.serialNumber) {
        const s = rawSheep.find(sheep => 
          (String(sheep.serialNumber) === String(log.serialNumber) && sheep.tagColor === (log.tagColor || undefined)) || 
          String(sheep.serialNumber) === String(log.serialNumber) || 
          sheep.id === log.serialNumber
        );
        if (s) {
          const pen = pens.find(p => p.id === s.penId);
          if (
            pen?.parentId === barnId ||
            pen?.id === barnId ||
            (s.penId && s.penId.includes(barnId))
          ) {
            return true;
          }
          if (s.movementHistory?.some(m => m.fromPenId === barnId || m.toPenId === barnId || m.fromPenName?.includes(barnId) || m.toPenName?.includes(barnId))) {
            return true;
          }
        }
      }
      
      // 3. If it's a pen-specific action or log detail contains pen name of current group
      const groupPens = pens.filter(p => p.parentId === barnId || p.id === barnId);
      const hasGroupPenName = groupPens.some(p => log.detail?.includes(p.name) || log.action?.includes(p.name));
      if (hasGroupPenName) return true;

      // 4. Fallback: if the detail/action contains the group name itself
      const currentGroup = pens.find(p => p.id === barnId);
      if (currentGroup && (log.detail?.includes(currentGroup.name) || log.action?.includes(currentGroup.name))) {
        return true;
      }

      return false;
    });
  }, [activityLog, rawSheep, pens]);



  // New: Smart Alerts
  const alerts = [
    ...allSheep
      .filter(s => s.medicalRecords?.some(r => {
        if (r.type !== 'vaccine') return false;
        const dueDate = new Date(calculateVaccineDueDate(r.date, r.name));
        const diff = dueDate.getTime() - Date.now();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // Next 7 days
      }))
      .map(s => ({ id: `vac_${s.id}`, type: 'warning', message: tr("تحصين مستحق للأغنام: {0}", s.serialNumber) })),

    ...feedItems
      .filter(f => f.quantity < 50) // Threshold 50
      .map(f => ({ id: `feed_${f.id}`, type: 'danger', message: tr("نقص حاد في العلف: {0} ({1} {2})", f.name, f.quantity, f.unit) }))
  ];

  // Daily feed/vaccine/birth notifications are sent by the server: api/dailyAlerts.ts (Vercel Cron).

  const isAnyFeedLowOrEmpty = React.useMemo(() => {
    return feedItems.some(f => {
      if (f.quantity <= 0) return true;
      
      const isVaried = f.consumptionMethod === 'varied';
      const dailyAvg = f.dailyConsumption || 0;
      let daysLeft: number | null = null;
      if (isVaried && f.variedDailyConsumption) {
        const sum = Object.values(f.variedDailyConsumption).reduce<number>((acc, val) => acc + (Number(val) || 0), 0);
        const weeklyAvg = sum / 7;
        if (weeklyAvg > 0) daysLeft = Math.floor(f.quantity / weeklyAvg);
      } else if (dailyAvg > 0) {
        daysLeft = Math.floor(f.quantity / dailyAvg);
      }
      
      if (daysLeft !== null && daysLeft <= 15) return true;
      if (f.category === 'grain' && f.quantity < 50) return true;
      if (f.category === 'fodder' && f.quantity < 5) return true;
      return false;
    });
  }, [feedItems]);

  // Modals States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSheepModalOpen, setIsSheepModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [productionStatsInitialType, setProductionStatsInitialType] = useState<string | null>(null);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [sectionSearchQuery, setSectionSearchQuery] = useState('');
  const [barnSearchQuery, setBarnSearchQuery] = useState('');
  const [isReorderPensOpen, setIsReorderPensOpen] = useState(false);
  const [isSectionFilterDropdownOpen, setIsSectionFilterDropdownOpen] = useState(false);
  const [isBarnFilterDropdownOpen, setIsBarnFilterDropdownOpen] = useState(false);
  const [isTypeAgeStatsOpen, setIsTypeAgeStatsOpen] = useState(false);
  
  // Sheep search/filter states for Sheep List View
  const [sheepSearchNumber, setSheepSearchNumber] = useState('');
  const [sheepSearchType, setSheepSearchType] = useState('all');
  const [sheepSearchColor, setSheepSearchColor] = useState('all');
  const [sheepSearchAge, setSheepSearchAge] = useState('all');
  const [sheepSearchGender, setSheepSearchGender] = useState('all');
  const [tempSearchNumber, setTempSearchNumber] = useState('');
  const [tempSearchType, setTempSearchType] = useState('all');
  const [tempSearchColor, setTempSearchColor] = useState('all');
  const [tempSearchAge, setTempSearchAge] = useState('all');
  const [tempSearchGender, setTempSearchGender] = useState('all');
  const [isAnimalFilterOpen, setIsAnimalFilterOpen] = useState(false);

  const [showMiscarriageInput, setShowMiscarriageInput] = useState(false);
  const [miscarriageReason, setMiscarriageReason] = useState('');
  const sectionFilterRef = useRef<HTMLDivElement>(null);
  const barnFilterRef = useRef<HTMLDivElement>(null);
  const colorFilterRef = useRef<HTMLDivElement>(null);
  const [isColorDropdownOpen, setIsColorDropdownOpen] = useState(false);

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
  // Bulk move from filter results
  const [bulkMoveFilteredIds, setBulkMoveFilteredIds] = useState<string[] | null>(null);
  // Bulk select mode (manual selection from filter results)
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<Set<string>>(new Set());

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
      const pin = prompt(tr("أدخل الرمز السري لعرض البيانات:"));
      if (pin === currentUser?.settingsPin) {
        setIsDataUnlocked(true);
        setTapCount(0);
      } else if (pin !== null) {
        showAlert('error', tr("خطأ في الدخول"), tr("الرمز السري غير صحيح"));
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
    let unsubscribeOnMessage: (() => void) | null = null;
    let cancelled = false;
    const setupPushNotifications = async () => {
      try {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS) {
          console.log('[iOS] Autostart push skipped to prevent Safari permission block.');
          return;
        }

        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        if (typeof Notification === 'undefined') {
          console.warn("Push Notifications are not supported by this browser.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && 'serviceWorker' in navigator) {
          navigator.serviceWorker.register(new URL('firebase-messaging-sw.js', document.baseURI).href)
            .then((registration) => {
              console.log('FCM SW registered in auto-setup:', registration);
              import('firebase/messaging').then(({ onMessage }) => {
                const handleTokenRetrieve = () => getWebPushToken(messaging, registration, WEB_PUSH_VAPID_KEY);

                handleTokenRetrieve()
                  .then(async (currentToken) => {
                    if (currentToken && currentUser.fcmToken !== currentToken) {
                      await saveDeviceToken(currentUser.id, currentToken);
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

                if (cancelled) return;
                // Keep the handle so a re-login does not stack a second listener (duplicate notifications).
                unsubscribeOnMessage = onMessage(messaging, (payload) => {
                  console.log('Foreground Message received. ', payload);
                  if (Notification.permission === 'granted') {
                    try {
                      new Notification(payload.notification?.title || 'رسالة جديدة', {
                        body: payload.notification?.body || 'لديك رسالة جديدة في مدير الحظائر',
                        icon: new URL('icons/icon-192.png', document.baseURI).href,
                      });
                    } catch (e) {
                      console.error('Failed to show foreground notification:', e);
                    }
                  }
                });
              });
            })
            .catch((err) => {
              console.error('SW registration failed in auto-setup:', err);
            });
        }
      } catch (e) {
        console.error('Push setup failed:', e);
      }
    };
    setupPushNotifications();
    return () => {
      cancelled = true;
      unsubscribeOnMessage?.();
    };
  }, [currentUser?.id]);

  // Only the signed-in farm's accounts are ever loaded; the login screen no longer needs any.
  useEffect(() => {
    if (!currentUser || !ownerId) {
      setUsers([]);
      return;
    }
    const usersRef = query(collection(db, 'users'), where('ownerId', '==', ownerId));
    const unsub = onSnapshot(usersRef, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (err) => {
      console.error("Users Sync Error:", err);
    });
    return () => unsub();
  }, [currentUser?.id, ownerId]);


  // Personal Settings Persistence (safeStorage)
  useEffect(() => { safeStorage.setItem('rai_lang', appLanguage); }, [appLanguage]);
  useEffect(() => { safeStorage.setItem('rai_theme', appTheme); }, [appTheme]);

  // Auto-restore orphaned sheep sections
  useEffect(() => {
    if (!ownerId || pens.length === 0 || rawSheep.length === 0) return;

    // Find all unique invalid penIds used by sheep
    const activePenIds = new Set(pens.map(p => p.id));
    const orphanedPenIds = Array.from(new Set(
      rawSheep
        .map(s => s.penId)
        .filter(penId => {
          if (!penId) return false;
          if (activePenIds.has(penId)) return false;
          if (penId === 'mortality' || penId.startsWith('mortality:')) return false;
          if (penId.startsWith('sold') || penId.startsWith('death')) return false;
          return true;
        })
    ));

    if (orphanedPenIds.length === 0) return;

    // We have orphaned pens. We need to restore them!
    // Find first barn to put them under (since it's a section, it needs a parent barn)
    const targetBarn = pens.find(p => p.isGroup || !p.parentId);
    if (!targetBarn) {
      console.warn("Cannot restore orphaned sections: no parent barn exists.");
      return;
    }

    const restorePens = async () => {
      let restoredCount = 0;
      for (const penId of orphanedPenIds) {
        try {
          const penRef = doc(db, 'farms', ownerId as string, 'pens', penId as string);
          await setDoc(penRef, {
            id: penId,
            name: 'قسم مسترجع',
            parentId: targetBarn.id,
            isGroup: false,
            isMain: false,
            createdAt: new Date().toISOString(),
            sortOrder: pens.length + restoredCount
          });
          restoredCount++;
          logActivity('استرجاع قسم', `تم استرجاع قسم مسترجع للحيوانات الضائعة بـ ID: ${penId}`);
        } catch (error) {
          console.error(`Failed to restore pen ${penId}:`, error);
        }
      }
      if (restoredCount > 0) {
        showAlert('success', tr("تم استرجاع الأقسام المفقودة والحيوانات بنجاح!"), tr("تم العثور على حيوانات في أقسام غير موجودة (تم حذفها سابقاً). تم إنشاء قسم \"قسم مسترجع\" لها بنجاح تحت حظيرة ") + targetBarn.name);
      }
    };

    restorePens();
  }, [ownerId, pens, rawSheep]);

  // Auto-restore orphaned sheep sections
  useEffect(() => {
    if (!ownerId || pens.length === 0 || rawSheep.length === 0) return;

    // Find all unique invalid penIds used by sheep
    const activePenIds = new Set(pens.map(p => p.id));
    const orphanedPenIds = Array.from(new Set(
      rawSheep
        .map(s => s.penId)
        .filter(penId => {
          if (!penId) return false;
          if (activePenIds.has(penId)) return false;
          if (penId === 'mortality' || penId.startsWith('mortality:')) return false;
          if (penId.startsWith('sold') || penId.startsWith('death')) return false;
          return true;
        })
    ));

    if (orphanedPenIds.length === 0) return;

    // We have orphaned pens. We need to restore them!
    // Find first barn to put them under (since it's a section, it needs a parent barn)
    const targetBarn = pens.find(p => p.isGroup || !p.parentId);
    if (!targetBarn) {
      console.warn("Cannot restore orphaned sections: no parent barn exists.");
      return;
    }

    const restorePens = async () => {
      let restoredCount = 0;
      for (const penId of orphanedPenIds) {
        try {
          const penRef = doc(db, 'farms', ownerId as string, 'pens', penId as string);
          await setDoc(penRef, {
            id: penId,
            name: 'قسم مسترجع',
            parentId: targetBarn.id,
            isGroup: false,
            isMain: false,
            createdAt: new Date().toISOString(),
            sortOrder: pens.length + restoredCount
          });
          restoredCount++;
          logActivity('استرجاع قسم', `تم استرجاع قسم مسترجع للحيوانات الضائعة بـ ID: ${penId}`);
        } catch (error) {
          console.error(`Failed to restore pen ${penId}:`, error);
        }
      }
      if (restoredCount > 0) {
        showAlert('success', tr("تم استرجاع الأقسام المفقودة والحيوانات بنجاح!"), tr("تم العثور على حيوانات في أقسام غير موجودة (تم حذفها سابقاً). تم إنشاء قسم \"قسم مسترجع\" لها بنجاح تحت حظيرة ") + targetBarn.name);
      }
    };

    restorePens();
  }, [ownerId, pens, rawSheep]);

  // Click outside for custom section & barn & color filter dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sectionFilterRef.current && !sectionFilterRef.current.contains(event.target as Node)) {
        setIsSectionFilterDropdownOpen(false);
      }
      if (barnFilterRef.current && !barnFilterRef.current.contains(event.target as Node)) {
        setIsBarnFilterDropdownOpen(false);
      }
      if (colorFilterRef.current && !colorFilterRef.current.contains(event.target as Node)) {
        setIsColorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset sheep filters when section changes
  useEffect(() => {
    setSheepSearchNumber('');
    setSheepSearchType('all');
    setSheepSearchColor('all');
    setSheepSearchAge('all');
    setTempSearchNumber('');
    setTempSearchType('all');
    setTempSearchColor('all');
    setTempSearchAge('all');
    setIsAnimalFilterOpen(false);
  }, [selectedPenId]);

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
      showAlert('error', tr("تنبيه"), tr("خطأ: لم يتم العثور على هوية المشروع. يرجى تسجيل الدخول مجدداً."));
      return;
    }
    try {
      await setDoc(doc(db, 'farms', ownerId, 'expenses', expense.id), expense);
      logActivity('إضافة مصروف', `${expense.title}: ${expense.amount} ريال`);
    } catch (e: any) { 
      console.error('Expense Save Error:', e);
      showAlert('error', tr("فشل الحفظ"), tr("حدث خطأ أثناء حفظ المصروف: ") + (e.message || e));
    }
  };

  const handleSaveSale = async (sale: Sale) => {
    if (!ownerId) {
      showAlert('error', tr("تنبيه"), tr("خطأ: لم يتم العثور على هوية المشروع. يرجى تسجيل الدخول مجدداً."));
      return;
    }
    try {
      await setDoc(doc(db, 'farms', ownerId, 'sales', sale.id), sale);
      logActivity('إضافة مبيعات', `${sale.title}: ${sale.amount} ريال`);
    } catch (e: any) { 
      console.error('Sale Save Error:', e);
      showAlert('error', tr("فشل الحفظ"), tr("حدث خطأ أثناء حفظ المبيعات: ") + (e.message || e));
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!ownerId || !can('canDeleteExpenses')) return;
    showConfirm(tr("حذف مصروف"), tr("هل أنت متأكد من حذف هذا المصروف؟"), async () => {
      try {
        await deleteDoc(doc(db, 'farms', ownerId, 'expenses', id));
      } catch (e: any) { console.error('Delete Expense Error:', e); }
    });
  };

  const handleDeleteSale = async (id: string) => {
    if (!ownerId || !can('canDeleteExpenses')) return;
    showConfirm(tr("حذف سجل مبيعات"), tr("هل أنت متأكد من حذف هذا السجل؟"), async () => {
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
      showAlert('error', tr("خطأ في المزامنة"), tr("خطأ: لم يتم اكتشاف هوية المالك لمزامنة المخزون. يرجى إعادة تسجيل الدخول."));
      return;
    }
    try {
      if (newItems.length > feedItems.length) {
        // Item Added
        const addedItem = newItems.find(n => !feedItems.some(f => f.id === n.id));
        if (addedItem) {
          logActivity('إضافة مخزون', `تمت إضافة صنف جديد للمخزون: ${addedItem.name}`);
        }
      } else if (newItems.length < feedItems.length) {
        // Item Deleted
        const deletedItem = feedItems.find(f => !newItems.some(n => n.id === f.id));
        if (deletedItem) {
          await deleteDoc(doc(db, 'farms', ownerId, 'feed', deletedItem.id));
          logActivity('حذف صنف', `تم حذف الصنف: ${deletedItem.name}`);
        }
      } else {
        // Item Updated (Update Consumption / تحديث الاستهلاك)
        let changes: string[] = [];
        let itemName = '';
        
        for (const n of newItems) {
          const original = feedItems.find(f => f.id === n.id);
          if (original) {
            const itemChanges: string[] = [];
            
            if (original.name !== n.name) {
              itemChanges.push(`تعديل الاسم من (${original.name}) إلى (${n.name})`);
            }
            if (original.category !== n.category) {
              const oldCat = original.category === 'grain' ? 'حبوب' : 'أعلاف';
              const newCat = n.category === 'grain' ? 'حبوب' : 'أعلاف';
              itemChanges.push(`تعديل التصنيف من (${oldCat}) إلى (${newCat})`);
            }
            if (original.unit !== n.unit) {
              itemChanges.push(`تعديل الوحدة لـ (${n.name}) من (${original.unit}) إلى (${n.unit})`);
            }
            if (original.quantity !== n.quantity) {
              itemChanges.push(`تعديل كمية المخزن لـ (${n.name}) من (${original.quantity}) إلى (${n.quantity})`);
            }
            if (original.consumptionMethod !== n.consumptionMethod) {
              const oldMethod = original.consumptionMethod === 'uniform' ? 'موحد' : 'يومي متفاوت';
              const newMethod = n.consumptionMethod === 'uniform' ? 'موحد' : 'يومي متفاوت';
              itemChanges.push(`تعديل طريقة الاستهلاك لـ (${n.name}) من (${oldMethod}) إلى (${newMethod})`);
            }
            if (original.dailyConsumption !== n.dailyConsumption) {
              itemChanges.push(`تعديل الاستهلاك اليومي الموحد لـ (${n.name}) من (${original.dailyConsumption}) إلى (${n.dailyConsumption})`);
            }
            
            const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
            const oldVaried = original.variedDailyConsumption || {};
            const newVaried = n.variedDailyConsumption || {};
            days.forEach((dayName, idx) => {
              const oldVal = oldVaried[idx as any] || 0;
              const newVal = newVaried[idx as any] || 0;
              if (oldVal !== newVal) {
                itemChanges.push(`تعديل استهلاك يوم ${dayName} لـ (${n.name}) من (${oldVal}) إلى (${newVal})`);
              }
            });
            
            if (itemChanges.length > 0) {
              changes.push(...itemChanges);
              itemName = n.name;
            }
          }
        }
        
        if (changes.length > 0) {
          logActivity('تحديث الاستهلاك', `تم تحديث استهلاك ${itemName}: ${changes.join(' | ')}`);
        }
      }

      // Sync all items to Firestore
      for (const item of newItems) {
        const cleanItem = JSON.parse(JSON.stringify(item));
        await setDoc(doc(db, 'farms', ownerId, 'feed', item.id), cleanItem);
      }
      logActivity('تحديث المخزون', `تم تحديث بيانات الأعلاف والمؤن`);
      // Note: Full local state also gets updated via onSnapshot automatically
    } catch (e: any) {
      console.error('Feed Sync Error:', e);
      showAlert('error', tr("خطأ في المزامنة"), tr("خطأ في مزامنة المخزون: {0}", e.message || e));
    }
  };

  // --- Pen/Group Handlers ---
  const handleSavePen = async (pen: Pen) => {
    if (!ownerId) {
      showAlert('error', tr("خطأ في النظام"), tr("خطأ فني: لم يتم العثور على هوية المشروع (ownerId). يرجى تسجيل الخروج والدخول مرة أخرى ضروري جداً."));
      return;
    }
    
    let penToSave: any;
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
    } else {
      penToSave = {
        ...editingPen,
        ...pen
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
      showAlert('error', tr("فشل الحفظ"), tr("عذراً، فشل الحفظ في السحابة. \nالسبب: {0}", e.message || e));
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
      showAlert('error', tr("فشل حفظ الترتيب"), tr("فشل تحديث الترتيب في السحابة: {0}", e.message || e));
    }
  };

  const handleDeletePen = async (id: string, isGroup: boolean) => {
    const requiredPermission = isGroup ? 'canDeleteBarns' : 'canDeletePens';
    if (!ownerId || !can(requiredPermission, id)) return;
    const penToDelete = pens.find(p => p.id === id);
    const title = isGroup ? tr('حذف حظيرة') : tr('حذف قسم');
    const msg = isGroup
      ? tr('حذف الحظيرة الرئيسية سيؤدي لحذف جميع الأقسام بداخلها. هل أنت متأكد؟')
      : tr('هل أنت متأكد من حذف هذا القسم؟ سيتم نقل جميع الحيوانات إلى القسم الرئيسي إن وجد.');

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
        if (selectedPenId === id) setSelectedPenId(null);
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
        
        if (editingSheep.serialNumber !== newSheep.serialNumber) {
          changes.push(`تعديل الرقم من (#${editingSheep.serialNumber}) إلى (#${newSheep.serialNumber})`);
        }
        if (editingSheep.tagColor !== newSheep.tagColor) {
          const oldColorLabel = colorNames[editingSheep.tagColor || ''] || 'بدون لون';
          const newColorLabel = colorNames[newSheep.tagColor || ''] || 'بدون لون';
          changes.push(`تعديل اللون من (${oldColorLabel}) إلى (${newColorLabel})`);
        }
        if (editingSheep.birthDate !== newSheep.birthDate) {
          changes.push(`تعديل التاريخ من (${editingSheep.birthDate}) إلى (${newSheep.birthDate})`);
        }
        if (editingSheep.type !== newSheep.type) {
          changes.push(`تعديل الصنف من (${editingSheep.type}) إلى (${newSheep.type})`);
        }
        if (editingSheep.gender !== newSheep.gender) {
          const oldGender = editingSheep.gender === 'male' ? 'ذكر' : 'أنثى';
          const newGender = newSheep.gender === 'male' ? 'ذكر' : 'أنثى';
          changes.push(`تعديل الجنس من (${oldGender}) إلى (${newGender})`);
        }
        if (editingSheep.penId !== newSheep.penId) {
          const oldPenName = pens.find(p => p.id === editingSheep.penId)?.name || 'غير معروف';
          const newPenName = pens.find(p => p.id === newSheep.penId)?.name || 'غير معروف';
          changes.push(`نقل من قسم (${oldPenName}) إلى (${newPenName})`);
        }
        if ((editingSheep.fatherId || '') !== (newSheep.fatherId || '')) {
          const oldFather = editingSheep.fatherId ? `#${editingSheep.fatherId}` : 'بدون';
          const newFather = newSheep.fatherId ? `#${newSheep.fatherId}` : 'بدون';
          changes.push(`تعديل رقم الأب من (${oldFather}) إلى (${newFather})`);
        }
        if ((editingSheep.motherId || '') !== (newSheep.motherId || '')) {
          const oldMother = editingSheep.motherId ? `#${editingSheep.motherId}` : 'بدون';
          const newMother = newSheep.motherId ? `#${newSheep.motherId}` : 'بدون';
          changes.push(`تعديل رقم الأم من (${oldMother}) إلى (${newMother})`);
        }
        if ((editingSheep.nickname || '') !== (newSheep.nickname || '')) {
          const oldNickname = editingSheep.nickname || 'بدون لقب';
          const newNickname = newSheep.nickname || 'بدون لقب';
          changes.push(`تعديل اللقب من (${oldNickname}) إلى (${newNickname})`);
        }
        if ((editingSheep.notes || '') !== (newSheep.notes || '')) {
          changes.push('تعديل الملاحظات');
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
      showAlert('error', tr("فشل الحفظ"), tr("خطأ في حفظ الحيوانات: {0}", e.message || e));
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
      showConfirm(tr("حذف حيوان"), tr("هل أنت متأكد من حذف هذا الرأس نهائياً؟"), performDelete);
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
      showAlert('error', tr("صلاحية غير متوفرة"), tr("ليس لديك صلاحية للقيام بالاستبعاد."));
      return;
    }

    let finalReason = reason;
    if (isTargetExcl && !finalReason) {
      // Reason should come from MoveSheepModal directly
      finalReason = 'غير محدد';
    }

    try {
      if (bulkMoveFilteredIds && bulkMoveFilteredIds.length > 0) {
        // Bulk move from filter results
        const toMove = allSheep.filter(s => bulkMoveFilteredIds.includes(s.id));
        if (toMove.length === 0) { setBulkMoveFilteredIds(null); return; }
        const sourcePen = pens.find(p => p.id === selectedPenId);
        const sourceName = sourcePen?.name || 'قسم غير معروف';
        const targetPenName = pens.find(p => p.id === targetPenId)?.name || (targetPenId.includes('mortality') ? 'المستبعدة' : 'قسم جديد');
        const isTargetExclusion = targetPenId.includes('mortality');
        const toMoveIds = toMove.map(s => s.id);
        setRawSheep(prev => prev.map(s => {
          if (toMoveIds.includes(s.id)) {
            const moveEntry = { fromPenId: s.penId, toPenId: targetPenId, fromPenName: sourceName, toPenName: targetPenName, movedBy: currentUser?.name || 'غير معروف', date: new Date().toISOString().split('T')[0] };
            return { ...s, penId: targetPenId, notes: finalReason && isTargetExclusion ? finalReason : s.notes, exclusionDate: isTargetExclusion ? new Date().toISOString() : (s.exclusionDate || null), movementHistory: [...(s.movementHistory || []), moveEntry] };
          }
          return s;
        }));
        for (const s of toMove) {
          const moveEntry = { fromPenId: s.penId, toPenId: targetPenId, fromPenName: sourceName, toPenName: targetPenName, movedBy: currentUser?.name || 'غير معروف', date: new Date().toISOString().split('T')[0] };
          await updateDoc(doc(db, 'farms', ownerId, 'sheep', s.id), { penId: targetPenId, notes: finalReason && isTargetExclusion ? finalReason : s.notes, exclusionDate: isTargetExclusion ? new Date().toISOString() : (s.exclusionDate || null), movementHistory: [...(s.movementHistory || []), moveEntry] });
        }
        logActivity(isTargetExclusion ? 'استبعاد حيوان' : 'نقل جماعي', `تم نقل ${toMove.length} رأس من [${sourceName}] إلى [${targetPenName}]${finalReason ? `. السبب: ${finalReason}` : ''}`);
        showAlert('success', tr("تم النقل"), tr("تم نقل {0} رأس بنجاح إلى {1}", toMove.length, targetPenName));
        setBulkMoveFilteredIds(null);
      } else if (batchAction && batchAction.action === 'move') {
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

        const toMoveIds = toMove.map(s => s.id);
        const isTargetExclusion = targetPenId.includes('mortality');

        // Optimistically update rawSheep state in real-time
        setRawSheep(prev => prev.map(s => {
          if (toMoveIds.includes(s.id)) {
            const moveEntry = {
              fromPenId: s.penId,
              toPenId: targetPenId,
              fromPenName: sourceName,
              toPenName: targetPenName,
              movedBy: currentUser?.name || 'غير معروف',
              date: new Date().toISOString().split('T')[0]
            };
            return {
              ...s,
              penId: targetPenId,
              notes: finalReason && isTargetExclusion ? finalReason : s.notes,
              exclusionDate: isTargetExclusion ? new Date().toISOString() : (s.exclusionDate || null),
              movementHistory: [...(s.movementHistory || []), moveEntry]
            };
          }
          return s;
        }));

        for (const s of toMove) {
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
          logActivity('استبعاد حيوان', `تم استبعاد ${toMove.length} رأس من [${sourceName}] إلى [${targetPenName}]. السبب: ${finalReason || 'غير محدد'}`);
          if (finalReason && finalReason.startsWith('بيع - بقيمة')) {
            const saleAmountMatch = finalReason.match(/بيع - بقيمة (\d+(?:\.\d+)?) ريال/);
            if (saleAmountMatch) {
              const price = parseFloat(saleAmountMatch[1]);
              for (const s of toMove) {
                const sale: Sale = {
                  id: generateId(),
                  penId: s.penId,
                  relatedAnimalId: s.serialNumber,
                  title: tr("بيع حيوان #{0}", s.serialNumber),
                  amount: price,
                  buyer: 'غير محدد',
                  date: new Date().toISOString().split('T')[0],
                  createdAt: new Date().toISOString(),
                  category: 'sheep'
                };
                await handleSaveSale(sale);
              }
            }
          }
        } else {
          logActivity('نقل جماعي', `تم نقل ${toMove.length} رأس من [${sourceName}] إلى [${targetPenName}]`);
        }
        setBatchAction(null);
      } else if (selectedSheepForAction) {
        const actualSourcePenId = selectedSheepForAction.penId || selectedPenId;
        const sourcePen = pens.find(p => p.id === actualSourcePenId);
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

        // Optimistically update rawSheep in local state immediately
        const targetId = selectedSheepForAction.id;
        setRawSheep(prev => prev.map(s => {
          if (s.id === targetId) {
            return {
              ...s,
              penId: targetPenId,
              notes: finalReason && targetPenId.includes('mortality') ? finalReason : s.notes,
              exclusionDate: isExcl ? new Date().toISOString() : (s.exclusionDate || null),
              movementHistory: updatedHistory
            };
          }
          return s;
        }));

        await updateDoc(doc(db, 'farms', ownerId, 'sheep', selectedSheepForAction.id), {
          penId: targetPenId,
          notes: finalReason && targetPenId.includes('mortality') ? finalReason : selectedSheepForAction.notes,
          exclusionDate: isExcl ? new Date().toISOString() : (selectedSheepForAction.exclusionDate || null),
          movementHistory: updatedHistory
        });
        if (isExcl) {
          logActivity('استبعاد حيوان', `تم نقل #${selectedSheepForAction.serialNumber} من [${sourceName}] إلى [${targetPenName}]. السبب: ${finalReason || 'غير محدد'}`, selectedSheepForAction.serialNumber, selectedSheepForAction.tagColor);
          if (finalReason && finalReason.startsWith('بيع - بقيمة')) {
            const saleAmountMatch = finalReason.match(/بيع - بقيمة (\d+(?:\.\d+)?) ريال/);
            if (saleAmountMatch) {
              const price = parseFloat(saleAmountMatch[1]);
              const sale: Sale = {
                id: generateId(),
                penId: selectedSheepForAction.penId,
                relatedAnimalId: selectedSheepForAction.serialNumber,
                title: tr("بيع حيوان #{0}", selectedSheepForAction.serialNumber),
                amount: price,
                buyer: 'غير محدد',
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                category: 'sheep'
              };
              await handleSaveSale(sale);
            }
          }
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
    if (years > 0) return tr("{0} سنة", years);
    return tr("{0} شهر", months);
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
              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{tr(sheep.type)}</span>
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
          <span className="text-xs">{tr("الأم:")} {getParentSerial(sheep.motherId)} {tr("/ الأب:")} {getParentSerial(sheep.fatherId)}</span>
        </div>
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end">
          <button onClick={() => handleDeleteSheep(sheep.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title={tr("حذف نهائي")}>
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

      const title = isBatch ? tr('بيع {0} رأس من {1}', sheepToSell.length, tr(idOrType)) : tr('بيع الحيوان #{0}', idOrType);
      const msg = tr('هل أنت متأكد من إتمام هذه العملية؟ سيتم نقل الحيوان إلى سجل المستبعدة.');

      showConfirm(tr("تأكيد البيع"), msg, async () => {
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
            logActivity('استبعاد حيوان', `تم بيع واستبعاد ${sheepToSell.length} رأس من نوع (${type}). السبب: ${reason || 'تم البيع'}`);
          } else {
            const sheep = sheepToSell as unknown as Sheep;
            await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), {
              penId: targetMortalityPenId,
              notes: reason || 'تم البيع',
              exclusionDate: new Date().toISOString()
            });
            logActivity('استبعاد حيوان', `تم بيع واستبعاد #${sheep.serialNumber} (${sheep.type}). السبب: ${reason || 'تم البيع'}`, sheep.serialNumber, sheep.tagColor);
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

  const renderSheepRow = (sheep: Sheep, showPenName = true) => {
    const pen = pens.find(p => p.id === sheep.penId);
    const shouldShowPen = showPenName && !selectedPenId;
    const isSelected = selectedBulkIds.has(sheep.id);
    const handleCardClick = () => {
      if (isBulkSelectMode) {
        setSelectedBulkIds(prev => {
          const next = new Set(prev);
          if (next.has(sheep.id)) next.delete(sheep.id);
          else next.add(sheep.id);
          return next;
        });
      } else {
        setViewingSheep(sheep);
      }
    };
    return (
      <div
        key={sheep.id}
        onClick={handleCardClick}
        className={`relative rounded-3xl p-4 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer group aspect-square sm:aspect-auto border hover-glow dark:border-slate-800 premium-shadow ${
          isBulkSelectMode
            ? isSelected
              ? 'bg-brand-500/15 border-brand-500 ring-2 ring-brand-500/40 dark:bg-orange-900/20 dark:border-orange-500'
              : 'bg-gray-50/60 border-gray-200 opacity-70 dark:bg-slate-900'
            : sheep.gender === 'male' ? 'bg-blue-50/30 border-gray-100 dark:bg-slate-900' : 'bg-pink-50/30 border-gray-100 dark:bg-slate-900'
        }`}
      >
        {/* Selection checkmark overlay */}
        {isBulkSelectMode && (
          <div className={`absolute top-2 end-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            isSelected ? 'bg-brand-500 border-brand-500' : 'bg-white border-gray-300 dark:bg-slate-800'
          }`}>
            {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
          </div>
        )}

        {shouldShowPen && pen && (
          <span className="text-[10px] font-black text-gray-500 truncate w-full text-center">
            {pen.name}
          </span>
        )}

        <div className="flex items-center justify-center gap-1 whitespace-nowrap w-full px-1">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 shrink-0">
            {tr(sheep.type)}
          </span>
          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${sheep.gender === 'male' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'}`}>
            {sheep.gender === 'male' ? tr("ذكر") : tr("أنثى")}
          </span>
        </div>

        <div
          className={`px-4 py-2 rounded-2xl flex items-center justify-center shadow-md text-white min-w-[70px] ${sheep.tagColor ? '' : (sheep.gender === 'male' ? 'bg-blue-500' : 'bg-emerald-500')} `}
          style={{ backgroundColor: sheep.tagColor || undefined }}
        >
          <span className="font-black text-xl tracking-tighter">{sheep.serialNumber}</span>
        </div>

        {hasPendingVaccines(sheep) && (
          <div className="absolute top-2 start-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-sm"></div>
        )}
      </div>
    );
  };

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
    if (years > 0) parts.push(tr("{0} سنة", years));
    if (months > 0) parts.push(tr("{0} شهر", months));
    if (days > 0) parts.push(tr("{0} يوم", days));

    return parts.length > 0 ? parts.join(tr(' و ')) : tr('اليوم');
  };



  const renderDetailCard = (sheep: Sheep) => {
    const getMotherInfo = () => {
      if (!sheep.motherId) return null;
      const mother = allSheep.find(s => s.id === sheep.motherId || s.serialNumber === sheep.motherId);
      return mother ? { serialNumber: mother.serialNumber, tagColor: mother.tagColor } : { serialNumber: sheep.motherId, tagColor: undefined };
    };

    return (
      <div className="bg-paper rounded-[2.5rem] p-6 w-full max-w-sm mx-auto shadow-2xl animate-scale-in dark:bg-slate-900">
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
                  {tr(sheep.type)}
                </span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {sheep.gender === 'male' ? tr("ذكر") : tr("أنثى")} • {tr(getAnimalAgeLabel(sheep.birthDate, sheep.type, sheep.gender))}
                </span>
                <span className="text-xs text-blue-500 font-bold mt-0.5" dir={isEnglish ? 'ltr' : 'rtl'}>{calculateDetailedAge(sheep.birthDate)}</span>
                
                {/* Mother Tag & Number Display */}
                {(() => {
                  const motherInfo = getMotherInfo();
                  if (!motherInfo) return null;
                  return (
                    <div className="flex items-center gap-1.5 mt-2 bg-pink-50/40 dark:bg-pink-900/10 px-2 py-1 rounded-xl border border-pink-100/30 w-fit">
                      <span className="text-[10px] font-black text-pink-700 dark:text-pink-300">{tr("رقم الأم:")}</span>
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
          <div className="text-sm text-gray-600 bg-white/50 border border-gray-100 rounded-2xl p-4 mb-6 text-start dark:bg-slate-800 dark:border-slate-700/50">
            <span className="font-black text-gray-400 block mb-2 text-[10px] uppercase tracking-widest">{tr("الملاحظات")}</span>
            <p className="dark:text-gray-300 leading-relaxed text-xs">{sheep.notes}</p>
          </div>
        )}

        {/* Status Buttons */}
        <div className="flex items-center justify-center gap-3 mb-6 mt-2">
          {/* Health Status Button */}
          {sheep.status === 'sick' ? (
            <button
              onClick={async () => {
                showConfirm(tr("تأكيد الشفاء"), tr("هل أنت متأكد من تسجيل الشفاء لهذه الحالة؟"), async () => {
                  try {
                      await updateDoc(doc(db, 'farms', ownerId, 'sheep', sheep.id), { status: 'healthy' });
                      setViewingSheep(undefined);
                  } catch (e) {
                      console.error('Update status error:', e);
                      showAlert('error', tr("خطأ"), tr("حدث خطأ أثناء تحديث الحالة."));
                  }
                });
              }}
              className="flex-1 flex flex-row-reverse items-center justify-center gap-2 py-3 px-2 text-[11px] font-black text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 rounded-2xl shadow-sm transition"
            >
              {tr("مريض")}
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
              {tr("سليم")}
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
                  {tr("غير مضرع")}
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
                    <span>{tr("مضرع")}</span>
                    <Baby size={16} className="text-rose-500" />
                  </div>
                  <span className="text-[9px] opacity-80">{tr("(باقي")} {remainingDays} {tr("يوم)")}</span>
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
                    <span>{tr("أم حضانة")}</span>
                    <Baby size={16} className="text-pink-500" />
                  </div>
                  <span className="text-[9px] opacity-80">{tr("(باقي")} {remainingLactation} {tr("يوم)")}</span>
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
                {tr("⚠️ تنبيه: مضى أكثر من 5 أشهر على الحمل!")}
              </div>
            );
          }
          return null;
        })()}

        <div className="grid grid-cols-3 gap-3">
          {can('canAddMedical') && (
            <button onClick={() => { setViewingSheep(undefined); openMedicalModal(sheep); }} className="relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-purple-700 bg-purple-50 hover:bg-purple-100 transition premium-shadow dark:bg-purple-900/20 dark:text-purple-300">
              <Syringe size={20} />
              {tr("تحصين")}
              {hasPendingVaccines(sheep) && (
                <span className="absolute top-3 start-3 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white"></span>
              )}
            </button>
          )}

          {can('canMoveAnimals') && (
            <button onClick={() => { setViewingSheep(undefined); openMoveModal(sheep); }} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-orange-700 bg-orange-50 hover:bg-orange-100 transition premium-shadow dark:bg-orange-900/20 dark:text-orange-300">
              <ArrowRightLeft size={20} />
              {tr("الاجراءات")}
            </button>
          )}

          {can('canEditAnimals') && (
            <button onClick={() => { setViewingSheep(undefined); openEditSheepModal(sheep); }} className="flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 transition premium-shadow dark:bg-blue-900/20 dark:text-blue-300">
              <Edit size={20} />
              {tr("تعديل")}
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
  const isAnimalSearchActive = React.useMemo(() => {
    return (
      sheepSearchNumber !== '' ||
      sheepSearchType !== 'all' ||
      sheepSearchColor !== 'all' ||
      sheepSearchAge !== 'all' ||
      sheepSearchGender !== 'all'
    );
  }, [sheepSearchNumber, sheepSearchType, sheepSearchColor, sheepSearchAge, sheepSearchGender]);
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
      const numA = parseInt((a.serialNumber || '').replace(/\D/g, '')) || 0;
      const numB = parseInt((b.serialNumber || '').replace(/\D/g, '')) || 0;
      return numA - numB;
    });

  const filteredSheepList = React.useMemo(() => {
    return displayedSheep.filter(s => {
      // 1. Filter by animal number
      if (sheepSearchNumber && !s.serialNumber.toLowerCase().includes(sheepSearchNumber.toLowerCase())) {
        return false;
      }
      // 2. Filter by type
      if (sheepSearchType !== 'all' && s.type !== sheepSearchType) {
        return false;
      }
      // 3. Filter by color
      if (sheepSearchColor !== 'all') {
        const sColor = s.tagColor || 'none';
        if (sColor !== sheepSearchColor) return false;
      }
      // 4. Filter by age
      if (sheepSearchAge !== 'all') {
        const sAge = getAnimalAgeLabel(s.birthDate, s.type, s.gender);
        if (sAge !== sheepSearchAge) return false;
      }
      // 5. Filter by gender
      if (sheepSearchGender !== 'all' && s.gender !== sheepSearchGender) {
        return false;
      }
      return true;
    });
  }, [displayedSheep, sheepSearchNumber, sheepSearchType, sheepSearchColor, sheepSearchAge, sheepSearchGender]);
  const selectedFilteredSheep = filteredSheepList.filter(s => selectedBulkIds.has(s.id));

  // Mortality & Available Pens
  const mortalityPenId = selectedGroupId ? `mortality:${selectedGroupId} ` : '';
  // Relaxed filter to catch any whitespace variations or format mismatches
  const deceasedSheep = selectedGroupId ? allSheep.filter(s => s.penId.startsWith('mortality:') && s.penId.includes(selectedGroupId)) : [];

  const availablePensForMove = selectedGroupId ? [
    ...pens.filter(p => p.parentId === selectedGroupId && p.id !== selectedPenId && !p.isGroup)
         .map(p => ({
            ...p,
            currentCount: allSheep.filter(s => s.penId === p.id).length
         })),
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
        className="flex-none w-[48%] md:w-[280px] snap-center flex flex-col bg-paper rounded-[2.5rem] p-5 shadow-sm border border-gray-100/50 transition-all duration-500 relative cursor-pointer hover:shadow-xl hover:border-brand-500/20 group hover-glow dark:bg-slate-900 dark:border-slate-800"
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-black text-lg text-brand-900 dark:text-gray-200 group-hover:text-brand-500 transition-colors line-clamp-1 w-full text-center">
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
              <span className="text-3xl font-black text-brand-900 dark:text-gray-100">{penSheep.length}</span>
              <span className="text-[10px] text-gray-400 font-bold tracking-widest mt-1 uppercase">{tr("رأس")}</span>
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
            className="flex-1 bg-brand-900 text-white h-10 rounded-2xl text-xs font-black hover:bg-brand-700 transition flex items-center justify-center gap-2 shadow-lg dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            <Eye size={16} />
            <span>{tr("عرض")}</span>
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
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-300 border-t-brand-700 rounded-full animate-spin" />
      </div>
    );
  }
  if (!currentUser) {
    return (
      <AuthScreen
        onLogin={handleLogin}
        onRegisterOwner={handleRegisterOwner}
        onSendPasswordReset={handleSendPasswordReset}
      />
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800 bg-paper transition-colors duration-300 dark:bg-slate-950 dark:text-gray-100" dir={appLanguage === 'ar' ? 'rtl' : 'ltr'}>
      {/* Persistent Logout & Settings Buttons */}
      {(activeTab === 'dashboard' || (activeTab === 'pens' && !selectedGroupId)) && (
        <div className="fixed top-6 end-6 start-6 z-[100] pointer-events-none flex justify-between items-center" dir={isEnglish ? 'ltr' : 'rtl'}>
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
              className="text-gray-400 hover:text-brand-500 transition-all duration-300 bg-white p-3.5 rounded-2xl shadow-lg border border-white/20 hover:shadow-xl active:scale-90 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300"
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
              {activeTab === 'pens' && selectedGroupId ? (
                <button
                  onClick={() => {
                    if (selectedPenId) { setSelectedPenId(null); setSectionSearchQuery(''); }
                    else { setSelectedGroupId(null); }
                  }}
                  className="p-2 rounded-xl bg-paper hover:bg-gray-100 text-gray-500 transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-400"
                >
                  <ArrowRight size={20} className="rtl:rotate-180" />
                </button>
              ) : null}

              {selectedGroup ? (
                <div className="flex flex-col font-sans">
                  {selectedPen ? (
                    <div className="flex items-center gap-2">
                      <h1 className="text-sm sm:text-base font-black text-brand-900 dark:text-gray-100 leading-tight">
                        {selectedPen.name}
                      </h1>
                      <span className="bg-brand-500/10 text-brand-500 text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-lg dark:bg-orange-500/10 dark:text-orange-400">
                        {displayedSheep.length} {tr("رأس")}
                      </span>
                    </div>
                  ) : (
                    <>
                      <h1 className="text-base sm:text-lg font-bold text-brand-900 dark:text-gray-100 leading-tight">
                        {selectedGroup.name}
                      </h1>
                      <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 mt-0.5">
                        {tr("عدد الأقسام:")} {pens.filter(p => p.parentId === selectedGroupId).length}
                      </span>
                    </>
                  )}
                </div>
              ) : (
                <h1 className="text-xl font-bold text-brand-900 flex items-center gap-3 dark:text-gray-100">
                  {t.myBarns}
                </h1>
              )}
            </div>

            {/* Global Header Actions (Moved from inner header) */}
            <div className="flex items-center gap-2 shrink-0">
              {activeTab === 'pens' && selectedGroupId && (
                <>
                  {selectedPen && (
                    <>
                      {/* Edit Section Button */}
                      {can('canEditPens') && (
                        <button 
                          onClick={() => { setEditingPen(selectedPen); setIsAddingGroup(false); setIsModalOpen(true); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold border border-indigo-100 hover:bg-indigo-200 transition dark:bg-indigo-900/20 dark:border-indigo-900/50 whitespace-nowrap"
                          title={tr("تعديل القسم")}
                        >
                          <Edit size={12} /> {tr("تعديل")}
                        </button>
                      )}
                      {/* Delete Section Button */}
                      {can('canDeletePens', selectedPen.id) && (
                        <button 
                          onClick={() => handleDeletePen(selectedPen.id, false)}
                          className="flex items-center justify-center p-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 hover:bg-red-200 transition dark:bg-red-900/20 dark:border-red-900/50"
                          title={tr("حذف القسم")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                  {can('canAddPens') && !selectedPenId && <button onClick={openAddSectionModal} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold border border-blue-100 dark:bg-blue-900/20 whitespace-nowrap"><Warehouse size={12} /> {tr("قسم")} <Plus size={10} /></button>}
                  {can('canAddAnimals') && !selectedPenId && <button onClick={() => openNewSheepModal(undefined)} className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-50 text-orange-600 rounded-xl text-[10px] font-bold border border-orange-100 dark:bg-orange-900/20 whitespace-nowrap"><Dna size={12} /> {t.head} <Plus size={10} /></button>}
                  {!selectedPenId && (
                    <button 
                      onClick={() => setIsChatOpen(true)} 
                      className="relative flex items-center justify-center p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition dark:bg-emerald-900/20 dark:border-emerald-900/50"
                      title={tr("رسايل")}
                    >
                      <MessageCircle size={16} />
                      {unreadChatCount > 0 && (
                        <span className="absolute -top-1 -start-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-white text-[9px] items-center justify-center font-bold">
                            {unreadChatCount > 9 ? '9+' : unreadChatCount}
                          </span>
                        </span>
                      )}
                    </button>
                  )}
                </>
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
               <p className="text-gray-500">{tr("نظرة عامة على المزرعة...")}</p>
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
                <div className="w-16 h-16 rounded-2xl bg-brand-900 flex items-center justify-center text-white mb-4 shadow-xl premium-shadow animate-scale-in dark:bg-orange-600 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                  <Warehouse size={32} />
                </div>
              </div>
                  
                  <h2 className="text-4xl font-black text-brand-900 dark:text-gray-100 tracking-tight">{t.myBarns}</h2>
                  <div className="w-16 h-1.5 bg-brand-500 rounded-full mt-4 dark:bg-orange-600 opacity-20"></div>
                  <p className="text-[9px] text-gray-400 font-black mt-4 uppercase tracking-[0.2em]">{tr("من تطوير JokeR_β")}</p>
                </div>

                 {/* Section Filtering & Custom Reordering Controls (Root View) */}
                 <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-6 gap-3" dir={isEnglish ? 'ltr' : 'rtl'}>
                   {/* Search/Filter Barns Dropdown */}
                   <div className="relative flex-1" ref={barnFilterRef}>
                     <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none z-10" />
                     <button
                       type="button"
                       onClick={() => setIsBarnFilterDropdownOpen(!isBarnFilterDropdownOpen)}
                       className="w-full ps-8 pe-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm flex items-center justify-between text-start cursor-pointer text-gray-700 dark:text-gray-200"
                     >
                       <span>{barnSearchQuery || tr("كل الحظائر")}</span>
                       <div className="text-gray-400 w-3 h-3 flex items-center justify-center text-[10px]">
                         ▼
                       </div>
                     </button>

                     {isBarnFilterDropdownOpen && (
                       <div className="absolute top-full start-0 end-0 mt-1.5 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar animate-scale-in">
                         <div className="p-2 space-y-1">
                           <button
                             type="button"
                             onClick={() => {
                               setBarnSearchQuery('');
                               setIsBarnFilterDropdownOpen(false);
                             }}
                             className={`w-full text-start px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                               barnSearchQuery === ''
                                 ? 'bg-brand-500 text-white shadow-md'
                                 : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800'
                             }`}
                           >
                             {tr("كل الحظائر")}
                           </button>
                           {displayedPens.map((p) => (
                             <button
                               key={p.id}
                               type="button"
                               onClick={() => {
                                 setBarnSearchQuery(p.name);
                                 setIsBarnFilterDropdownOpen(false);
                               }}
                               className={`w-full text-start px-4 py-2.5 rounded-xl text-[10.5px] font-black transition-all ${
                                 barnSearchQuery === p.name
                                   ? 'bg-brand-500 text-white shadow-md'
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
                       className="flex items-center gap-1 px-3 py-2 bg-brand-500/10 text-brand-500 rounded-xl text-[10px] font-black hover:bg-brand-500 hover:text-white transition-all dark:bg-orange-500/10 dark:text-orange-400 whitespace-nowrap shadow-sm border border-brand-500/5 dark:border-orange-500/10"
                       title={tr("إعادة ترتيب الأقسام")}
                     >
                       <ArrowRightLeft size={12} className="rotate-90" />
                       <span>{tr("ترتيب الأقسام")}</span>
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
                              <SwipeableBarnCard onEdit={() => openEditModal(pen)} canEdit={can('canEditBarns')} canDelete={can('canDeleteBarns')}
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
                {can('canAddBarns') && (
                  <div className="fixed bottom-32 end-6 md:end-12 z-[100] pointer-events-none">
                    <button 
                      onClick={openAddBarnModal} 
                      className="pointer-events-auto w-14 h-14 bg-brand-500 text-white rounded-[1.5rem] shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all dark:bg-orange-600 premium-shadow animate-pulse-subtle"
                      title={t.addBarn}
                    >
                      <Plus size={32} />
                    </button>
                  </div>
                )}

                <div className="fixed bottom-10 end-0 start-0 p-6 flex flex-col items-center gap-4 pointer-events-none">
                </div>
              </div>
            ) : (
              /* Inside Barn View */
              <div className="flex-1 flex flex-col min-h-0 relative">
                {barnTab === 'pens' && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto pb-40 pt-6">
                      {/* Section Filtering & Custom Reordering Controls */}
                      {!selectedPenId && (
                        <div className="flex items-center justify-between px-4 md:px-8 mb-4 gap-3" dir={isEnglish ? 'ltr' : 'rtl'}>
                          {/* Search/Filter Sections Input */}
                          <div className="relative flex-1">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none z-10" />
                            <input
                              type="text"
                              placeholder={tr("بحث عن الأقسام...")}
                              value={sectionSearchQuery}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSectionSearchQuery(val);
                                if (selectedPenId) {
                                  setSelectedPenId(null);
                                }
                              }}
                              className="w-full ps-8 pe-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-[11px] font-bold outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 shadow-sm text-start text-gray-700 dark:text-gray-200"
                            />
                            {sectionSearchQuery && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSectionSearchQuery('');
                                  setSelectedPenId(null);
                                }}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-[10px] font-bold w-4 h-4 flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full"
                              >
                                ✕
                              </button>
                            )}
                          </div>

                          {/* Reorder Button */}
                          {can('canReorderPens') && (
                            <button
                              onClick={() => setIsReorderPensOpen(true)}
                              className="flex items-center gap-1 px-3 py-2 bg-brand-500/10 text-brand-500 rounded-xl text-[10px] font-black hover:bg-brand-500 hover:text-white transition-all dark:bg-orange-500/10 dark:text-orange-400 whitespace-nowrap shadow-sm border border-brand-500/5 dark:border-orange-500/10"
                              title={tr("إعادة ترتيب الأقسام")}
                            >
                              <ArrowRightLeft size={12} className="rotate-90" />
                              <span>{tr("ترتيب الأقسام")}</span>
                            </button>
                          )}

                          {/* Animal Filter TOGGLE Button */}
                          <div className="flex items-center gap-2">

                            <button
                              onClick={() => setIsAnimalFilterOpen(!isAnimalFilterOpen)}
                              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap shadow-sm border ${
                                isAnimalFilterOpen || isAnimalSearchActive
                                  ? 'bg-brand-500 text-white border-brand-500 dark:bg-orange-600 dark:border-orange-600'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'
                              }`}
                              title={tr("بحث وتصفية الحيوانات")}
                            >
                              <Filter size={12} />
                              <span>{tr("تصفية الحيوانات")}</span>
                              {isAnimalSearchActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-pulse inline-block ms-0.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}


                      {!selectedPenId && isAnimalFilterOpen && (
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-[2rem] p-5 shadow-sm border border-gray-100 dark:border-slate-800 mx-4 md:mx-8 mb-6 mt-2" dir={isEnglish ? 'ltr' : 'rtl'}>
                          <h4 className="text-[10px] font-black text-gray-400 mb-3">{tr("البحث والتصفية في الحظيرة")}</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-start">
                            {/* Search by Number */}
                            <div className="relative col-span-2 md:col-span-1">
                              <label className="block text-[8px] font-black text-gray-400 mb-1">{tr("رقم الحيوان")}</label>
                              <div className="relative">
                                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                                <input
                                  type="text"
                                  placeholder={tr("رقم الحيوان...")}
                                  value={tempSearchNumber}
                                  onChange={(e) => setTempSearchNumber(e.target.value)}
                                  className="w-full ps-7 pe-2.5 py-1.5 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 rounded-xl text-[10px] font-bold focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all dark:text-white"
                                />
                              </div>
                            </div>

                            {/* Search by Color */}
                            <div>
                              <CustomSelect
                                label={tr("اللون")}
                                modalTitle={tr("كل الألوان")}
                                value={tempSearchColor}
                                onChange={(val) => setTempSearchColor(val)}
                                textSize="text-xs"
                                placeholder={tr("كل الألوان")}
                                options={(() => {
                                  const baseColors: Option[] = [
                                    { value: 'all', label: tr("كل الألوان") },
                                    { value: '#10B981', label: tr("أخضر"), color: '#10B981' },
                                    { value: '#3B82F6', label: tr("أزرق"), color: '#3B82F6' },
                                    { value: '#EC4899', label: tr("وردي"), color: '#EC4899' },
                                    { value: '#EF4444', label: tr("أحمر"), color: '#EF4444' },
                                    { value: '#FACC15', label: tr("أصفر"), color: '#FACC15' },
                                    { value: '#F59E0B', label: tr("برتقالي"), color: '#F59E0B' },
                                    { value: '#8B5CF6', label: tr("بنفسجي"), color: '#8B5CF6' },
                                    { value: '#6366F1', label: tr("نيلي"), color: '#6366F1' },
                                    
                                  ];
                                  const extraColors = Array.from(new Set(displayedSheep.map(s => s.tagColor).filter(c => c && c !== 'none'))) as string[];
                                  extraColors.forEach(c => {
                                    if (c && !baseColors.some(bc => bc.value === c)) {
                                      baseColors.push({
                                        value: c,
                                        label: colorNames[c] || c,
                                        color: c
                                      });
                                    }
                                  });
                                  return baseColors;
                                })()}
                              />
                            </div>

                            {/* Search by Type */}
                            <div>
                              <CustomSelect
                                label={tr("النوع")}
                                modalTitle={tr("كل الأنواع")}
                                value={tempSearchType}
                                onChange={(val) => setTempSearchType(val)}
                                textSize="text-xs"
                                placeholder={tr("كل الأنواع")}
                                options={(() => {
                                  const defaultTypes = ['حري', 'نعيمي', 'نجدي', 'سواكني', 'ماعز', 'أخرى'];
                                  const presentTypes = displayedSheep.map(s => s.type).filter(Boolean);
                                  const allTypes = Array.from(new Set([...defaultTypes, ...presentTypes]));
                                  return [
                                    { value: 'all', label: tr("كل الأنواع") },
                                    ...allTypes.map(t => ({ value: t, label: t }))
                                  ];
                                })()}
                              />
                            </div>

                            {/* Search by Age */}
                            <div>
                              <CustomSelect
                                label={tr("العمر")}
                                modalTitle={tr("كل الأعمار")}
                                value={tempSearchAge}
                                onChange={(val) => setTempSearchAge(val)}
                                textSize="text-xs"
                                placeholder={tr("كل الأعمار")}
                                options={(() => {
                                  const defaultAges = ['طفل', 'جذع', 'ثني', 'رباع', 'سداس', 'تام'];
                                  const presentAges = displayedSheep.map(s => getAnimalAgeLabel(s.birthDate, s.type, s.gender)).filter(Boolean);
                                  const allAges = Array.from(new Set([...defaultAges, ...presentAges]));
                                  return [
                                    { value: 'all', label: tr("كل الأعمار") },
                                    ...allAges.map(a => ({ value: a, label: a }))
                                  ];
                                })()}
                              />
                            </div>

                            {/* Search by Gender - Radio Dots */}
                            <div className="col-span-2 sm:col-span-1">
                              <label className="block text-[8px] font-black text-gray-400 mb-1">{tr("الجنس")}</label>
                              <div className="flex items-center gap-1 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 p-1 rounded-xl">
                                <button
                                  type="button"
                                  onClick={() => setTempSearchGender('all')}
                                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                                    tempSearchGender === 'all'
                                      ? 'bg-brand-500 text-white shadow-xs dark:bg-orange-600'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${tempSearchGender === 'all' ? 'bg-white border-white ring-1 ring-white/50' : 'border-gray-400'}`} />
                                  <span>{tr("الكل")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTempSearchGender('male')}
                                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                                    tempSearchGender === 'male'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${tempSearchGender === 'male' ? 'bg-white border-white ring-1 ring-white/50' : 'border-blue-400'}`} />
                                  <span>{tr("ذكر")}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTempSearchGender('female')}
                                  className={`flex-1 py-1 px-1.5 rounded-lg text-[9px] font-bold flex items-center justify-center gap-1 transition-all ${
                                    tempSearchGender === 'female'
                                      ? 'bg-pink-600 text-white shadow-xs'
                                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700/50'
                                  }`}
                                >
                                  <span className={`w-2 h-2 rounded-full border ${tempSearchGender === 'female' ? 'bg-white border-white ring-1 ring-white/50' : 'border-pink-400'}`} />
                                  <span>{tr("أنثى")}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end mt-4">
                            <button
                              type="button"
                              onClick={() => {
                                setTempSearchNumber('');
                                setTempSearchType('all');
                                setTempSearchColor('all');
                                setTempSearchAge('all');
                                setTempSearchGender('all');
                                setSheepSearchNumber('');
                                setSheepSearchType('all');
                                setSheepSearchColor('all');
                                setSheepSearchAge('all');
                                setSheepSearchGender('all');
                                setIsAnimalFilterOpen(false);
                              }}
                              className="px-5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-black transition dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-gray-300 cursor-pointer"
                            >
                              {tr("الغاء")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSheepSearchNumber(tempSearchNumber);
                                setSheepSearchType(tempSearchType);
                                setSheepSearchColor(tempSearchColor);
                                setSheepSearchAge(tempSearchAge);
                                setSheepSearchGender(tempSearchGender);
                                setIsAnimalFilterOpen(false);
                              }}
                              className="px-5 py-1.5 bg-brand-500 hover:bg-[#5E3F35] text-white rounded-xl text-[10px] font-black transition dark:bg-orange-600 dark:hover:bg-orange-700 cursor-pointer shadow-sm"
                            >
                              {tr("بحث")}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Display Section Cards if NO section selected AND animal search is NOT active */}
                      {!selectedPenId && !isAnimalSearchActive && (
                        <div className="flex overflow-x-auto snap-x gap-4 no-scrollbar pb-6 px-4 md:px-8">
                          {displayedPens
                            .filter(pen => pen.name.includes(sectionSearchQuery))
                            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                            .map(pen => (
                            <div 
                              key={pen.id} 
                              onClick={() => {
                                if (selectedPenId === pen.id) {
                                  setSelectedPenId(null);
                                  setSectionSearchQuery('');
                                } else {
                                  setSelectedPenId(pen.id);
                                  setSectionSearchQuery(pen.name);
                                }
                              }} 
                              className={`flex-none w-32 h-40 snap-center bg-white/95 backdrop-blur-sm rounded-[2rem] p-3 shadow-lg border cursor-pointer dark:bg-slate-900 flex flex-col items-center justify-between hover:scale-[1.03] transition-all group relative overflow-hidden ${
                                selectedPenId === pen.id 
                                  ? 'border-brand-500 ring-2 ring-brand-500/20 dark:border-orange-500 dark:ring-orange-500/20 bg-brand-500/5 dark:bg-brand-500/10' 
                                  : 'border-gray-100 dark:border-slate-800'
                               }`}
                            >
                              <div className="absolute top-0 start-0 w-8 h-8 bg-orange-500/5 rounded-ee-3xl" />
                              <div className="w-10 h-10 rounded-2xl bg-brand-500/5 flex items-center justify-center text-brand-500 mb-1 group-hover:bg-brand-500 group-hover:text-white transition-colors dark:bg-orange-500/10 dark:text-orange-500">
                                 <Warehouse size={20} />
                              </div>
                              <h3 className="font-black text-[11px] text-brand-900 dark:text-gray-100 text-center truncate w-full px-1 mb-1">{pen.name}</h3>
                              <div className="flex items-center gap-1 mb-2">
                                 <span className="text-xl font-black text-brand-500 dark:text-orange-500">{allSheep.filter(s => s.penId === pen.id).length}</span>
                                 <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">{t.head}</span>
                              </div>
                              <div className="flex gap-1 w-full flex-1 items-end">
                                 <button 
                                   onClick={(e) => { 
                                     e.stopPropagation(); 
                                     if (selectedPenId === pen.id) {
                                       setSelectedPenId(null);
                                       setSectionSearchQuery('');
                                     } else {
                                       setSelectedPenId(pen.id);
                                       setSectionSearchQuery(pen.name);
                                     }
                                   }} 
                                   className="flex-1 bg-gray-50 text-gray-500 py-1.5 rounded-xl text-[9px] font-black dark:bg-slate-800 hover:bg-brand-500 hover:text-white transition-all border border-gray-100 dark:border-slate-700"
                                 >
                                   {tr("التفاصيل")}
                                 </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Display Animal Search Results if active (instead of section cards) */}
                      {!selectedPenId && isAnimalSearchActive && (
                        <div className="px-4 md:px-8 pb-10">
                          <div className="bg-white/80 rounded-[2.5rem] shadow-sm border border-gray-100 p-6 dark:bg-slate-900 animate-slide-up">
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4" dir={isEnglish ? 'ltr' : 'rtl'}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-black text-brand-900 dark:text-gray-100 whitespace-nowrap">
                                  {tr("نتائج البحث عن الحيوان")}
                                </h3>
                                <span className="inline-flex items-center gap-1 text-xs font-bold bg-brand-500/10 text-brand-500 px-2.5 py-1 rounded-xl dark:bg-orange-500/10 dark:text-orange-400 whitespace-nowrap shrink-0">
                                  {filteredSheepList.length} {tr("رأس")}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                {/* زر إلغاء التصفية */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTempSearchNumber('');
                                    setTempSearchType('all');
                                    setTempSearchColor('all');
                                    setTempSearchAge('all');
                                    setSheepSearchNumber('');
                                    setSheepSearchType('all');
                                    setSheepSearchColor('all');
                                    setSheepSearchAge('all');
                                    setIsAnimalFilterOpen(false);
                                    setIsBulkSelectMode(false);
                                    setSelectedBulkIds(new Set());
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition dark:bg-red-950/40 dark:text-red-400 cursor-pointer shadow-sm border border-red-100 dark:border-red-900/30 whitespace-nowrap shrink-0 active:scale-95"
                                >
                                  <X size={14} />
                                  <span>{tr("إلغاء التصفية")}</span>
                                </button>
                                {isBulkSelectMode ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsBulkSelectMode(false);
                                        setSelectedBulkIds(new Set());
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-gray-300 text-xs font-bold rounded-xl transition whitespace-nowrap active:scale-95"
                                    >
                                      <X size={14} />
                                      <span>{tr("إلغاء التحديد")}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={selectedFilteredSheep.length === 0}
                                      onClick={() => {
                                        setBulkMoveFilteredIds(selectedFilteredSheep.map(s => s.id));
                                        setIsMoveModalOpen(true);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-brand-500 dark:text-orange-400 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm border border-brand-500/20 dark:border-orange-800/30 whitespace-nowrap active:scale-95"
                                    >
                                      <ArrowRightLeft size={13} />
                                      <span>{tr("نقل المحدد (")}{selectedFilteredSheep.length})</span>
                                    </button>
                                  </>
                                ) : filteredSheepList.length > 0 && can('canMoveAnimals') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedBulkIds(new Set());
                                      setIsBulkSelectMode(true);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 dark:text-orange-400 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm border border-brand-500/20 dark:border-orange-800/30 whitespace-nowrap active:scale-95"
                                  >
                                    <ArrowRightLeft size={13} />
                                    <span>{tr("نقل جماعي")}</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {isBulkSelectMode && (
                              <p className="mb-4 text-xs font-bold text-gray-500 dark:text-gray-400">
                                {tr("اختر الحيوانات التي تريد نقلها، ثم اضغط «نقل المحدد».")}
                              </p>
                            )}

                            {filteredSheepList.length > 0 ? (
                              <div className={`grid ${ (selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3' }`}>
                                {(selectedGroup?.animalType === 'chickens' || selectedGroup?.animalType === 'pigeons') && !isBulkSelectMode ? (
                                   Object.values(filteredSheepList.reduce((acc, s) => {
                                      const key = `${s.type}-${s.tagColor || 'none'}`;
                                      if (!acc[key]) acc[key] = { type: s.type, tagColor: s.tagColor, male: 0, female: 0 };
                                      if (s.gender === 'male') acc[key].male++; else acc[key].female++;
                                      return acc;
                                    }, {} as any)).map((group: any, idx) => (
                                      <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 dark:bg-slate-900">
                                         <div className="flex items-center justify-between mb-4">
                                           <div className="flex items-center gap-3">
                                             <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm" style={{ backgroundColor: group.tagColor || '#D7CCC8' }}><Dna size={18} className="text-white" /></div>
                                             <h3 className="font-bold text-gray-800 dark:text-gray-100">{tr(group.type)}</h3>
                                           </div>
                                           <span className="text-xs font-black bg-brand-500 text-white px-2 py-1 rounded-lg">{group.male + group.female} {tr(currentMetadata.headLabel)}</span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-2 text-center">
                                           <div className="bg-blue-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("ذكور")}</span><span className="font-black text-blue-700">{group.male}</span></div>
                                           <div className="bg-pink-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("إناث")}</span><span className="font-black text-pink-700">{group.female}</span></div>
                                         </div>
                                      </div>
                                    )))
                                  : (
                                   filteredSheepList.map(sheep => renderSheepRow(sheep, true))
                                 )}
                              </div>
                            ) : (
                              <div className="text-center py-12 text-gray-400 dark:text-slate-700 font-bold text-[11px]">
                                {tr("لا توجد نتائج مطابقة لبحثك في هذه الحظيرة")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Inside Section View (ONLY shown when selectedPenId is set, clean with no filters) */}
                      {selectedPenId && (
                        <div className="px-4 md:px-8 mt-2">
                          <div className="bg-white/80 rounded-[2.5rem] shadow-sm border border-gray-100 p-6 dark:bg-slate-900 animate-slide-up">
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
                                             <h3 className="font-bold text-gray-800 dark:text-gray-100">{tr(group.type)}</h3>
                                           </div>
                                           <span className="text-xs font-black bg-brand-500 text-white px-2 py-1 rounded-lg">{group.male + group.female} {tr(currentMetadata.headLabel)}</span>
                                         </div>
                                         <div className="grid grid-cols-2 gap-2 text-center">
                                           <div className="bg-blue-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("ذكور")}</span><span className="font-black text-blue-700">{group.male}</span></div>
                                           <div className="bg-pink-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("إناث")}</span><span className="font-black text-pink-700">{group.female}</span></div>
                                         </div>
                                      </div>
                                    )))
                                  : (
                                   displayedSheep.map((sheep) => renderSheepRow(sheep))
                                 )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-500">
                                <Warehouse size={48} className="text-gray-300 dark:text-slate-700 mb-3" />
                                <p className="font-black text-xs text-gray-500 dark:text-gray-400">{tr("هذا القسم فارغ، لا توجد به حيوانات حالياً")}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {displayedPens.length > 0 && !selectedPenId && (() => {
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
                                <div className="flex justify-between items-center mb-1">
                                  <h3 className="text-[10px] font-black text-brand-900 dark:text-gray-100 text-start uppercase tracking-[0.2em]">{t.typeStats}</h3>
                                  <button 
                                    onClick={() => setIsTypeAgeStatsOpen(true)}
                                    className="text-[9px] font-black text-[#5E3F35] hover:text-orange-800 select-none bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1 rounded-xl border border-orange-100/50 dark:border-orange-900/20 cursor-pointer transition-colors active:scale-95"
                                  >
                                    {tr("عرض تفاصيل الأعمار")}
                                  </button>
                                </div>
                                <div 
                                  onDoubleClick={() => setIsTypeAgeStatsOpen(true)}
                                  className="bg-white/90 rounded-[2rem] p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-6 dark:bg-slate-900 dark:border-slate-800 backdrop-blur-md cursor-pointer hover:shadow-md transition-shadow"
                                  title={tr("انقر مزدوجاً لعرض تفاصيل الأعمار")}
                                >
                                  <div className="flex-1 grid gap-2 max-h-24 overflow-y-auto ps-2 custom-scrollbar">
                                    {chartData.map((d, i) => (
                                      <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50/50 dark:bg-slate-800 justify-start transition-all hover:bg-gray-100/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color && d.color.startsWith('#') ? d.color : (d.color === 'yellow' ? '#FDD835' : (d.color === 'red' ? '#E53935' : '#D7CCC8')) }} />
                                          <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 truncate">{d.name}</span>
                                        </div>
                                        <span className="text-xs font-black text-brand-900 dark:text-gray-100 shrink-0 me-auto">{d.value}</span>
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
                                      <span className="text-xl font-black text-brand-900 dark:text-gray-100">{total}</span>
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
                                      <button onClick={() => setIsRecentsOpen(true)} className="text-[10px] font-bold text-gray-400 hover:text-brand-500 flex items-center gap-1 bg-gray-50 px-2 py-1.5 rounded-lg transition dark:bg-slate-800">
                                        {tr("سجل كامل")} <ChevronLeft size={10} className="rotate-180" />
                                      </button>
                                      
                                      <div className="flex items-center gap-2">
                                        <h3 className="font-black text-sm text-gray-800 dark:text-gray-100">{tr("الأحداث الأخيرة")}</h3>
                                        <div className="p-1.5 bg-pink-50 text-pink-700 rounded-lg dark:bg-pink-900/20"><Calendar size={14} /></div>
                                      </div>
                                    </div>
                                    
                                    {(() => {
                                      const barnLogs = getBarnRelevantLogs(selectedGroupId);
                                      if (barnLogs.length === 0) {
                                        return <div className="text-center py-6 text-gray-300 font-bold text-xs">{tr("لا توجد أحداث مسجلة بالحظيرة")}</div>;
                                      }
                                      return (
                                        <div className="relative ps-3 space-y-5 before:absolute before:start-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800">
                                          {barnLogs.slice(0, 5).map(log => {
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
                                               <div className="flex items-start justify-between gap-4 ps-6">
                                                 {/* Dot marker */}
                                                 <div className={`absolute start-[9px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-paper dark:border-slate-900 ${dotColor} shadow-sm shrink-0`} />
                                                 
                                                 {/* Right content: Action details */}
                                                 <div className="flex-1 text-start min-w-0 ps-1">
                                                   <h4 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 leading-snug">
                                                     {tr(log.action)}
                                                   </h4>
                                                   <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center justify-start gap-1 leading-relaxed">
                                                     {(() => {
                                                       const s_item = log.serialNumber ? (allSheep.find(s => s.serialNumber === log.serialNumber && s.tagColor === (log.tagColor || undefined)) || allSheep.find(s => s.serialNumber === log.serialNumber)) : null;
                                                        const tagCol = log.tagColor || s_item?.tagColor;
                                                       if (!tagCol) return null;
                                                       return (
                                                         <span className="flex flex-col items-center justify-center shrink-0 ms-1 me-0.5">
                                                           <span 
                                                             className="w-2.5 h-2.5 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                                             style={{ backgroundColor: tagCol }}
                                                           />
                                                           <span className="text-[6px] text-gray-400 font-black mt-0.5 leading-none">
                                                             {colorNames[tagCol] || ''}
                                                           </span>
                                                         </span>
                                                       );
                                                     })()}
                                                     <span className="truncate">{log.detail || tr("تحديث بيانات الحلال")}</span>
                                                   </p>
                                                 </div>

                                                 {/* Left content: Date & Show details button */}
                                                 <div className="text-end flex flex-col items-start shrink-0">
                                                   <span className="text-[9px] font-extrabold text-gray-400 leading-none">
                                                     {new Date(log.timestamp).toLocaleDateString(appLocale, { numberingSystem: 'latn' })}
                                                   </span>
                                                   <button
                                                     onClick={() => setExpandedActivityId(isExpanded ? null : log.id)}
                                                     className="text-[9px] font-black text-orange-600 hover:text-orange-800 transition-colors mt-1 cursor-pointer hover:underline bg-transparent border-0 p-0"
                                                   >
                                                     {isExpanded ? tr("إخفاء التفاصيل") : tr("عرض التفاصيل")}
                                                   </button>
                                                 </div>
                                               </div>

                                               {/* Accordion dropdown content */}
                                               {isExpanded && (
                                                 <div className="ms-6 me-2 mt-2 p-3 bg-orange-50/50 dark:bg-slate-800/50 rounded-2xl border border-orange-100/30 dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 space-y-1.5 animate-slide-up text-start">
                                                   {can('canViewActivity') && <div><span className="text-gray-400">{tr("القائم بالعمل:")} </span>{log.userName}</div>}
                                                   <div><span className="text-gray-400">{tr("الإجراء:")} </span>{tr(log.action)}</div>
                                                   <div><span className="text-gray-400">{tr("التفاصيل:")} </span>{log.detail || tr("تحديث بيانات")}</div>
                                                   {(() => {
                                                     const s = log.serialNumber ? (allSheep.find(s => s.serialNumber === log.serialNumber && s.tagColor === (log.tagColor || undefined)) || allSheep.find(s => s.serialNumber === log.serialNumber)) : null;
                                                     const tagCol = log.tagColor || s?.tagColor;
                                                     if (!tagCol) return null;
                                                     return (
                                                       <div className="flex items-center justify-start gap-1.5">
                                                         <span className="text-gray-400">{tr("لون الشارة:")} </span>
                                                         <span className="inline-flex items-center gap-1.5">
                                                           <span 
                                                             className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                                             style={{ backgroundColor: tagCol }}
                                                           />
                                                           {colorNames[tagCol] || tr("ملون")}
                                                         </span>
                                                       </div>
                                                     );
                                                   })()}
                                                   <div><span className="text-gray-400">{tr("التاريخ:")} </span>{new Date(log.timestamp).toLocaleString(appLocale, { numberingSystem: 'latn' })}</div>
                                                 </div>
                                               )}
                                             </div>
                                              );
                                           })}
                                      </div>
                                     );
                                    })()}
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
                {barnTab === 'feed' && can('canViewFeed') && <div className="max-w-5xl mx-auto pt-4 pb-24 px-4"><FeedManager items={feedItems} onUpdate={handleUpdateFeed} penId={selectedGroupId} animalType={selectedGroup?.animalType} onAddExpense={handleSaveExpense} canEdit={can('canEditFeed')} currentUser={currentUser} onShowAlert={showAlert} onShowConfirm={showConfirm} /></div>}
                {barnTab === 'vaccines' && <div className="max-w-2xl mx-auto pt-4 pb-24 px-4 flex justify-center"><VaccinationGuide sheepList={barnSheep} animalType={selectedGroup?.animalType} language={appLanguage} /></div>}
                {barnTab === 'expenses' && can('canViewFinance') && <div className="max-w-5xl mx-auto pt-4 pb-24 px-4"><FinanceManager penId={selectedGroupId!} expenses={expenses} sales={sales} animals={displayedSheep} animalType={selectedGroup?.animalType} onSaveExpense={handleSaveExpense} onSaveSale={handleSaveSale} onDeleteExpense={handleDeleteExpense} onDeleteSale={handleDeleteSale} canAdd={can('canAddExpenses')} canDelete={can('canDeleteExpenses')} onShowAlert={showAlert} onShowConfirm={showConfirm} /></div>}

                {/* Barn Secondary Navigation */}
                <div className="fixed bottom-6 end-0 start-0 z-50 flex justify-center pointer-events-none">
                   <div className="bg-white border border-gray-100 rounded-2xl shadow-xl w-[90%] max-w-lg pointer-events-auto flex items-center justify-between px-2 py-2 dark:bg-slate-900 dark:border-slate-800">
                     {can('canViewFinance') && <button onClick={() => setBarnTab('expenses')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'expenses' ? 'text-orange-600' : 'text-gray-400'}`}><Wallet size={24} /><span className="text-[10px] font-bold">{t.financials}</span></button>}
                     <button onClick={() => setBarnTab('vaccines')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'vaccines' ? 'text-orange-600' : 'text-gray-400'}`}><ShieldCheck size={24} /><span className="text-[10px] font-bold">{t.vaccination}</span></button>
                      <div className="relative -top-6"><button onClick={() => setIsDashboardOpen(true)} className="w-14 h-14 bg-brand-500 rounded-full shadow-lg flex items-center justify-center text-white border-4 border-paper dark:bg-orange-600 dark:border-slate-950"><Plus size={28} strokeWidth={3} /></button></div>
                     {can('canViewFeed') && <button onClick={() => setBarnTab('feed')} className={`flex-1 flex flex-col items-center gap-1 py-1 relative ${barnTab === 'feed' ? 'text-orange-600' : 'text-gray-400'}`}>
                        <div className="relative">
                          <Wheat size={24} />
                          {isAnyFeedLowOrEmpty && (
                            <span className="absolute -top-1.5 -start-1.5 flex h-3.5 w-3.5 z-10">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border border-white dark:border-slate-900"></span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold">{t.stock}</span>
                      </button>}
                     <button onClick={() => setBarnTab('pens')} className={`flex-1 flex flex-col items-center gap-1 py-1 ${barnTab === 'pens' ? 'text-orange-600' : 'text-gray-400'}`}><Warehouse size={24} /><span className="text-[10px] font-bold">{t.sections}</span></button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sheep List View - Integrated into Barn view */}
        {activeTab === 'sheepList' && false && selectedPen && (
          <div className="p-4 md:p-8 space-y-6 animate-fade-in h-[calc(100vh-64px)] overflow-y-auto">
             {/* Filter Bar */}
             {displayedSheep.length > 0 && (
               <div className="bg-white/95 border border-gray-200/10 rounded-3xl p-4 shadow-md dark:bg-slate-900 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-start">
                 {/* Animal Number Search */}
                 <div className="relative">
                   <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 pointer-events-none" />
                   <input
                     type="text"
                     placeholder={tr("رقم الحيوان...")}
                     value={sheepSearchNumber}
                     onChange={(e) => setSheepSearchNumber(e.target.value)}
                     className="w-full ps-8 pe-3 py-2 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-white"
                   />
                 </div>

                 {/* Animal Type Filter */}
                 <div>
                   <select
                     value={sheepSearchType}
                     onChange={(e) => setSheepSearchType(e.target.value)}
                     className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-white cursor-pointer"
                   >
                     <option value="all">{tr("كل الأنواع")}</option>
                     {Array.from(new Set(displayedSheep.map(s => s.type)))
                       .filter(Boolean)
                       .map(type => (
                         <option key={type} value={type}>{type}</option>
                       ))}
                   </select>
                 </div>

                 {/* Tag Color Filter */}
                 <div>
                   <select
                     value={sheepSearchColor}
                     onChange={(e) => setSheepSearchColor(e.target.value)}
                     className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-white cursor-pointer"
                   >
                     <option value="all">{tr("كل الألوان")}</option>
                     {Array.from(new Set(displayedSheep.map(s => s.tagColor || 'none')))
                       .map((color: any) => (
                         <option key={color} value={color}>
                           {colorNames[color] || color}
                         </option>
                       ))}
                   </select>
                 </div>

                 {/* Age Classification Filter */}
                 <div>
                   <select
                     value={sheepSearchAge}
                     onChange={(e) => setSheepSearchAge(e.target.value)}
                     className="w-full px-3 py-2 bg-gray-50/50 dark:bg-slate-800 border border-gray-200/50 dark:border-slate-700/60 rounded-2xl text-[11px] font-bold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all dark:text-white cursor-pointer"
                   >
                     <option value="all">{tr("كل الأعمار")}</option>
                     {Array.from(new Set(displayedSheep.map(s => getAnimalAgeLabel(s.birthDate, s.type, s.gender))))
                       .filter(Boolean)
                       .map(age => (
                         <option key={age} value={age}>{age}</option>
                       ))}
                   </select>
                 </div>
               </div>
             )}

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
                                 <h3 className="font-bold text-gray-800 dark:text-gray-100">{tr(group.type)}</h3>
                               </div>
                               <span className="text-xs font-black bg-brand-500 text-white px-2 py-1 rounded-lg">{group.male + group.female} {tr(currentMetadata.headLabel)}</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-center">
                               <div className="bg-blue-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("ذكور")}</span><span className="font-black text-blue-700">{group.male}</span></div>
                               <div className="bg-pink-50/50 p-2 rounded-xl"><span className="text-[10px] block">{tr("إناث")}</span><span className="font-black text-pink-700">{group.female}</span></div>
                             </div>
                          </div>
                       ))
                    ) : (
                      displayedSheep.map(sheep => renderSheepRow(sheep))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-20"><Warehouse size={64} /><p className="font-bold">{tr("لا توجد بيانات")}</p></div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Dashboard Summary Modal - Restored and Restricted */}
      {isDashboardOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir={isEnglish ? 'ltr' : 'rtl'}>
          <div className="bg-paper w-full max-w-sm h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative border border-[#E8E5DF] animate-scale-in dark:bg-slate-950 dark:border-slate-800">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-center bg-transparent no-print">
              <button 
                onClick={() => setIsDashboardOpen(false)} 
                className="p-2.5 bg-white text-gray-400 rounded-full shadow-sm hover:bg-red-50 hover:text-red-500 transition dark:bg-slate-900 dark:border dark:border-slate-800"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-2xl font-black text-brand-900 flex items-center gap-3 dark:text-gray-100">
                <LayoutGrid className="text-orange-600" size={24} />
                {t.farmSummary}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-5 custom-scrollbar">
              {/* Grid Menu */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'feed', label: tr("إدارة الأعلاف"), icon: Wheat, color: 'text-orange-600 bg-orange-50', allowed: can('canViewReports'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('feed'); setIsReportsModalOpen(true); } },
                  { id: 'health', label: tr("الحالة الصحية"), icon: Activity, color: 'text-blue-600 bg-blue-50', allowed: can('canViewReports'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('health'); setIsReportsModalOpen(true); } },
                  { id: 'sales', label: tr("المبيعات"), icon: Banknote, color: 'text-[#00E676] bg-emerald-50', allowed: can('canViewFinance'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('sales'); setIsReportsModalOpen(true); } },
                  { id: 'finance', label: tr("المصاريف"), icon: Wallet, color: 'text-green-600 bg-green-50', allowed: can('canViewFinance'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setReportsInitialTab('financial'); setIsReportsModalOpen(true); } },
                  { id: 'excluded', label: tr("المستبعدة"), icon: Skull, color: 'text-red-600 bg-red-50', allowed: can('canViewDeaths'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsDeathsModalOpen(true); } },
                  { id: 'production', label: tr("سجل الإنتاج"), icon: BarChart3, color: 'text-purple-600 bg-purple-50', allowed: can('canViewProduction'), onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsStatsModalOpen(true); } },
                  { id: 'workers', label: tr("إدارة العمال"), icon: Users, color: 'text-brand-500 bg-brand-500/10', allowed: isOwner, onClick: () => { setIsDashboardOpen(false); setReturnToDashboard(true); setIsWorkerManageOpen(true); } },
                  { id: 'chat', label: tr("المحادثات"), icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50', allowed: true, onClick: () => { setIsDashboardOpen(false); setIsChatOpen(true); } },
                ].filter(item => item.allowed).map(item => (
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

              {/* Recent Worker Activities Card (Timeline Style) - Only for owner */}
              {isOwner && <div className="bg-white border border-[#EFECE6] rounded-[2rem] p-5 shadow-sm space-y-4 dark:bg-slate-900 dark:border-slate-800">
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
                    className="px-3 py-1.5 bg-[#F5F2EC] hover:bg-[#EFEBE9] text-brand-500 font-bold text-[10px] rounded-full transition-colors flex items-center gap-1"
                  >
                    {tr("عرض الكل &lt;")}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-brand-900 dark:text-gray-100">{tr("سجل العمال")}</h3>
                    <History size={16} className="text-brand-500" />
                  </div>
                </div>

                <div className="relative ps-3 space-y-5 before:absolute before:start-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800">
                  {(() => {
                    const workerActivities = getBarnRelevantLogs(selectedGroupId).filter(log => {
                      if (log.userRole) return log.userRole === 'worker';
                      const u = users.find(user => user.id === log.userId || user.name === log.userName);
                      if (u) return u.role === 'worker';
                      return log.userName !== 'المالك' && log.userId !== currentUser?.id;
                    });

                    if (workerActivities.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-300 font-bold text-xs">{tr("لا توجد أنشطة عمال مسجلة")}</div>
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
                          <div className="flex items-start justify-between gap-4 ps-6">
                            {/* Dot marker */}
                            <div className={`absolute start-[9px] top-1.5 w-3.5 h-3.5 rounded-full border-4 border-paper dark:border-slate-950 ${dotColor} shadow-sm shrink-0`} />
                            
                            {/* Right content: Action details */}
                            <div className="flex-1 text-start min-w-0 ps-1">
                              <h4 className="font-extrabold text-[12px] text-gray-800 dark:text-gray-100 leading-snug">
                                {log.userName}: {tr(log.action)}
                              </h4>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center justify-start gap-1 leading-relaxed">
                                {(() => {
                                  const s_item = log.serialNumber ? (allSheep.find(s => s.serialNumber === log.serialNumber && s.tagColor === (log.tagColor || undefined)) || allSheep.find(s => s.serialNumber === log.serialNumber)) : null;
                                                        const tagCol = log.tagColor || s_item?.tagColor;
                                  if (!tagCol) return null;
                                  return (
                                    <span className="flex flex-col items-center justify-center shrink-0 ms-1 me-0.5">
                                      <span 
                                        className="w-2.5 h-2.5 rounded-full inline-block border border-white dark:border-slate-900 shadow-sm shrink-0" 
                                        style={{ backgroundColor: tagCol }}
                                      />
                                      <span className="text-[6px] text-gray-400 font-black mt-0.5 leading-none">
                                        {colorNames[tagCol] || ''}
                                      </span>
                                    </span>
                                  );
                                })()}
                                <span className="truncate">{log.detail || tr("تحديث بيانات الحظيرة")}</span>
                              </p>
                            </div>

                            {/* Left content: Date & Show details button */}
                            <div className="text-end flex flex-col items-start shrink-0">
                              <span className="text-[9px] font-extrabold text-gray-400 leading-none">
                                {new Date(log.timestamp).toLocaleDateString('en-GB')}
                              </span>
                              <button
                                onClick={() => setExpandedActivityId(isExpanded ? null : log.id)}
                                className="text-[9px] font-black text-orange-600 hover:text-orange-800 transition-colors mt-1 cursor-pointer hover:underline bg-transparent border-0 p-0"
                              >
                                {isExpanded ? tr("إخفاء التفاصيل") : tr("عرض التفاصيل")}
                              </button>
                            </div>
                          </div>

                          {/* Accordion dropdown content */}
                          {isExpanded && (
                            <div className="ms-6 me-2 mt-2 p-3 bg-orange-50/50 dark:bg-slate-800/50 rounded-2xl border border-orange-100/30 dark:border-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 space-y-1.5 animate-slide-up text-start">
                              <div><span className="text-gray-400">{tr("العامل:")} </span>{log.userName}</div>
                              <div><span className="text-gray-400">{tr("الإجراء:")} </span>{tr(log.action)}</div>
                              <div><span className="text-gray-400">{tr("التفاصيل:")} </span>{log.detail || tr("تحديث بيانات")}</div>

                              <div><span className="text-gray-400">{tr("التاريخ:")} </span>{new Date(log.timestamp).toLocaleString(appLocale, { numberingSystem: 'latn' })}</div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>}

            </div>
          </div>
        </div>
      )}

      {/* Recent Events Full Modal */}
      {isRecentsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-paper w-full max-w-lg h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                  <Calendar className="text-brand-500" />
                  {tr("سجل الأحداث")}
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
                <div className="flex items-center gap-1 mb-1 bg-gray-50 p-1 rounded-lg border border-gray-100" dir={isEnglish ? 'ltr' : 'rtl'}>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[8px] font-black text-gray-400 shrink-0">{t.dateFrom}</span>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-md px-1 py-0.5 text-[9px] outline-none focus:border-brand-500 font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-[8px] font-black text-gray-400 shrink-0">{t.dateTo}</span>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full bg-white border border-gray-200 rounded-md px-1 py-0.5 text-[9px] outline-none focus:border-brand-500 font-bold"
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
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5" dir={isEnglish ? 'ltr' : 'rtl'}>
                  {[
                    { id: 'today', label: tr("اليوم") },
                    { id: 'week', label: tr("الأسبوع") },
                    { id: 'month', label: tr("الشهر") },
                    { id: 'year', label: tr("السنة") },
                    { id: 'all', label: tr("الكل") },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setRecentsDateFilter(f.id as any)}
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition ${recentsDateFilter === f.id ? 'bg-brand-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Type Filter (Second Row) */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5" dir={isEnglish ? 'ltr' : 'rtl'}>
                  {[
                    { id: 'all', label: tr("كافة الأحداث"), icon: LayoutGrid },
                    { id: 'edit', label: tr("تعديلات"), icon: Edit },
                    { id: 'birth', label: tr("ولادات/إضافة"), icon: Dna },
                    { id: 'death', label: tr("استبعاد/وفيات"), icon: Skull },
                    { id: 'medical', label: tr("علاجات/تحصين"), icon: Syringe },
                    { id: 'expense', label: tr("مصروفات"), icon: Wallet },
                    { id: 'feed', label: tr("إضافة مخزون"), icon: Wheat },
                    { id: 'feed_update', label: tr("تحديث الاستهلاك"), icon: RefreshCw },
                    { id: 'transfer', label: tr("نقل"), icon: ArrowRightLeft },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setRecentsTypeFilter(f.id as any)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition border ${recentsTypeFilter === f.id ? 'bg-brand-500/10 text-brand-500 border-brand-500/30' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
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
                const relevantLogs = getBarnRelevantLogs(selectedGroupId);

                const allEvents = relevantLogs.map(log => {
                  let type = 'other';
                  let icon = Calendar;
                  let color = 'text-gray-600 bg-gray-50';
                  
                  if (log.action.includes('إضافة حظيرة') || log.action.includes('حظيرة')) {
                    type = 'other';
                    icon = Warehouse;
                    color = 'text-emerald-600 bg-emerald-50';
                  } else if (log.action.includes('تحديث الاستهلاك')) {
                    type = 'feed_update';
                    icon = RefreshCw;
                    color = 'text-orange-600 bg-orange-50';
                  } else if (log.action.includes('مخزون') || log.action.includes('أعلاف') || log.action.includes('حبوب') || log.action.includes('صنف')) {
                    type = 'feed';
                    icon = Wheat;
                    color = 'text-orange-600 bg-orange-50';
                  } else if (log.action.includes('نقل')) {
                    type = 'transfer';
                    icon = ArrowRightLeft;
                    color = 'text-indigo-600 bg-indigo-50';
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
                  } else if (log.action.includes('تعديل') || log.action.includes('تحديث')) {
                    type = 'edit';
                    icon = Edit;
                    color = 'text-amber-600 bg-amber-50';
                  } else if (log.action.includes('إجهاض') || log.action.includes('إلغاء')) {
                    type = 'other';
                    icon = X;
                    color = 'text-red-600 bg-red-50';
                  }

                  const sheep = log.serialNumber
                    ? (allSheep.find(s => s.serialNumber === log.serialNumber && s.tagColor === (log.tagColor || undefined))
                       || allSheep.find(s => s.serialNumber === log.serialNumber)
                       || allSheep.find(s => s.id === log.serialNumber))
                    : null;
                  const logTagColor = log.tagColor || sheep?.tagColor;
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
                          <span className="inline-flex flex-col items-center gap-0.5 bg-gray-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-slate-700 shrink-0">
                            <span 
                              className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm" 
                              style={{ backgroundColor: logTagColor }}
                            />
                            <span className="text-[6px] text-gray-400 font-black leading-none">{colorNames[logTagColor] || tr("ملون")}</span>
                          </span>
                        )}
                        {sheepType && (
                          <span className="bg-orange-50 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400 px-1.5 py-0.5 rounded-md text-[9px] font-black border border-orange-100/50 dark:border-orange-900/30 shrink-0">
                            {sheepType}
                          </span>
                        )}
                        {can('canViewActivity') && (
                          <span className="text-[9px] text-gray-400">{tr("بواسطة:")} <span className="font-extrabold text-gray-600 dark:text-gray-300">{log.userName}</span></span>
                        )}
                      </span>
                    ),
                    icon,
                    color,
                    details: (
                      <div className="space-y-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-start">
                        {can('canViewActivity') && <div><span className="text-gray-400">{tr("القائم بالعمل:")} </span>{log.userName}</div>}
                        <div><span className="text-gray-400">{tr("الإجراء:")} </span>{tr(log.action)}</div>
                        <div><span className="text-gray-400">{tr("التفاصيل:")} </span>{log.detail}</div>
                        {logTagColor && (
                          <div className="flex items-center justify-start gap-1.5">
                            <span className="text-gray-400">{tr("لون الشارة:")} </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span 
                                className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm shrink-0" 
                                style={{ backgroundColor: logTagColor }}
                              />
                              {colorNames[logTagColor] || tr("ملون")}
                            </span>
                          </div>
                        )}

                        <div><span className="text-gray-400">{tr("التاريخ والوقت:")} </span>{new Date(log.timestamp).toLocaleString(appLocale, { numberingSystem: 'latn' })}</div>
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
                    <p className="text-gray-400 font-bold">{tr("لا توجد نتائج لهذا التصنيف")}</p>
                  </div>
                );

                return allEvents.map((event, idx) => (
                  <div key={`${event.id}_${idx}`} className="flex flex-col bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
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
                         {expandedEventId === event.id ? tr("إخفاء التفاصيل") : tr("عرض التفاصيل")}
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
            <div className="bg-white w-64 mt-12 rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-scale-in" dir={isEnglish ? 'ltr' : 'rtl'} onClick={e => e.stopPropagation()}>
              <div className="p-2 space-y-1">
                {can('canViewReports') && <button onClick={() => { setIsActionMenu(false); setIsReportsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <FileText size={18} className="text-teal-600" />
                  {tr("التقارير الشاملة")}
                </button>}
                {can('canViewProduction') && (
                  <button onClick={() => { setIsActionMenu(false); setIsStatsModalOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                    <Activity size={18} className="text-purple-600" />
                    {tr("سجل الانتاج و الاحصائيات")}
                  </button>
                )}
                <div className="h-px bg-gray-100 my-1"></div>
                <button onClick={() => { setIsActionMenu(false); setIsDashboardOpen(true); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <LayoutDashboard size={18} className="text-orange-600" />
                  {tr("لوحة التحكم")}
                </button>
                <button onClick={() => { setIsActionMenu(false); openAddBarnModal(); }} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition text-gray-700 font-bold text-sm">
                  <Plus size={18} className="text-gray-600" />
                  {tr("إضافة حظيرة")}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modals */}
      {isStatsModalOpen && (
      <Suspense fallback={null}>
      <ProductionStats
        isOpen={isStatsModalOpen}
        onClose={() => {
          setIsStatsModalOpen(false);
          setProductionStatsInitialType(null);
          if (returnToDashboard) {
            setIsDashboardOpen(true);
            setReturnToDashboard(false);
          }
        }}
        allSheep={selectedGroupId ? barnSheep : allSheep}
        pens={selectedGroupId ? pens.filter(p => p.parentId === selectedGroupId || p.id === selectedGroupId) : pens}
        initialType={productionStatsInitialType}
      />
      </Suspense>
      )}
      {isReportsModalOpen && (
      <Suspense fallback={null}>
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
        barnName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.name : tr("المزرعة")}
        ownerName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.ownerName || ownerName : ownerName}
        canViewFinance={can('canViewFinance')}
        onShowAlert={showAlert}
        onShowConfirm={showConfirm}
        initialReport={reportsInitialTab}
      />
      </Suspense>
      )}
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
            title: tr("بيع حيوان #{0}", sheep.serialNumber),
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
              const statusAr = status === 'healthy' ? 'سليم' : (status === 'sick' ? 'مريض' : 'تحت العلاج');
              logActivity('تحديث الحالة الصحية', `تم تحديث الحالة الصحية للحيوان #${selectedSheepForAction.serialNumber} إلى (${statusAr})`, selectedSheepForAction.serialNumber, selectedSheepForAction.tagColor);
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
        onClose={() => {
          setIsMoveModalOpen(false);
          if (bulkMoveFilteredIds) {
            setBulkMoveFilteredIds(null);
            setIsBulkSelectMode(false);
            setSelectedBulkIds(new Set());
          }
        }}
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
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir={isEnglish ? 'ltr' : 'rtl'}>
            <div className="bg-paper rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100 dark:bg-slate-900 dark:border-slate-800">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-purple-900/30 dark:text-purple-400">
                  <Baby size={32} />
                </div>
                
                {showMiscarriageInput ? (
                  <div className="space-y-4 text-start animate-fade-in">
                    <h3 className="text-xl font-black text-gray-800 mb-2 dark:text-white text-center">{tr("إلغاء الحمل (إجهاض)")}</h3>
                    <p className="text-xs font-bold text-gray-500 mb-4 dark:text-gray-400 leading-relaxed text-center">
                      {tr("الرجاء كتابة سبب إلغاء الحمل أو الإجهاض لحفظ التغيير في السجل:")}
                    </p>
                    <textarea
                      value={miscarriageReason}
                      onChange={(e) => setMiscarriageReason(e.target.value)}
                      placeholder={tr("مثال: إجهاض تلقائي، حمل كاذب، حادث سقوط...")}
                      rows={3}
                      className="w-full p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-bold text-sm text-start resize-none shadow-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!miscarriageReason.trim()) {
                            showAlert('error', tr("خطأ"), tr("يجب كتابة سبب لإلغاء الحمل."));
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
                            showAlert('success', tr("تم إلغاء الحمل"), tr("تم إلغاء الحمل وتسجيل السبب بنجاح."));
                          } catch (e) { console.error(e); }
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs transition shadow-lg text-center"
                      >
                        {tr("تأكيد الإلغاء")}
                      </button>
                      <button
                        onClick={() => {
                          setShowMiscarriageInput(false);
                          setMiscarriageReason('');
                        }}
                        className="flex-1 py-3.5 rounded-xl bg-gray-100 text-gray-500 font-black text-xs hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700 text-center"
                      >
                        {tr("تراجع")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-black text-gray-800 mb-2 dark:text-white">{tr("تأكيد حالة الإنجاب")}</h3>
                    <p className="text-sm font-bold text-gray-500 mb-6 dark:text-gray-400 leading-relaxed">
                      {reproductionConfirmState.currentStatus === 'empty' ? tr("سيتم تغيير الحالة إلى (مضرع) لمدة 5 أشهر تقريباً.") : 
                       reproductionConfirmState.currentStatus === 'pregnant' ? tr("سيتم تغيير الحالة إلى (أم) لبدء فترة حضانة الرضيع (3 أشهر).") : 
                       tr("سيتم إعادة الحيوان إلى حالة (غير مضرع).")}
                    </p>
                    
                    {(reproductionConfirmState.nextStatus === 'pregnant' || reproductionConfirmState.nextStatus === 'mother') && (
                      <div className="mb-5 text-start space-y-1">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          {reproductionConfirmState.nextStatus === 'pregnant' ? tr("تاريخ التلقيح / الحمل") : tr("تاريخ الولادة")}
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
                            
                            if (nextStatus === 'pregnant') {
                              logActivity('تأكيد حمل', `تم تسجيل حالة حمل للحيوان #${sheep.serialNumber}`, sheep.serialNumber, sheep.tagColor);
                            } else if (nextStatus === 'mother') {
                              logActivity('تأكيد ولادة', `تم تسجيل ولادة للحيوان #${sheep.serialNumber}`, sheep.serialNumber, sheep.tagColor);
                            } else if (nextStatus === 'empty') {
                              logActivity('فطام / إنهاء حضانة', `تم إنهاء حضانة ونقل الأنثى #${sheep.serialNumber} للحالة العادية`, sheep.serialNumber, sheep.tagColor);
                            }

                            closeReproductionConfirmModal();
                          } catch (e) { console.error(e); }
                        }}
                        className="w-full py-4 rounded-2xl bg-purple-600 text-white font-black text-sm hover:bg-purple-700 transition shadow-lg"
                      >
                        {tr("تأكيد")} {reproductionConfirmState.nextStatus === 'pregnant' ? tr("الحمل") : reproductionConfirmState.nextStatus === 'mother' ? tr("الولادة") : tr("إنهاء الحضانة")}
                      </button>
                      
                      {reproductionConfirmState.currentStatus === 'pregnant' && (
                        <button
                          onClick={() => setShowMiscarriageInput(true)}
                          className="w-full py-4 rounded-2xl bg-red-50 text-red-700 border border-red-200 font-black text-sm hover:bg-red-100 transition dark:bg-red-900/20 dark:border-red-900 dark:text-red-400"
                        >
                          {tr("إلغاء الحمل (إجهاض / حمل كاذب)")}
                        </button>
                      )}
                      
                      <button
                        onClick={closeReproductionConfirmModal}
                        className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-sm hover:bg-gray-200 transition dark:bg-slate-800 dark:text-gray-400 dark:hover:bg-slate-700"
                      >
                        {tr("إلغاء")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {isSettingsOpen && (
      <Suspense fallback={null}>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={appLanguage}
        setLanguage={(lang) => { setAppLanguage(lang); switchLanguage(lang); }}
        theme={appTheme}
        setTheme={setAppTheme}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        onVerifyPassword={verifyCurrentPassword}
        onSendPasswordReset={handleSendPasswordReset}
        onSavePushPrefs={currentUser ? (prefs) => savePushPrefs(currentUser.id, prefs) : undefined}
        onShowAlert={showAlert}
        onTestNotifications={handleTestNotifications}
      />
      </Suspense>
      )}

      {isOwner && isWorkerManageOpen && (
        <Suspense fallback={null}>
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
          onResetWorkerPassword={handleResetWorkerPassword}
          pens={pens}
          onShowAlert={showAlert}
          onShowConfirm={showConfirm}
        />
        </Suspense>
      )}

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
        barnName={selectedGroupId ? pens.find(p => p.id === selectedGroupId)?.name : tr("المزرعة")}
      />

      {/* Worker Activity Log Modal */}
      {isWorkerActivityOpen && isOwner && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" dir={isEnglish ? 'ltr' : 'rtl'}>
          <div className="bg-paper w-full max-w-xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col dark:bg-slate-950">
            <div className="p-5 border-b border-gray-100 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
                  <History className="text-brand-900 dark:text-orange-500" />
                  {tr("سجل العمال")}
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
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir={isEnglish ? 'ltr' : 'rtl'}>
                  <button
                    onClick={() => setWorkerFilter('all')}
                    className={`px-4 py-1.5 rounded-full text-[10px] font-black transition whitespace-nowrap border ${workerFilter === 'all' ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}
                  >
                    {tr("جميع العمال")}
                  </button>
                  {users.filter(u => u.role === 'worker').map(w => (
                    <button
                      key={w.id}
                      onClick={() => setWorkerFilter(w.id)}
                      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-black transition whitespace-nowrap border ${workerFilter === w.id ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-gray-400 border-gray-100 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      <Users size={10} />
                      {w.name}
                    </button>
                  ))}
                </div>

                {/* Date Filters */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir={isEnglish ? 'ltr' : 'rtl'}>
                   {[
                     { id: 'today', label: tr("اليوم") },
                     { id: 'week', label: tr("الأسبوع") },
                     { id: 'month', label: tr("الشهر") },
                     { id: 'year', label: tr("السنة") },
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
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1" dir={isEnglish ? 'ltr' : 'rtl'}>
                  {[
                    { id: 'all', label: tr("كافة الأحداث"), icon: LayoutGrid },
                    { id: 'edit', label: tr("تعديلات"), icon: Edit },
                    { id: 'birth', label: tr("ولادات/إضافة"), icon: Dna },
                    { id: 'death', label: tr("استبعاد/وفيات"), icon: Skull },
                    { id: 'medical', label: tr("علاجات/تحصين"), icon: Syringe },
                    { id: 'expense', label: tr("مصروفات"), icon: Wallet },
                    { id: 'feed', label: tr("إضافة مخزون"), icon: Wheat },
                    { id: 'feed_update', label: tr("تحديث الاستهلاك"), icon: RefreshCw },
                    { id: 'transfer', label: tr("نقل"), icon: ArrowRightLeft },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setWorkerActivityFilter(f.id as any)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition border ${workerActivityFilter === f.id ? 'bg-brand-500/10 text-brand-500 border-brand-500/30 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:border-slate-700'}`}
                    >
                      {f.icon && <f.icon size={12} className={(f as any).color || ''} />}
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

                const filteredLogs = getBarnRelevantLogs(selectedGroupId)
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
                    let type = 'other';
                    if (l.action.includes('إضافة حظيرة') || l.action.includes('حظيرة')) {
                      type = 'other';
                    } else if (l.action.includes('تحديث الاستهلاك')) {
                      type = 'feed_update';
                    } else if (l.action.includes('مخزون') || l.action.includes('أعلاف') || l.action.includes('حبوب') || l.action.includes('صنف')) {
                      type = 'feed';
                    } else if (l.action.includes('نقل')) {
                      type = 'transfer';
                    } else if (l.action.includes('إضافة') || l.action.includes('ولادة')) {
                      type = 'birth';
                    } else if (l.action.includes('حذف') || l.action.includes('استبعاد') || l.action.includes('وفاة') || l.action.includes('نفوق')) {
                      type = 'death';
                    } else if (l.action.includes('علاج') || l.action.includes('تحصين') || l.action.includes('تلقيح') || l.action.includes('طبي')) {
                      type = 'medical';
                    } else if (l.action.includes('مصروف') || l.action.includes('مبيعات') || l.action.includes('شراء') || l.action.includes('بيع') || l.action.includes('مالي')) {
                      type = 'expense';
                    } else if (l.action.includes('تعديل') || l.action.includes('تحديث')) {
                      type = 'edit';
                    } else if (l.action.includes('إجهاض') || l.action.includes('إلغاء')) {
                      type = 'other';
                    }
                    return workerActivityFilter === type;
                  });

                if (filteredLogs.length === 0) return (
                  <div className="text-center py-20 text-gray-400">
                    <History size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-bold">{tr("لا توجد أحداث مسجلة حالياً")}</p>
                  </div>
                );

                return (
                  <div className="relative pe-2 ps-12 space-y-6 before:absolute before:inset-y-0 before:start-[3.25rem] before:w-[2px] before:bg-gray-100 dark:before:bg-slate-800" dir={isEnglish ? 'ltr' : 'rtl'}>
                    {filteredLogs.map((log, idx) => {
                      const getActionInfo = (action: string) => {
                        if (action.includes('إضافة حظيرة') || action.includes('حظيرة')) return { icon: Warehouse, color: 'text-emerald-600', dotColor: 'bg-emerald-500' };
                        if (action.includes('تحديث الاستهلاك')) return { icon: RefreshCw, color: 'text-orange-600', dotColor: 'bg-orange-500' };
                        if (action.includes('مخزون') || action.includes('أعلاف') || action.includes('حبوب') || action.includes('صنف')) return { icon: Wheat, color: 'text-orange-600', dotColor: 'bg-orange-500' };
                        if (action.includes('نقل')) return { icon: ArrowRightLeft, color: 'text-indigo-600', dotColor: 'bg-indigo-500' };
                        if (action.includes('إضافة') || action.includes('ولادة')) return { icon: Baby, color: 'text-emerald-600', dotColor: 'bg-emerald-500' };
                        if (action.includes('حذف') || action.includes('استبعاد') || action.includes('وفاة') || action.includes('نفوق')) return { icon: Skull, color: 'text-red-600', dotColor: 'bg-red-500' };
                        if (action.includes('علاج') || action.includes('تحصين') || action.includes('تلقيح') || action.includes('طبي')) return { icon: Syringe, color: 'text-purple-600', dotColor: 'bg-purple-500' };
                        if (action.includes('مصروف') || action.includes('مبيعات') || action.includes('شراء') || action.includes('بيع') || action.includes('مالي')) return { icon: Wallet, color: 'text-blue-600', dotColor: 'bg-blue-500' };
                        if (action.includes('تعديل') || action.includes('تحديث')) return { icon: Edit, color: 'text-amber-600', dotColor: 'bg-amber-500' };
                        return { icon: History, color: 'text-gray-600', dotColor: 'bg-gray-500' };
                      };
                      const { icon: ActionIcon, color, dotColor } = getActionInfo(log.action);
                      const d = new Date(log.timestamp);
                      const dateStr = d.toLocaleDateString('en-GB');
                      const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                      
                      const sheep = log.serialNumber
                        ? (allSheep.find(s => s.serialNumber === log.serialNumber && s.tagColor === (log.tagColor || undefined))
                           || allSheep.find(s => s.serialNumber === log.serialNumber)
                           || allSheep.find(s => s.id === log.serialNumber))
                        : null;
                      const logTagColor = log.tagColor || sheep?.tagColor;
                      
                      return (
                        <div key={log.id} className="relative flex items-start w-full">
                          {/* Date and Time Column (Absolute on the right) */}
                          <div className="absolute -start-14 top-2 flex flex-col items-center w-12 shrink-0">
                            <span className="text-[9px] font-bold text-gray-500 leading-tight">{dateStr}</span>
                            <span className="text-[8px] text-gray-400 font-medium leading-tight">{timeStr}</span>
                          </div>
                          
                          {/* Timeline Dot */}
                          <div className={`absolute -start-3 top-4 w-2 h-2 rounded-full ${dotColor} ring-4 ring-white dark:ring-slate-900 z-10`} />
                          
                          {/* Event Card */}
                          <div className="flex-1 bg-gray-50/50 border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition dark:bg-slate-800/50 dark:border-slate-700 ms-2 w-full">
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <h4 className="font-bold text-gray-900 text-sm dark:text-gray-100 leading-tight">{tr(log.action)}</h4>
                              {logTagColor && (
                                <span className="inline-flex flex-col items-center gap-0.5 bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-slate-700 shrink-0">
                                  <span 
                                    className="w-2 h-2 rounded-full inline-block border border-white dark:border-slate-800 shadow-sm" 
                                    style={{ backgroundColor: logTagColor }}
                                  />
                                  <span className="text-[6px] text-gray-400 font-black leading-none">{colorNames[logTagColor] || tr("ملون")}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 font-bold mb-3">{tr("العامل:")} {log.userName}</p>
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
      <TypeAgeStatsModal 
        isOpen={isTypeAgeStatsOpen}
        onClose={() => setIsTypeAgeStatsOpen(false)}
        sheep={barnSheep}
        onSelectBreed={(breed) => {
          setIsTypeAgeStatsOpen(false);
          setProductionStatsInitialType(breed);
          setIsStatsModalOpen(true);
        }}
      />

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
      {isChatOpen && (
      <Suspense fallback={null}>
      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        currentUser={currentUser} 
        users={users} 
      />
      </Suspense>
      )}

    </div>
  );
}

export default App;
