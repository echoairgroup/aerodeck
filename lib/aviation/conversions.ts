import { roundTo } from "@/lib/utils";

export const KT_TO_KMH = 1.852;
export const KT_TO_MPH = 1.15078;
export const FT_TO_M = 0.3048;
export const KG_TO_LB = 2.2046226218;
export const HPA_TO_INHG = 0.02953;
export const NM_TO_KM = 1.852;

export function knotsToKmh(kt: number) {
  return roundTo(kt * KT_TO_KMH, 0);
}
export function kmhToKnots(kmh: number) {
  return roundTo(kmh / KT_TO_KMH, 0);
}
export function knotsToMph(kt: number) {
  return roundTo(kt * KT_TO_MPH, 0);
}
export function feetToMeters(ft: number) {
  return roundTo(ft * FT_TO_M, 0);
}
export function metersToFeet(m: number) {
  return roundTo(m / FT_TO_M, 0);
}
export function kgToLb(kg: number) {
  return roundTo(kg * KG_TO_LB, 0);
}
export function lbToKg(lb: number) {
  return roundTo(lb / KG_TO_LB, 0);
}
export function hpaToInhg(hpa: number) {
  return roundTo(hpa * HPA_TO_INHG, 2);
}
export function inhgToHpa(inhg: number) {
  return roundTo(inhg / HPA_TO_INHG, 0);
}
export function cToF(c: number) {
  return roundTo((c * 9) / 5 + 32, 0);
}
export function fToC(f: number) {
  return roundTo(((f - 32) * 5) / 9, 0);
}
export function cToK(c: number) {
  return roundTo(c + 273.15, 1);
}
export function machToKt(mach: number, oatC = -56.5) {
  const kelvin = oatC + 273.15;
  const kt = mach * 38.967854 * Math.sqrt(kelvin);
  return roundTo(kt, 0);
}

export function tasFromIas(iasKt: number, pressureAltFt: number, oatC: number) {
  const isa = 15 - (2 * pressureAltFt) / 1000;
  const deltaT = oatC - isa;
  const factor = 1 + pressureAltFt / 1000 * 0.02 + deltaT * 0.002;
  return roundTo(iasKt * factor, 0);
}
