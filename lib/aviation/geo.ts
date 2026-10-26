import { roundTo } from "@/lib/utils";

const NM_PER_DEG_LAT = 60;
const EARTH_RADIUS_NM = 3440.065;

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function greatCircleDistanceNm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const nm = EARTH_RADIUS_NM * c;
  return nm < 20 ? roundTo(nm, 1) : roundTo(nm, 0);
}

export function initialBearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = toDeg(Math.atan2(y, x));
  return roundTo((θ + 360) % 360, 0);
}

export function reciprocalDeg(heading: number): number {
  return roundTo((heading + 180) % 360, 0);
}

export function nmPerDegreeLon(lat: number): number {
  return NM_PER_DEG_LAT * Math.cos(toRad(lat));
}

export function interpolateGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  steps = 32,
): Array<{ lat: number; lon: number }> {
  const points: Array<{ lat: number; lon: number }> = [];
  const d = greatCircleDistanceNm(lat1, lon1, lat2, lon2) / EARTH_RADIUS_NM;
  if (d === 0) return [{ lat: lat1, lon: lon1 }];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(toRad(lat1)) * Math.cos(toRad(lon1)) + B * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2));
    const y = A * Math.cos(toRad(lat1)) * Math.sin(toRad(lon1)) + B * Math.cos(toRad(lat2)) * Math.sin(toRad(lon2));
    const z = A * Math.sin(toRad(lat1)) + B * Math.sin(toRad(lat2));
    points.push({ lat: toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), lon: toDeg(Math.atan2(y, x)) });
  }
  return points;
}
