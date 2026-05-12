import * as Automerge from "@automerge/automerge";

type LocalFirstDoc = { html: string };

export interface LocalFirstStorage {
  load(documentId: string): Promise<string | null>;
  save(documentId: string, html: string): Promise<void>;
}

function encode(binary: Uint8Array): string {
  let s = "";
  for (let i = 0; i < binary.length; i++) s += String.fromCharCode(binary[i]);
  return btoa(s);
}

function decode(b64: string): Uint8Array {
  const s = atob(b64);
  const arr = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
  return arr;
}

function canUseBase64(): boolean {
  return typeof btoa === "function" && typeof atob === "function";
}

function serializeHtml(html: string, previous?: string | null): string {
  let doc: Automerge.Doc<LocalFirstDoc>;
  try {
    doc = previous ? Automerge.load<LocalFirstDoc>(decode(previous)) : Automerge.from<LocalFirstDoc>({ html: "" });
  } catch {
    doc = Automerge.from<LocalFirstDoc>({ html: "" });
  }
  const next = Automerge.change(doc, (draft) => {
    draft.html = html;
  });
  return encode(Automerge.save(next));
}

function deserializeHtml(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return Automerge.load<LocalFirstDoc>(decode(raw)).html ?? null;
  } catch {
    return null;
  }
}

function createIndexedDbStorage(): LocalFirstStorage {
  const databaseName = "loom-editor";
  const storeName = "local-first-documents";

  async function openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === "undefined" || !canUseBase64()) return null;

    return await new Promise((resolve) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
  }

  async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>
  ): Promise<T | null> {
    const db = await openDb();
    if (!db) return null;
    try {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const result = await run(store);
      await new Promise<void>((resolve) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => resolve();
        transaction.onerror = () => resolve();
      });
      return result;
    } finally {
      db.close();
    }
  }

  return {
    async load(documentId) {
      const raw = await withStore("readonly", async (store) => {
        return await new Promise<string | null>((resolve) => {
          const request = store.get(documentId);
          request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
          request.onerror = () => resolve(null);
        });
      });
      return deserializeHtml(raw ?? null);
    },
    async save(documentId, html) {
      await withStore("readwrite", async (store) => {
        const existing = await new Promise<string | null>((resolve) => {
          const getRequest = store.get(documentId);
          getRequest.onsuccess = () => resolve(typeof getRequest.result === "string" ? getRequest.result : null);
          getRequest.onerror = () => resolve(null);
        });
        const next = serializeHtml(html, existing);
        await new Promise<void>((resolve) => {
          const putRequest = store.put(next, documentId);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => resolve();
        });
      });
    },
  };
}

function createLocalStorageStorage(): LocalFirstStorage {
  const namespace = "loom-editor:am";

  function key(documentId: string): string {
    return `${namespace}:${documentId}`;
  }

  return {
    async load(documentId) {
      if (typeof localStorage === "undefined" || !canUseBase64()) return null;
      return deserializeHtml(localStorage.getItem(key(documentId)));
    },
    async save(documentId, html) {
      if (typeof localStorage === "undefined" || !canUseBase64()) return;
      try {
        const storageKey = key(documentId);
        const next = serializeHtml(html, localStorage.getItem(storageKey));
        localStorage.setItem(storageKey, next);
      } catch {
      }
    },
  };
}

export function createAutoStorage(): LocalFirstStorage {
  let delegate: LocalFirstStorage | null = null;

  function getDelegate(): LocalFirstStorage {
    if (!delegate) {
      delegate =
        typeof indexedDB !== "undefined" && canUseBase64()
          ? createIndexedDbStorage()
          : createLocalStorageStorage();
    }
    return delegate;
  }

  return {
    async load(documentId) {
      if (typeof window === "undefined") return null;
      return getDelegate().load(documentId);
    },
    async save(documentId, html) {
      if (typeof window === "undefined") return;
      await getDelegate().save(documentId, html);
    },
  };
}
