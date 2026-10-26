import { roundTo } from "@/lib/utils";

export function fuelForTime(burnPerHour: number, hours: number) {
  return roundTo(burnPerHour * hours, 0);
}

export function enduranceHours(fuelOnBoard: number, burnPerHour: number) {
  if (burnPerHour <= 0) return 0;
  return roundTo(fuelOnBoard / burnPerHour, 1);
}

export function reserveFuel(burnPerHour: number, reserveMinutes: number) {
  return roundTo(burnPerHour * (reserveMinutes / 60), 0);
}
