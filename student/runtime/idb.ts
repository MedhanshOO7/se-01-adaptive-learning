// Browser StorageBackend backed by IndexedDB. Stores the opaque encrypted records produced
// by the event store, in insertion order, under one auto-incrementing key.

import type { StorageBackend } from './store.ts';

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
