// Daily push notifications: feed running out, vaccinations due, expected births.
// Runs from Vercel Cron (vercel.json) every morning; Vercel calls it with
// "Authorization: Bearer $CRON_SECRET". The same secret lets you run it by hand:
//   curl -H "Authorization: Bearer <CRON_SECRET>" "https://<site>/api/dailyAlerts?dry=1"
// dry=1 computes and returns the messages without sending anything; summary=1 adds the
// weekly owner summary on any day (normally Saturdays only).
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getFirestore } from 'firebase-admin/firestore';
import { adminReady, sendToUser, userTokens } from './_firebaseAdmin.js';
import { alertsForUser, buildMessages, computeFarmAlerts, isSummaryDay, pushKindEnabled, weeklySummary } from '../utils/alertRules.js';
import type { Death, Expense, FeedItem, Pen, Sale, Sheep, User } from '../types.js';

const SITE_URL = process.env.SITE_URL || 'https://barn-manager-eight.vercel.app/';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: 'CRON_SECRET is not set on Vercel' });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
  if (!adminReady()) return res.status(500).json({ error: 'Firebase Admin SDK not initialized' });

  const dryRun = req.query.dry === '1';
  const withSummary = req.query.summary === '1' || isSummaryDay(Date.now());
  const db = getFirestore();
  const now = Date.now();
  const report: any[] = [];
  let sent = 0;

  const owners = await db.collection('users').where('role', '==', 'owner').get();
  for (const ownerDoc of owners.docs) {
    const farmId = ownerDoc.id;
    try {
      const members = await db.collection('users').where('ownerId', '==', farmId).get();
      const recipients = members.docs
        .map(d => ({ id: d.id, data: d.data() as User }))
        .filter(m => userTokens(m.data).length > 0);
      if (!members.docs.some(d => d.id === farmId) && userTokens(ownerDoc.data()).length > 0) {
        recipients.push({ id: farmId, data: ownerDoc.data() as User }); // owner doc without ownerId field
      }
      if (recipients.length === 0) continue;

      const farm = db.collection('farms').doc(farmId);
      const [pens, sheep, feed] = await Promise.all([
        farm.collection('pens').get(), farm.collection('sheep').get(), farm.collection('feed').get(),
      ]);
      const pensList = pens.docs.map(d => ({ id: d.id, ...d.data() } as Pen));
      const sheepList = sheep.docs.map(d => ({ id: d.id, ...d.data() } as Sheep));
      const alerts = computeFarmAlerts({
        pens: pensList,
        sheep: sheepList,
        feed: feed.docs.map(d => ({ id: d.id, ...d.data() } as FeedItem)),
      }, now);

      // Weekly summary: owner only, Saturdays.
      const owner = recipients.find(r => r.id === farmId);
      if (withSummary && owner && pushKindEnabled(owner.data.pushPrefs, 'summary')) {
        const [deaths, sales, expenses] = await Promise.all([
          farm.collection('deaths').get(), farm.collection('sales').get(), farm.collection('expenses').get(),
        ]);
        const summary = weeklySummary({
          pens: pensList, sheep: sheepList,
          deaths: deaths.docs.map(d => d.data() as Death),
          sales: sales.docs.map(d => d.data() as Sale),
          expenses: expenses.docs.map(d => d.data() as Expense),
        }, now);
        if (summary) {
          report.push({ farm: farmId.slice(0, 6), user: owner.data.name, role: 'owner', kind: 'summary', ...summary });
          if (!dryRun) sent += await sendToUser(owner.id, owner.data, { ...summary, tag: `summary-${farmId}`, link: SITE_URL });
        }
      }
      if (alerts.length === 0) continue;

      for (const r of recipients) {
        const mine = alertsForUser(r.data, alerts, pensList).filter(a => pushKindEnabled(r.data.pushPrefs, a.kind));
        for (const msg of buildMessages(mine, farmId)) {
          report.push({ farm: farmId.slice(0, 6), user: r.data.name, role: r.data.role, ...msg });
          if (!dryRun) sent += await sendToUser(r.id, r.data, { title: msg.title, body: msg.body, tag: msg.tag, link: SITE_URL });
        }
      }
    } catch (e: any) {
      console.error(`dailyAlerts failed for farm ${farmId}:`, e);
      report.push({ farm: farmId.slice(0, 6), error: e?.message || String(e) });
    }
  }
  res.status(200).json({ dryRun, farms: owners.size, messages: report.length, delivered: sent, report });
}
