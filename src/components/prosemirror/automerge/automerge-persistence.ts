import * as Automerge from "@automerge/automerge";

type RteDoc = { html: string };

const NS = "rave-rte:am";

function key(documentId: string): string {
  return `${NS}:${documentId}`;
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

export function loadHtml(documentId: string): string | null {
  try {
    const raw = localStorage.getItem(key(documentId));
    if (!raw) return null;
    const doc = Automerge.load<RteDoc>(decode(raw));
    return doc.html ?? null;
  } catch {
    return null;
  }
}

export function saveHtml(documentId: string, html: string): void {
  try {
    const k = key(documentId);
    const raw = localStorage.getItem(k);
    let doc: Automerge.Doc<RteDoc>;
    try {
      doc = raw ? Automerge.load<RteDoc>(decode(raw)) : Automerge.from<RteDoc>({ html: "" });
    } catch {
      doc = Automerge.from<RteDoc>({ html: "" });
    }
    const next = Automerge.change(doc, (d) => { d.html = html; });
    localStorage.setItem(k, encode(Automerge.save(next)));
  } catch {
    // localStorage unavailable (quota / private mode) — silently skip
  }
}
