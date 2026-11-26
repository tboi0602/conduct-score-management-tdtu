import type { AttendanceFailureCategory, AttendanceFailureDraft } from "@/types/attendance-failure";

const DATABASE_NAME = "tdtu-attendance";
const ATTEMPT_STORE = "attendance-attempts";
const LEGACY_STORE = "failure-drafts";
const INCIDENT_STORE = "incident-logs";
const DATABASE_VERSION = 3;

export function failureCategoryForRejection(reason: string | null): AttendanceFailureCategory {
  if (reason === "SESSION_CLOSED") return "SESSION_EXPIRED";
  if (reason?.startsWith("LOCATION") || reason === "OUTSIDE_GEOFENCE") return "LOCATION_ERROR";
  return "OTHER";
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ATTEMPT_STORE)) {
        db.createObjectStore(ATTEMPT_STORE, { keyPath: "clientAttemptId" });
      }
      if (db.objectStoreNames.contains(INCIDENT_STORE)) db.deleteObjectStore(INCIDENT_STORE);
      if (db.objectStoreNames.contains(LEGACY_STORE)) db.deleteObjectStore(LEGACY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local database"));
  });
}

async function request<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const operation = action(transaction.objectStore(storeName));
    operation.onsuccess = () => resolve(operation.result);
    operation.onerror = () =>
      reject(operation.error ?? new Error("Local database operation failed"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Local database transaction failed"));
    };
  });
}

export function qrRetryExpiry(token: string): string | undefined {
  const slot = Number(token.split(".")[1]);
  if (!Number.isInteger(slot)) return undefined;
  return new Date((slot + 1) * 5 * 60 * 1000 + 30_000).toISOString();
}

export const attendanceFailureStore = {
  put: (draft: AttendanceFailureDraft) =>
    request(ATTEMPT_STORE, "readwrite", (store) => store.put(draft)),
  remove: (id: string) => request(ATTEMPT_STORE, "readwrite", (store) => store.delete(id)),
  listForUser: async (userId: string) => {
    const items = await request<AttendanceFailureDraft[]>(ATTEMPT_STORE, "readonly", (store) =>
      store.getAll(),
    );
    return items.filter((item) => item.userId === userId);
  },
  cleanup: async () => {
    const now = Date.now();
    const items = await request<AttendanceFailureDraft[]>(ATTEMPT_STORE, "readonly", (store) =>
      store.getAll(),
    );
    await Promise.all(
      items
        .filter((item) => now > new Date(item.eventEnd).getTime() + 7 * 86_400_000)
        .map((item) =>
          request(ATTEMPT_STORE, "readwrite", (store) => store.delete(item.clientAttemptId)),
        ),
    );
  },
};
