/**
 * IndexedDB-backed cache for admin pages with fallback to localStorage.
 * Enables instant zero-wait page loads with Stale-While-Revalidate pattern.
 */

const DB_NAME = 'hotpot_admin_store';
const DB_VERSION = 1;
const STORE_NAME = 'admin_cache';

let dbPromise = null;

function openDB() {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[admin-idb] IndexedDB open error, falling back to storage:', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('[admin-idb] Exception opening IndexedDB:', err);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

/** Synchronous fallback reading from localStorage for instant 1st frame render */
export function getSyncLocalCache(key) {
  try {
    const raw = localStorage.getItem(`admin_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Synchronous fallback writing to localStorage */
export function setSyncLocalCache(key, data) {
  try {
    localStorage.setItem(`admin_cache_${key}`, JSON.stringify(data));
  } catch {
    // Ignore quota issues
  }
}

export async function getAdminCache(key) {
  try {
    const db = await openDB();
    if (!db) return getSyncLocalCache(key);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.data !== undefined) {
          resolve(req.result.data);
        } else {
          resolve(getSyncLocalCache(key));
        }
      };
      req.onerror = () => resolve(getSyncLocalCache(key));
    });
  } catch (err) {
    return getSyncLocalCache(key);
  }
}

export async function setAdminCache(key, data) {
  setSyncLocalCache(key, data);
  try {
    const db = await openDB();
    if (!db) return;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, data, updatedAt: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    // non-fatal
  }
}

export async function clearAdminCache() {
  try {
    const db = await openDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
    }
    const keys = ['analytics', 'riders', 'reviews', 'orders', 'meals'];
    keys.forEach((k) => localStorage.removeItem(`admin_cache_${k}`));
  } catch {
    // non-fatal
  }
}
