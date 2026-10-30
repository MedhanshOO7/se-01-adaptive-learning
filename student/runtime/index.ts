// Student runtime entry. The build injects `window.__SE01__` (chapter metadata, the quizzes
// with skill tags, the skill graph, and the integrity/encryption secret) and this script.
// Everything here runs offline in the browser.

import { openEventStore, memoryBackend, type EventStore, type StorageBackend } from './store.ts';
import { indexedDbBackend, indexedDbAvailable, localStorageBackend } from './idb.ts';
import { wireRuntime, type RuntimeConfig } from './dom.ts';

export interface InjectedConfig extends RuntimeConfig {
  /** Integrity + encryption secret, baked into the bundle at build time. */
  secret: string;
}

// Durable where possible: IndexedDB, else localStorage (works on file:// where IndexedDB is
// blocked), else in-memory (progress won't survive reload — private mode / blocked storage).
async function pickBackend(chapterId: string): Promise<{ backend: StorageBackend; kind: string }> {
  const key = `se01:${chapterId}`;
  if (await indexedDbAvailable()) return { backend: indexedDbBackend(key), kind: 'indexeddb' };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('se01-probe', '1');
      localStorage.removeItem('se01-probe');
      return { backend: localStorageBackend(key), kind: 'localstorage' };
    }
  } catch {
    /* fall through */
  }
  return { backend: memoryBackend(), kind: 'memory' };
}

export async function bootstrap(config: InjectedConfig): Promise<EventStore> {
  const { backend, kind } = await pickBackend(config.chapterId);
  if (kind === 'memory') {
    console.warn('[se01] no durable storage available — progress will not survive a reload.');
  }

  const store = await openEventStore({
    backend,
    secret: config.secret,
    chapterId: config.chapterId,
    chapterRevision: config.chapterRevision,
  });

  const status = await store.verify();
  if (!status.ok) {
    console.warn('[se01] saved progress failed its integrity check and may have been edited:', status);
  }

  wireRuntime(config, store);
  return store;
}

declare global {
  interface Window {
    __SE01__?: InjectedConfig;
  }
}

if (typeof window !== 'undefined' && window.__SE01__) {
  void bootstrap(window.__SE01__);
}

export { wireRuntime } from './dom.ts';
export { openEventStore, memoryBackend } from './store.ts';
export { indexedDbBackend } from './idb.ts';
export { chooseRemediation, prerequisitesOf } from './adaptation.ts';
export { summariseSkills } from './summary.ts';
