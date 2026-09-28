import type {
  AttendanceFailureCategory,
  AttendanceFailureDraft,
  AttendanceIncidentPayload,
} from "@/types/attendance-failure";

const DATABASE_NAME = "tdtu-attendance";
const ATTEMPT_STORE = "attendance-attempts";
const LEGACY_STORE = "failure-drafts";
const INCIDENT_STORE = "incident-logs";
const DATABASE_VERSION = 2;

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
      const transaction = request.transaction;
      if (!db.objectStoreNames.contains(ATTEMPT_STORE)) {
        db.createObjectStore(ATTEMPT_STORE, { keyPath: "clientAttemptId" });
      }
      if (!db.objectStoreNames.contains(INCIDENT_STORE)) {
        db.createObjectStore(INCIDENT_STORE, { keyPath: "clientAttemptId" });
      }
      if (transaction && db.objectStoreNames.contains(LEGACY_STORE)) {
        const legacy = transaction.objectStore(LEGACY_STORE);
        const target = transaction.objectStore(ATTEMPT_STORE);
        legacy.openCursor().onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (!cursor) return;
          target.put(cursor.value);
          cursor.continue();
        };
      }
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

function canonical(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === "object") {
      return Object.fromEntries(
        Object.entries(item as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalize(child)]),
      );
    }
    return item;
  };
  return JSON.stringify(normalize(value));
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonical(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function tokenFingerprint(token: string): Promise<string> {
  return sha256(token);
}

export function qrRetryExpiry(token: string): string | undefined {
  const slot = Number(token.split(".")[1]);
  if (!Number.isInteger(slot)) return undefined;
  return new Date((slot + 1) * 5 * 60 * 1000 + 30_000).toISOString();
}

export function incidentPayload(draft: AttendanceFailureDraft): AttendanceIncidentPayload {
  return {
    clientAttemptId: draft.clientAttemptId,
    eventId: draft.eventId,
    direction: draft.direction,
    failureCategory: draft.failureCategory,
    failedAt: draft.failedAt,
    latitude: draft.retryPayload?.latitude ?? null,
    longitude: draft.retryPayload?.longitude ?? null,
    accuracyMeters: draft.retryPayload?.accuracyMeters ?? null,
    tokenFingerprint: draft.tokenFingerprint ?? null,
    clientOnline: navigator.onLine,
    userAgent: navigator.userAgent.slice(0, 500),
  };
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
  putIncident: (draft: AttendanceFailureDraft) =>
    request(INCIDENT_STORE, "readwrite", (store) => store.put(draft)),
  cleanup: async () => {
    const cutoff = Date.now() - 30 * 86_400_000;
    for (const storeName of [ATTEMPT_STORE, INCIDENT_STORE]) {
      const items = await request<AttendanceFailureDraft[]>(storeName, "readonly", (store) =>
        store.getAll(),
      );
      await Promise.all(
        items
          .filter((item) => new Date(item.failedAt).getTime() < cutoff)
          .map((item) =>
            request(storeName, "readwrite", (store) => store.delete(item.clientAttemptId)),
          ),
      );
    }
  },
};
