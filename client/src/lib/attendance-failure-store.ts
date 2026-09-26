import type { AttendanceFailureCategory, AttendanceFailureDraft } from "@/types/attendance-failure";

const DATABASE_NAME = "tdtu-attendance";
const STORE_NAME = "failure-drafts";
const DATABASE_VERSION = 1;

export function failureCategoryForRejection(reason: string | null): AttendanceFailureCategory {
  if (reason === "SESSION_CLOSED") return "SESSION_EXPIRED";
  if (reason?.startsWith("LOCATION") || reason === "OUTSIDE_GEOFENCE") {
    return "LOCATION_ERROR";
  }
  return "OTHER";
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "clientAttemptId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local database"));
  });
}

async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const request = action(tx.objectStore(STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Local database operation failed"));
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Local database transaction failed"));
    };
  });
}

export const attendanceFailureStore = {
  put: (draft: AttendanceFailureDraft) => transaction("readwrite", (store) => store.put(draft)),
  remove: (clientAttemptId: string) =>
    transaction("readwrite", (store) => store.delete(clientAttemptId)),
  listForUser: async (userId: string) => {
    const items = await transaction<AttendanceFailureDraft[]>("readonly", (store) =>
      store.getAll(),
    );
    return items.filter((item) => item.userId === userId);
  },
};
