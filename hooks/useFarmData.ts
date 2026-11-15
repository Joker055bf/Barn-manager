import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { ActivityEntry, Death, Expense, FeedItem, Pen, Sale, Sheep } from '../types';

const logSyncError = (what: string) => (err: unknown) => console.error(`${what} sync error:`, err);

/** Live copies of one farm's collections (farms/{ownerId}/...). Empty until ownerId is known. */
export function useFarmData(ownerId: string | null | undefined) {
  const [pens, setPens] = useState<Pen[]>([]);
  const [rawSheep, setRawSheep] = useState<Sheep[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deaths, setDeaths] = useState<Death[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!ownerId) return;
    const col = (name: string) => collection(db, 'farms', ownerId, name);
    const unsubscribes = [
      onSnapshot(col('pens'), s => setPens(s.docs.map(d => ({ id: d.id, ...d.data() } as Pen))), logSyncError('Pens')),
      onSnapshot(col('sheep'), s => setRawSheep(s.docs.map(d => ({ id: d.id, ...d.data() } as Sheep))), logSyncError('Sheep')),
      onSnapshot(col('feed'), s => setFeedItems(s.docs.map(d => ({ id: d.id, ...d.data() } as FeedItem))), logSyncError('Feed')),
      onSnapshot(col('expenses'), s => setExpenses(s.docs.map(d => ({ id: d.id, ...d.data() } as Expense))), logSyncError('Expenses')),
      onSnapshot(col('sales'), s => setSales(s.docs.map(d => ({ id: d.id, ...d.data() } as Sale))), logSyncError('Sales')),
      onSnapshot(col('deaths'), s => setDeaths(s.docs.map(d => ({ id: d.id, ...d.data() } as Death))), logSyncError('Deaths')),
      onSnapshot(query(col('activity'), orderBy('timestamp', 'desc'), limit(200)), s => {
        const logs = s.docs.map(d => ({ id: d.id, ...d.data() } as ActivityEntry));
        setActivityLog(logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
      }, logSyncError('Activity')),
    ];
    return () => unsubscribes.forEach(unsub => unsub());
  }, [ownerId]);

  return { pens, setPens, rawSheep, setRawSheep, feedItems, expenses, sales, deaths, activityLog };
}
