const EARTH_RADIUS_METERS = 6_371_000;

const radians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const latitudeDelta = radians(bLat - aLat);
  const longitudeDelta = radians(bLng - aLng);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function isInsideAttendanceRadius(
  distance: number,
  radiusMeters: number,
  accuracyMeters: number,
): boolean {
  return distance <= radiusMeters + accuracyMeters;
}
