// Student runtime entry. The build injects `window.__SE01__` (chapter metadata, the quizzes
// with skill tags, the skill graph, and the integrity/encryption secret) and this script.
// Everything here runs offline in the browser.

import { openEventStore, memoryBackend, type EventStore } from './store.ts';
import { indexedDbBackend } from './idb.ts';
import { wireRuntime, type RuntimeConfig } from './dom.ts';

export interface InjectedConfig extends RuntimeConfig {
  /** Integrity + encryption secret, baked into the bundle at build time. */
  secret: string;
}

export async function bootstrap(config: InjectedConfig): Promise<EventStore> {
  let backend;
  try {
    backend = 'indexedDB' in globalThis ? indexedDbBackend(`se01:${config.chapterId}`) : memoryBackend();
  } catch {
    backend = memoryBackend(); // private mode / blocked storage
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
