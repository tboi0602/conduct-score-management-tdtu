import { HttpError } from "@/services/http";
import type { CriteriaPayload, EventPayload, Semester } from "@/types/events";
import type { adminMessages } from "@/i18n/admin-messages";

type Messages = (typeof adminMessages)["vi"];
type ValidationKey =
  | "invalidFields"
  | "invalidPoints"
  | "invalidTime"
  | "invalidRegistrationTime"
  | "registrationEndsAfterEventStarts"
  | "missingReference"
  | "invalidRange";
export class FormValidationError extends Error {
  constructor(public readonly key: ValidationKey) {
    super(key);
  }
}

export function managementError(error: unknown, t: Messages, fallback: string): string {
  if (error instanceof FormValidationError) return t[error.key];
  if (error instanceof HttpError) {
    if (error.status === 401) return t.sessionExpired;
    if (error.status === 403) return t.accessDenied;
    if (error.status === 404) return t.resourceMissing;
    if (error.status === 409)
      return error.message.includes("Criteria is used") ? t.criteriaInUse : t.referenceMissing;
    if (error.status === 400)
      return error.message.includes("offset") ? t.offsetHint : t.invalidFields;
  }
  return fallback;
}

function requiredText(form: FormData, key: string): string {
  const value = String(form.get(key) ?? "").trim();
  if (!value || value.length > 255) throw new FormValidationError("invalidFields");
  return value;
}

function pointsInput(form: FormData, key: string): number {
  const raw = String(form.get(key) ?? "");
  const value = Number(raw);
  if (!raw.trim() || !Number.isInteger(value) || value < 0 || value > 2147483647)
    throw new FormValidationError("invalidPoints");
  return value;
}

export function criteriaPayload(form: FormData): CriteriaPayload {
  const maxPoints = pointsInput(form, "maxPoints");
  const defaultPoints = pointsInput(form, "defaultPoints");
  if (defaultPoints > maxPoints) throw new FormValidationError("invalidPoints");
  return { title: requiredText(form, "title"), maxPoints, defaultPoints };
}

export function eventPayload(form: FormData): EventPayload {
  const criteriaId = String(form.get("criteriaId") ?? "");
  const semesterId = String(form.get("semesterId") ?? "");
  const organizerId = String(form.get("organizerId") ?? "");
  if (!criteriaId || !semesterId || !organizerId) throw new FormValidationError("missingReference");
  const start = new Date(String(form.get("timeStart") ?? ""));
  const end = new Date(String(form.get("timeEnd") ?? ""));
  const registrationStart = new Date(String(form.get("registrationStart") ?? ""));
  const registrationEnd = new Date(String(form.get("registrationEnd") ?? ""));
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
    throw new FormValidationError("invalidTime");
  if (
    !Number.isFinite(registrationStart.getTime()) ||
    !Number.isFinite(registrationEnd.getTime()) ||
    registrationStart >= registrationEnd
  )
    throw new FormValidationError("invalidRegistrationTime");
  if (registrationEnd > start) throw new FormValidationError("registrationEndsAfterEventStarts");
  const capacityRaw = String(form.get("capacity") ?? "").trim();
  const capacity = capacityRaw === "" ? null : Number(capacityRaw);
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 2147483647))
    throw new FormValidationError("invalidFields");
  const checkInMode = form.get("checkInMode");
  if (checkInMode !== "ONE_WAY" && checkInMode !== "TWO_WAY")
    throw new FormValidationError("invalidFields");
  const deliveryMode = form.get("deliveryMode");
  if (deliveryMode !== "OFFLINE" && deliveryMode !== "ONLINE")
    throw new FormValidationError("invalidFields");
  if (deliveryMode === "OFFLINE" && start.toLocaleDateString() !== end.toLocaleDateString())
    throw new FormValidationError("invalidTime");
  return {
    name: requiredText(form, "name"),
    description: String(form.get("description") ?? ""),
    images: form
      .getAll("images")
      .map(String)
      .filter((url) => Boolean(url && url.trim())),
    location: requiredText(form, "location"),
    organizerId,
    criteriaId,
    semesterId,
    timeStart: start.toISOString(),
    timeEnd: end.toISOString(),
    registrationStart: registrationStart.toISOString(),
    registrationEnd: registrationEnd.toISOString(),
    capacity,
    attendanceRadiusMeters: pointsInput(form, "attendanceRadiusMeters"),
    points: pointsInput(form, "points"),
    checkInMode,
    deliveryMode,
  };
}

export function organizerLabel(unit: import("@/types/events").OrganizingUnit): string {
  if (unit.name && unit.name.trim()) return unit.name;
  if (unit.type === "FACULTY") return unit.faculty?.name ?? unit.code;
  if (unit.type === "CLASS")
    return unit.class ? `${unit.class.code} — ${unit.class.name}` : unit.code;
  return unit.code;
}

export function organizerFacultyName(unit?: import("@/types/events").OrganizingUnit | null): string | null {
  if (!unit || unit.type === "FACULTY" || !unit.faculty?.name) return null;
  // If unit name is identical or already contains faculty name, do not duplicate
  const unitLabel = organizerLabel(unit).trim().toLowerCase();
  const facultyName = unit.faculty.name.trim().toLowerCase();
  if (unitLabel === facultyName) return null;
  return unit.faculty.name;
}

export function localDateTime(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

export function semesterLabel(semester: Semester, t: Messages): string {
  return `${t[semester.type]} · ${semester.year}`;
}

export function formatDate(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale === "vi" ? "vi-VN" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
