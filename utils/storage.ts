// Safe storage wrapper for localStorage to handle Incognito Mode / SecurityExceptions
let memoryStorage: Record<string, string> = {};

const isStorageSupported = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

const storageSupported = isStorageSupported();

export const safeStorage = {
  getItem: (key: string): string | null => {
    if (storageSupported) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {
        console.warn(`safeStorage.getItem failed for key "${key}", falling back to memory:`, e);
      }
    }
    return memoryStorage[key] !== undefined ? memoryStorage[key] : null;
  },

  setItem: (key: string, value: string): void => {
    if (storageSupported) {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn(`safeStorage.setItem failed for key "${key}", falling back to memory:`, e);
      }
    }
    memoryStorage[key] = value;
  },

  removeItem: (key: string): void => {
    if (storageSupported) {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch (e) {
        console.warn(`safeStorage.removeItem failed for key "${key}", falling back to memory:`, e);
      }
    }
    delete memoryStorage[key];
  },

  clear: (): void => {
    if (storageSupported) {
      try {
        window.localStorage.clear();
      } catch (e) {
        console.warn('safeStorage.clear failed, falling back to memory:', e);
      }
    }
    memoryStorage = {};
  }
};
