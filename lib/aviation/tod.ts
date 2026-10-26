import { roundTo } from "@/lib/utils";

export type TodInput = {
  currentAltitudeFt: number;
  targetAltitudeFt: number;
  distanceNm: number;
  descentRateFpm: number;
  groundspeedKt: number;
  approachAltitudeFt?: number;
};

export type TodResult = {
  altitudeToLoseFt: number;
  todDistanceNm: number;
  requiredFpm: number;
  descentTimeMin: number;
  threeToOneNm: number;
  remainingAfterTodNm: number;
  canMakeRestriction: boolean;
  assumptions: string[];
};

export function calculateTod(input: TodInput): TodResult {
  const current = input.currentAltitudeFt;
  const target = input.approachAltitudeFt ?? input.targetAltitudeFt;
  const lose = Math.max(0, current - target);
  const gs = Math.max(1, input.groundspeedKt);
  const vs = Math.max(1, Math.abs(input.descentRateFpm));
  const todNm = (lose / 1000) * 3;
  const timeMin = lose / vs;
  const distAtVs = (gs / 60) * timeMin;
  const requiredFpm = input.distanceNm > 0 ? lose / (input.distanceNm / (gs / 60)) : vs;
  return {
    altitudeToLoseFt: roundTo(lose, 0),
    todDistanceNm: roundTo(todNm, 1),
    requiredFpm: roundTo(requiredFpm, 0),
    descentTimeMin: roundTo(timeMin, 1),
    threeToOneNm: roundTo(todNm, 1),
    remainingAfterTodNm: roundTo(input.distanceNm - todNm, 1),
    canMakeRestriction: distAtVs <= input.distanceNm + 0.5,
    assumptions: [
      "3:1 rule approximates 3 NM per 1,000 ft at a 3° path.",
      "Groundspeed is assumed constant during descent.",
      "Wind, speed restrictions, and level-offs are not modelled unless entered as a lower target altitude.",
      "Educational / flight-simulation planning aid only.",
    ],
  };
}

export function descentAngleDeg(altitudeFt: number, distanceNm: number): number {
  if (distanceNm <= 0) return 0;
  const ftPerNm = altitudeFt / distanceNm;
  const ratio = ftPerNm / 6076.12;
  return roundTo((Math.atan(ratio) * 180) / Math.PI, 1);
}

export function vsForAngle(groundspeedKt: number, angleDeg: number): number {
  const fpm = groundspeedKt * Math.tan((angleDeg * Math.PI) / 180) * 101.3;
  return roundTo(fpm, 0);
}
