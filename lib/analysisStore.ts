// IndexedDB store for saved after-visit analyses.
// Each record keeps the full parsed result AND the original file as a Blob
// so users can download the source document later.

const DB_NAME = "seagull_db";
const DB_VERSION = 1;
const STORE = "analyses";

export interface AnalysisRecord {
  id: string;
  filename: string;
  fileType: string;
  fileBlob: Blob;
  analyzedAt: string;  // ISO string
  visitDate: string;
  provider: string;
  result: object;      // AnalysisResult — typed loosely to avoid circular dep
}

export type AnalysisMeta = Omit<AnalysisRecord, "fileBlob" | "result"> & {
  result: object;
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAnalysis(record: AnalysisRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listAnalyses(): Promise<AnalysisMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as AnalysisRecord[]).map(
        ({ fileBlob: _fb, ...rest }) => rest
      );
      resolve(all.sort((a, b) => b.analyzedAt.localeCompare(a.analyzedAt)));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAnalysis(id: string): Promise<AnalysisRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
