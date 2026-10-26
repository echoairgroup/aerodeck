import { roundTo } from "@/lib/utils";

export type WindComponents = {
  headwindKt: number;
  tailwindKt: number;
  crosswindKt: number;
  crosswindFrom: "left" | "right" | "none";
  windAngleDeg: number;
  runwayHeadingDeg: number;
};

function smallestAngle(a: number, b: number): number {
  let d = ((a - b + 540) % 360) - 180;
  return d;
}

export function windComponents(
  runwayHeadingDeg: number,
  windDirectionDeg: number,
  windSpeedKt: number,
): WindComponents {
  const angle = smallestAngle(windDirectionDeg, runwayHeadingDeg);
  const rad = (angle * Math.PI) / 180;
  const head = windSpeedKt * Math.cos(rad);
  const cross = windSpeedKt * Math.sin(rad);
  const headRounded = roundTo(head, 0);
  const crossRounded = roundTo(cross, 0);
  return {
    headwindKt: Math.max(0, headRounded),
    tailwindKt: Math.max(0, -headRounded),
    crosswindKt: Math.abs(crossRounded),
    crosswindFrom: crossRounded === 0 ? "none" : crossRounded > 0 ? "right" : "left",
    windAngleDeg: roundTo(Math.abs(angle), 0),
    runwayHeadingDeg: roundTo(runwayHeadingDeg, 0),
  };
}

export function windCorrectionAngleDeg(windDirDeg: number, windKt: number, tasKt: number, courseDeg: number): number {
  if (tasKt <= 0) return 0;
  const angle = ((windDirDeg - courseDeg + 540) % 360) - 180;
  const rad = (angle * Math.PI) / 180;
  const ratio = (windKt / tasKt) * Math.sin(rad);
  const clamped = Math.max(-1, Math.min(1, ratio));
  return roundTo((Math.asin(clamped) * 180) / Math.PI, 0);
}
