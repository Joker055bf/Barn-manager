// Display-language layer.
//
// Arabic is the source language: every UI string is written in Arabic and wrapped in tr().
// In English mode tr() looks the Arabic text up in constants/en.ts; anything not in the
// dictionary (user-entered names, notes, activity history) is shown unchanged.
//
// Data stored in Firestore (animal types, age labels, colours) stays Arabic so records keep
// working; only what is rendered goes through tr().
//
// The language is read once at startup. Changing it saves the choice and reloads the page,
// which keeps tr() a plain function usable anywhere (components, alerts, helpers).

import { en } from './en';
import { safeStorage } from '../utils/storage';

export type AppLanguage = 'ar' | 'en';

const readLanguage = (): AppLanguage => {
  try {
    return safeStorage.getItem('rai_lang') === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
};

export const currentLanguage: AppLanguage = readLanguage();
export const isEnglish = currentLanguage === 'en';
/** Locale for dates and numbers (Latin digits in both languages, as before). */
export const appLocale = isEnglish ? 'en-GB' : 'ar-EG';

const fill = (text: string, args: unknown[]) =>
  args.length ? text.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)] ?? '') : m)) : text;

const warned = new Set<string>();

/**
 * Translate an Arabic UI string. `{0}`, `{1}`… in the text are replaced by args.
 * Non-string input (numbers, undefined) is returned as-is so data can be passed straight through.
 */
export function tr(text: string, ...args: unknown[]): string;
export function tr<T>(text: T, ...args: unknown[]): T;
export function tr(text: any, ...args: unknown[]): any {
  if (typeof text !== 'string') return text;
  if (!isEnglish) return fill(text, args);
  const hit = en[text] ?? en[text.trim()];
  if (hit === undefined && (import.meta as any).env?.DEV && /[؀-ۿ]/.test(text) && !warned.has(text)) {
    warned.add(text);
    console.debug('[i18n] missing English for:', text);
  }
  return fill(hit ?? text, args);
}

/** Saves the language and reloads so every screen re-renders in it. */
export const switchLanguage = (lang: AppLanguage) => {
  if (lang === currentLanguage) return;
  try { safeStorage.setItem('rai_lang', lang); } catch { /* ignore */ }
  window.location.reload();
};
