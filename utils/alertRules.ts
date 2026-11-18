// Rules for the daily push notifications (api/dailyAlerts.ts). No React: this runs on Vercel.
// Each rule mirrors what the app shows, so a notification never disagrees with the screen:
//  - feed:     projected stock after the app's daily 08:00 auto-deduction (App.tsx
//              processAutoFeedDeduction) and days-left like isAnyFeedLowOrEmpty.
//  - vaccines: recommended vaccine not yet recorded, due at birth + target age (MedicalModal.tsx).
//  - births:   pregnant female, expected 150 days after mating (App.tsx reproduction card).
// Reminders fire on set days only (7 days before, the day before, the day, then weekly while
// overdue for 4 weeks); empty feed is reminded daily because it needs action.

import type { FeedItem, Pen, Sheep, User, WorkerPermissions } from '../types';
import { DEFAULT_WORKER_PERMISSIONS } from '../types';
import { vaccinesForType, parseVaccineAgeToDays } from '../constants/vaccines';

export type AlertKind = 'feed' | 'vaccines' | 'births';
export const ALERT_KINDS: AlertKind[] = ['feed', 'vaccines', 'births'];

/** Kinds a user can switch off in Settings ("chat" and "activity" are sent live by api/sendPush). */
export type PushKind = AlertKind | 'chat' | 'activity';
export type PushPrefs = Partial<Record<PushKind, boolean>>;
export const pushKindEnabled = (prefs: PushPrefs | undefined, kind: PushKind) => prefs?.[kind] !== false;

export interface FarmAlert {
  kind: AlertKind;
  /** Pen/section the item lives in (feed: its barn). Used to filter what a worker may see. */
  penId: string | null;
  barnId: string | null;
  barnName: string;
  /** e.g. feed name, "#12", vaccine name */
  subject: string;
  /** days until the event; negative = overdue. For feed: days of stock left (0 = empty). */
  days: number;
}

const DAY = 86_400_000;
const RIYADH_OFFSET = 3 * 3_600_000; // UTC+3, no daylight saving

/** Calendar day number in Saudi time, so "today" matches the farmer's clock. */
export const riyadhDay = (ms: number) => Math.floor((ms + RIYADH_OFFSET) / DAY);
const daysFromToday = (now: number, target: number) => riyadhDay(target) - riyadhDay(now);

export const isReminderDay = (daysUntil: number) =>
  daysUntil === 7 || daysUntil === 1 || daysUntil === 0 ||
  (daysUntil < 0 && daysUntil >= -28 && (-daysUntil) % 7 === 0);

// ---------- feed ----------

const consumptionOn = (item: FeedItem, weekday: number) =>
  item.consumptionMethod === 'varied' && item.variedDailyConsumption
    ? Number((item.variedDailyConsumption as Record<number, number | undefined>)[weekday] || 0)
    : Number(item.dailyConsumption || 0);

/** Stock after the 08:00 (Saudi time) deductions the app would have applied by `now`. */
export const projectedFeedQuantity = (item: FeedItem, now: number): number => {
  let qty = Number(item.quantity || 0);
  const lastStr = item.lastAutoDeduction || item.lastUpdated;
  if (qty <= 0 || !lastStr) return Math.max(0, qty);
  const last = new Date(lastStr).getTime();
  if (isNaN(last)) return qty;
  // first 08:00 Riyadh strictly after `last`
  let cursor = riyadhDay(last) * DAY - RIYADH_OFFSET + 8 * 3_600_000;
  if (last >= cursor) cursor += DAY;
  for (let guard = 0; cursor <= now && qty > 0 && guard < 400; guard++, cursor += DAY) {
    const weekday = new Date(cursor + RIYADH_OFFSET).getUTCDay();
    qty -= consumptionOn(item, weekday);
  }
  return Math.max(0, qty);
};

/** Days of stock left (null = no consumption set), like isAnyFeedLowOrEmpty in App.tsx. */
export const feedDaysLeft = (item: FeedItem, qty: number): number | null => {
  if (qty <= 0) return 0;
  if (item.consumptionMethod === 'varied' && item.variedDailyConsumption) {
    const sum = Object.values(item.variedDailyConsumption).reduce<number>((a, v) => a + (Number(v) || 0), 0);
    return sum > 0 ? Math.floor(qty / (sum / 7)) : null;
  }
  const daily = Number(item.dailyConsumption || 0);
  return daily > 0 ? Math.floor(qty / daily) : null;
};

const FEED_REMIND_DAYS = new Set([15, 7, 3, 1]);

// ---------- farm ----------

export function computeFarmAlerts(farm: { pens: Pen[]; sheep: Sheep[]; feed: FeedItem[] }, now = Date.now()): FarmAlert[] {
  const pensById = new Map(farm.pens.map(p => [p.id, p]));
  const barnOf = (penId?: string | null): Pen | undefined => {
    let p = penId ? pensById.get(penId) : undefined;
    for (let i = 0; p?.parentId && i < 10; i++) p = pensById.get(p.parentId) ?? p;
    return p;
  };
  const alerts: FarmAlert[] = [];

  for (const item of farm.feed) {
    const qty = projectedFeedQuantity(item, now);
    const left = feedDaysLeft(item, qty);
    // Empty stock: remind daily, but only for items in use (a daily consumption is set).
    const inUse = consumptionOn(item, 0) > 0 || Object.values(item.variedDailyConsumption || {}).some(v => Number(v) > 0);
    const remind = qty <= 0 ? inUse : left !== null && FEED_REMIND_DAYS.has(left);
    if (!remind) continue;
    const barn = barnOf(item.penId);
    alerts.push({ kind: 'feed', penId: item.penId ?? null, barnId: barn?.id ?? item.penId ?? null, barnName: barn?.name ?? '', subject: item.name, days: qty <= 0 ? 0 : left! });
  }

  for (const s of farm.sheep) {
    if (!s.penId || s.penId.startsWith('mortality') || s.exclusionDate) continue;
    const pen = pensById.get(s.penId);
    if (!pen || pen.isExclusion) continue;
    const barn = barnOf(s.penId);
    const base = { penId: s.penId, barnId: barn?.id ?? null, barnName: barn?.name ?? '' };

    // vaccines
    const birth = s.birthDate ? new Date(s.birthDate).getTime() : NaN;
    if (!isNaN(birth)) {
      const records = s.medicalRecords || [];
      for (const v of vaccinesForType(s.type)) {
        if (s.gender === 'male' && v.notes?.includes('إناث فقط')) continue;
        const taken = records.some(r => r.type === 'vaccine' && r.name?.toLowerCase().includes(v.name.toLowerCase()));
        if (taken) continue;
        const days = daysFromToday(now, birth + parseVaccineAgeToDays(v.age) * DAY);
        if (isReminderDay(days)) alerts.push({ ...base, kind: 'vaccines', subject: v.name, days });
      }
    }

    // births
    if (s.gender === 'female' && s.reproductionStatus === 'pregnant' && (s.expectedBirthDate || s.pregnancyDate)) {
      const expected = s.expectedBirthDate
        ? new Date(s.expectedBirthDate).getTime()
        : new Date(s.pregnancyDate!).getTime() + 150 * DAY;
      if (!isNaN(expected)) {
        const days = daysFromToday(now, expected);
        if (isReminderDay(days)) alerts.push({ ...base, kind: 'births', subject: `#${s.serialNumber}`, days });
      }
    }
  }
  return alerts;
}

// ---------- who sees what ----------

const permOf = (user: User, key: keyof WorkerPermissions, barnId: string | null) => {
  const perBarn = barnId ? user.permissionsPerBarn?.[barnId] : undefined;
  return perBarn?.[key] ?? user.permissions?.[key] ?? DEFAULT_WORKER_PERMISSIONS[key];
};

/** Same visibility as the app: owners see all; workers see their pens (or pens under them). */
export function alertsForUser(user: User, alerts: FarmAlert[], pens: Pen[]): FarmAlert[] {
  if (user.role === 'owner') return alerts;
  const access = new Set(user.accessiblePens || []);
  if (access.size === 0) return [];
  const pensById = new Map(pens.map(p => [p.id, p]));
  const visible = (penId: string | null) => {
    let p = penId ? pensById.get(penId) : undefined;
    for (let i = 0; p && i < 10; i++) {
      if (access.has(p.id)) return true;
      p = p.parentId ? pensById.get(p.parentId) : undefined;
    }
    // a barn's feed is visible to a worker who can see any section of that barn
    return !!penId && pens.some(c => c.parentId === penId && access.has(c.id));
  };
  return alerts.filter(a => {
    if (!visible(a.penId)) return false;
    if (a.kind === 'feed') return permOf(user, 'canViewFeed', a.barnId);
    if (a.kind === 'vaccines') return permOf(user, 'canAddMedical', a.barnId);
    return true;
  });
}

// ---------- message text ----------

const when = (days: number) =>
  days === 0 ? 'اليوم' : days === 1 ? 'غداً' : days > 1 ? `بعد ${days} أيام` : `متأخر ${-days} يوم`;

const placeList = (alerts: FarmAlert[]) => {
  const counts = new Map<string, number>();
  alerts.forEach(a => counts.set(a.barnName || '—', (counts.get(a.barnName || '—') || 0) + 1));
  return [...counts].map(([name, n]) => `${name} (${n})`).join('، ');
};

export interface PushMessage { kind: AlertKind; title: string; body: string; tag: string; barnId: string | null }

/** One notification per kind: a single item in full, several as a short summary. */
export function buildMessages(alerts: FarmAlert[], farmId: string): PushMessage[] {
  const out: PushMessage[] = [];
  for (const kind of ALERT_KINDS) {
    const list = alerts.filter(a => a.kind === kind);
    if (list.length === 0) continue;
    const single = list.length === 1 ? list[0] : null;
    const oneBarn = new Set(list.map(a => a.barnId)).size === 1 ? list[0].barnId : null;
    let title = '', body = '';
    if (kind === 'feed') {
      const empty = list.filter(a => a.days === 0).length;
      title = single ? '🌾 نقص في العلف' : `🌾 ${list.length} أصناف علف تحتاج تعبئة`;
      body = single
        ? `${single.subject} — ${single.barnName}: ${single.days === 0 ? 'نفد المخزون' : `يكفي ${single.days} ${single.days === 1 ? 'يوم' : 'أيام'}`}`
        : `${empty ? `${empty} نفدت · ` : ''}${list.map(a => a.subject).slice(0, 4).join('، ')}${list.length > 4 ? '…' : ''}`;
    } else if (kind === 'vaccines') {
      const byVaccine = new Map<string, FarmAlert[]>();
      list.forEach(a => byVaccine.set(a.subject, [...(byVaccine.get(a.subject) || []), a]));
      title = list.length === 1 ? '💉 تطعيم مستحق' : `💉 ${list.length} تطعيمات مستحقة`;
      body = [...byVaccine].slice(0, 3).map(([name, items]) =>
        `${name}: ${items.length} ${items.length === 1 ? 'رأس' : 'رؤوس'} (${when(Math.min(...items.map(i => i.days)))})`).join(' · ')
        + (byVaccine.size > 3 ? ' …' : '') + (oneBarn ? ` — ${list[0].barnName}` : ` — ${placeList(list)}`);
    } else {
      title = single ? '🐑 ولادة متوقعة' : `🐑 ${list.length} ولادات متوقعة`;
      body = single
        ? `${single.subject} — ${single.barnName}: ${when(single.days)}`
        : `${list.slice(0, 4).map(a => `${a.subject} (${when(a.days)})`).join('، ')}${list.length > 4 ? '…' : ''} — ${placeList(list)}`;
    }
    out.push({ kind, title, body, tag: `${kind}-${farmId}`, barnId: oneBarn });
  }
  return out;
}
