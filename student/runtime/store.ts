// Tamper-resistant local attempt log.
//
// Events are append-only and form an HMAC hash chain (each event's `hash` covers its own
// fields plus the previous event's `hash`), and each record is encrypted at rest with
// AES-GCM. Editing, deleting, or reordering a stored event breaks the chain and is caught
// on the next read.
//
// Honest limit: a local-only app has no server to hold the key, so the integrity/encryption
// secret ships in the bundle. A determined user with devtools can rebuild the chain. This
// deters casual tampering and keeps the personalization record trustworthy — it is NOT exam
// security. (The mr-md answer key is in the page anyway.)

import type { EvidenceEvent } from '../../shared/schema/index.ts';

const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = globalThis.crypto.subtle;

const toB64 = (bytes: Uint8Array): string =>
  typeof Buffer !== 'undefined'
    ? Buffer.from(bytes).toString('base64')
    : btoa(String.fromCharCode(...bytes));
const fromB64 = (b64: string): Uint8Array<ArrayBuffer> => {
  const binary = typeof Buffer !== 'undefined'
    ? Buffer.from(b64, 'base64')
    : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const out = new Uint8Array(binary.length); // fresh ArrayBuffer-backed view (BufferSource)
  out.set(binary);
  return out;
};
const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function derive(secret: string, label: string, algo: 'HMAC' | 'AES'): Promise<CryptoKey> {
  const seed = await subtle.digest('SHA-256', enc.encode(`${label}:${secret}`));
  return algo === 'HMAC'
    ? subtle.importKey('raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : subtle.importKey('raw', seed, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** Fields of an event that the hash commits to, in a fixed order, as canonical JSON. */
function canonical(e: Omit<EvidenceEvent, 'hash'>): string {
  return JSON.stringify([
    e.eventId, e.chapterId, e.chapterRevision, e.quizId, e.questionIndex, e.skillId,
    e.selectedOption, e.correct, e.attemptNumber, e.independent, e.occurredAt, e.prevHash,
  ]);
}

/** Ordered, encrypted records. A backend never sees plaintext events. */
export interface StorageBackend {
  getAll(): Promise<string[]>;
  append(record: string): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory backend for tests and memory-only fallbacks. */
export function memoryBackend(seed: string[] = []): StorageBackend {
  const records = [...seed];
  return {
    async getAll() { return [...records]; },
    async append(r) { records.push(r); },
    async clear() { records.length = 0; },
  };
}

export interface AppendInput {
  quizId: string;
  questionIndex: number;
  skillId: string | null;
  selectedOption: number;
  correct: boolean;
}

export interface EventStore {
  append(input: AppendInput): Promise<EvidenceEvent>;
  list(): Promise<EvidenceEvent[]>;
  verify(): Promise<{ ok: true } | { ok: false; brokenAt: number; reason: string }>;
}

export class ChainIntegrityError extends Error {
  brokenAt: number;
  constructor(brokenAt: number, reason: string) {
    super(`Attempt log integrity check failed at event ${brokenAt}: ${reason}`);
    this.name = 'ChainIntegrityError';
    this.brokenAt = brokenAt;
  }
}

export async function openEventStore(opts: {
  backend: StorageBackend;
  secret: string;
  chapterId: string;
  chapterRevision: string;
  now?: () => string;
  idFactory?: () => string;
}): Promise<EventStore> {
  const { backend, secret, chapterId, chapterRevision } = opts;
  const now = opts.now ?? (() => new Date().toISOString());
  const idFactory = opts.idFactory ?? (() => globalThis.crypto.randomUUID());
  const hmacKey = await derive(secret, 'hmac', 'HMAC');
  const aesKey = await derive(secret, 'aes', 'AES');

  async function hash(e: Omit<EvidenceEvent, 'hash'>): Promise<string> {
    const sig = await subtle.sign('HMAC', hmacKey, enc.encode(canonical(e)));
    return toHex(new Uint8Array(sig));
  }

  async function encrypt(event: EvidenceEvent): Promise<string> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, enc.encode(JSON.stringify(event)));
    return `${toB64(iv)}:${toB64(new Uint8Array(ct))}`;
  }

  async function decrypt(record: string, index: number): Promise<EvidenceEvent> {
    const [ivB64, ctB64] = record.split(':');
    if (!ivB64 || !ctB64) throw new ChainIntegrityError(index, 'record is malformed');
    try {
      const pt = await subtle.decrypt(
        { name: 'AES-GCM', iv: fromB64(ivB64) }, aesKey, fromB64(ctB64),
      );
      return JSON.parse(dec.decode(pt)) as EvidenceEvent;
    } catch {
      throw new ChainIntegrityError(index, 'record could not be decrypted');
    }
  }

  // Read + verify the whole chain. `strict` throws on the first break; otherwise returns
  // the events decrypted so far alongside the problem.
  async function read(strict: boolean): Promise<{
    events: EvidenceEvent[];
    problem?: { brokenAt: number; reason: string };
  }> {
    const records = await backend.getAll();
    const events: EvidenceEvent[] = [];
    let prevHash = '';
    for (let i = 0; i < records.length; i++) {
      let event: EvidenceEvent;
      try {
        event = await decrypt(records[i], i);
      } catch (err) {
        if (strict) throw err;
        const reason = err instanceof ChainIntegrityError ? err.message.split(': ').at(-1)! : 'unreadable record';
        return { events, problem: { brokenAt: i, reason } };
      }
      const expected = await hash({ ...event });
      const reason =
        event.prevHash !== prevHash ? 'previous-hash mismatch (reordered or deleted event)'
        : event.hash !== expected ? 'event hash mismatch (edited event)'
        : null;
      if (reason) {
        if (strict) throw new ChainIntegrityError(i, reason);
        return { events, problem: { brokenAt: i, reason } };
      }
      events.push(event);
      prevHash = event.hash;
    }
    return { events };
  }

  async function doAppend(input: AppendInput): Promise<EvidenceEvent> {
    const { events } = await read(true); // refuse to append onto a broken chain
    const prev = events.at(-1);
    const priorForQuestion = events.filter(
      (e) => e.quizId === input.quizId && e.questionIndex === input.questionIndex,
    ).length;
    const base: Omit<EvidenceEvent, 'hash'> = {
      eventId: idFactory(),
      chapterId,
      chapterRevision,
      quizId: input.quizId,
      questionIndex: input.questionIndex,
      skillId: input.skillId,
      selectedOption: input.selectedOption,
      correct: input.correct,
      attemptNumber: priorForQuestion + 1,
      independent: priorForQuestion === 0,
      occurredAt: now(),
      prevHash: prev?.hash ?? '',
    };
    const event: EvidenceEvent = { ...base, hash: await hash(base) };
    await backend.append(await encrypt(event));
    return event;
  }

  // Serialize appends: each read-then-write runs after the previous one resolves, so two
  // quick clicks can't both read the same tail and write a chain-breaking pair.
  let tail: Promise<unknown> = Promise.resolve();

  return {
    append(input) {
      const op = tail.then(() => doAppend(input));
      tail = op.catch(() => {}); // a failed append doesn't wedge the queue
      return op;
    },
    async list() {
      return (await read(true)).events;
    },
    async verify() {
      const { problem } = await read(false);
      return problem ? { ok: false, ...problem } : { ok: true };
    },
  };
}
