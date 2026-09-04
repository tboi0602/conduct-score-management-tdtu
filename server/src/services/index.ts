export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  className: string;
  faculty: string;
  status: string;
  baseScore: number;
  currentScore: number;
}

export interface Event {
  id: string;
  code: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  startAt: string;
  endAt: string;
  status: string;
}

export interface AttendanceLog {
  id: string;
  eventId: string;
  studentId: string;
  status: string;
  scanCode: string;
  lat: number;
  lng: number;
  gpsVerified: boolean;
}