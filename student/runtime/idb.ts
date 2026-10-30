// Browser StorageBackends. IndexedDB is preferred; localStorage is the fallback that still
// works when a student opens the lesson from a `file://` URL (where Chrome blocks IndexedDB).
// Both store the opaque encrypted records produced by the event store, in insertion order.

import type { StorageBackend } from './store.ts';

/** Probe whether IndexedDB actually works here (it is defined but blocked on file:// in Chrome). */
export function indexedDbAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(false);
    let done = false;
    const finish = (ok: boolean) => { if (!done) { done = true; resolve(ok); } };
    try {
      const req = indexedDB.open('se01-probe');
      req.onsuccess = () => { req.result.close(); finish(true); };
      req.onerror = () => finish(false);
      req.onblocked = () => finish(false);
      setTimeout(() => finish(false), 1000); // some browsers neither resolve nor error on file://
    } catch {
      finish(false);
    }
  });
}

/** localStorage-backed store: the whole encrypted log lives under one JSON key. */
export function localStorageBackend(storageKey: string, ls: Storage = globalThis.localStorage): StorageBackend {
  const read = (): string[] => {
    try { return JSON.parse(ls.getItem(storageKey) ?? '[]') as string[]; } catch { return []; }
  };
  return {
    async getAll() { return read(); },
    async append(record) { const all = read(); all.push(record); ls.setItem(storageKey, JSON.stringify(all)); },
    async clear() { ls.removeItem(storageKey); },
  };
}

export function indexedDbBackend(dbName = 'se01', storeName = 'events'): StorageBackend {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(storeName)) {
          req.result.createObjectStore(storeName, { autoIncrement: true });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

  const tx = async <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = fn(db.transaction(storeName, mode).objectStore(storeName));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  };

  return {
    async getAll() {
      return (await tx<string[]>('readonly', (s) => s.getAll())) ?? [];
    },
    async append(record) {
      await tx('readwrite', (s) => s.add(record));
    },
    async clear() {
      await tx('readwrite', (s) => s.clear());
    },
  };
}
