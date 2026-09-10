export type EventType = "UNIVERSITY" | "FACULTY" | "CLASS" | "CLUB";
export type CheckInMode = "ONE_WAY" | "TWO_WAY";
export type OrganizingUnitType = EventType;
export type OrganizingUnit = {
  id: string;
  type: OrganizingUnitType;
  code: string;
  name: string | null;
  facultyId: string | null;
  classId: string | null;
  faculty: { id: string; code: string; name: string } | null;
  class: { id: string; code: string; name: string } | null;
  _count: { events: number };
  createdAt: string;
  updatedAt: string;
};
export type OrganizerPayload = { code: string; name: string; facultyId?: string | null };
export type OrganizerFilters = { search?: string; type?: string; facultyId?: string };
export type SemesterType = "HK1" | "HK2" | "HK3";
export type Semester = {
  id: string;
  year: number;
  type: SemesterType;
  createdAt?: string;
  updatedAt?: string;
  _count?: { events: number; conductScores: number };
};
export type SemesterPayload = { year: number; type: SemesterType };
export type SemesterFilters = { year?: string; type?: SemesterType };
export type Criteria = {
  id: string;
  title: string;
  maxPoints: number;
  createdAt: string;
  updatedAt: string;
};
export type CriteriaPayload = Pick<Criteria, "title" | "maxPoints">;
export type CriteriaFilters = { search?: string; minPoints?: string; maxPoints?: string };
export type EventPayload = {
  name: string;
  description: string;
  location: string;
  organizerId: string;
  criteriaId: string;
  semesterId: string;
  timeStart: string;
  timeEnd: string;
  registrationStart: string;
  registrationEnd: string;
  capacity: number | null;
  attendanceRadiusMeters: number;
  points: number;
  checkInMode: CheckInMode;
};
export type ManagedEvent = Omit<EventPayload, "description"> & {
  description?: string;
  descriptionPreview: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  criteria: Pick<Criteria, "id" | "title" | "maxPoints">;
  semester: Semester;
  type: EventType;
  organizer: OrganizingUnit | null;
  registeredCount: number;
};

export type RegistrationStatus = "REGISTERED" | "CANCELLED";
export type ParticipationStatus = "UPCOMING" | "ATTENDED" | "ABSENT" | "CANCELLED";
export type PublicEvent = ManagedEvent & {
  registeredCount: number;
  remainingSlots: number | null;
  registrationOpen: boolean;
  registrationStatus: RegistrationStatus | null;
};
export type EventRegistration = {
  id: string;
  status: RegistrationStatus;
  registeredAt: string;
  cancelledAt: string | null;
  participationStatus: ParticipationStatus;
  student: {
    id: string;
    studentCode: string;
    user: { name: string; email: string };
  };
};
export type MyEventRegistration = Omit<EventRegistration, "student"> & { event: PublicEvent };
export type StudentOption = {
  id: string;
  studentCode: string;
  user: { name: string; email: string };
};
export type EventFilters = {
  search?: string;
  criteriaId?: string;
  semesterId?: string;
  type?: string;
  checkInMode?: string;
  startsFrom?: string;
  startsTo?: string;
  organizerId?: string;
  facultyId?: string;
  status?: EventLifecycleStatus;
};
export type StudentEventFilters = {
  search?: string;
  type?: EventType;
  organizerId?: string;
  criteriaId?: string;
  startsFrom?: string;
  startsTo?: string;
  status?: EventLifecycleStatus;
};

export type EventLifecycleStatus = "UPCOMING" | "ONGOING" | "COMPLETED";
