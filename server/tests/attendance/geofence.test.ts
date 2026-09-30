import { describe, expect, it } from "vitest";

import {
  distanceMeters,
  isInsideAttendanceRadius,
} from "../../src/modules/attendance/services/geofence.service";
import { validateCoordinates } from "../../src/modules/attendance/services/attendance-session.service";

describe("attendance geofence", () => {
  it("calculates zero distance for identical coordinates", () => {
    expect(distanceMeters(10.7326, 106.6998, 10.7326, 106.6998)).toBe(0);
  });

  it("accepts the inclusive radius plus reported accuracy boundary", () => {
    expect(isInsideAttendanceRadius(130, 100, 30)).toBe(true);
    expect(isInsideAttendanceRadius(130.01, 100, 30)).toBe(false);
  });

  it("calculates a realistic short TDTU campus distance", () => {
    const distance = distanceMeters(10.7326, 106.6998, 10.7335, 106.6998);
    expect(distance).toBeGreaterThan(95);
    expect(distance).toBeLessThan(105);
  });

  it.each([
    { latitude: 91, longitude: 106, accuracyMeters: 10 },
    { latitude: 10, longitude: 181, accuracyMeters: 10 },
    { latitude: 10, longitude: 106, accuracyMeters: 0 },
    { latitude: Number.NaN, longitude: 106, accuracyMeters: 10 },
  ])("rejects invalid coordinates: $latitude/$longitude/$accuracyMeters", (coordinates) => {
    expect(() => validateCoordinates(coordinates)).toThrow("Invalid device coordinates");
  });
});
