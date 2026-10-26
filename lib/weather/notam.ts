export type DecodedNotam = {
  raw: string;
  series: string | null;
  number: string | null;
  fir: string | null;
  icao: string | null;
  qCode: string | null;
  category: string | null;
  start: string | null;
  end: string | null;
  schedule: string | null;
  text: string | null;
  explanation: string;
  groups: Array<{ raw: string; meaning: string }>;
};

const QMAP: Record<string, string> = {
  PA: "Approach lighting",
  PL: "Runway lighting",
  PM: "Threshold lighting",
  PN: "Taxiway lighting",
  MR: "Runway",
  MX: "Taxiway",
  MT: "Threshold",
  GA: "ILS",
  GW: "MLS",
  IN: "ILS localizer",
  ID: "DME",
  NV: "VOR",
  NN: "NDB",
  FA: "Aerodrome",
  AA: "ATS airspace",
  CA: "Instrument approach procedure",
};

export function decodeNotam(rawInput: string): DecodedNotam {
  const raw = rawInput.replace(/\r\n/g, "\n").trim();
  const groups: DecodedNotam["groups"] = [];
  const header = raw.match(/([A-Z])(\d{4}\/\d{2})/);
  const q = raw.match(/Q\)\s*([A-Z0-9/]+)/);
  const a = raw.match(/A\)\s*([A-Z]{4}(?:\s+[A-Z]{4})*)/);
  const b = raw.match(/B\)\s*([0-9A-Z]+)/);
  const c = raw.match(/C\)\s*([0-9A-Z]+)/);
  const d = raw.match(/D\)\s*([^\n]+)/);
  const e = raw.match(/E\)\s*([\s\S]+?)(?:\n[F-G]\)|$)/);

  const qParts = q?.[1]?.split("/") ?? [];
  const fir = qParts[0] ?? null;
  const qCode = qParts[1] ?? null;
  const subject = qCode ? QMAP[qCode.slice(0, 2)] ?? "Other / see text" : null;

  if (header) groups.push({ raw: header[0], meaning: `NOTAM identifier ${header[0]}` });
  if (q) groups.push({ raw: q[0], meaning: `Qualifier line (FIR ${fir ?? "?"}, Q-code ${qCode ?? "?"})` });
  if (a) groups.push({ raw: a[0], meaning: `Location ${a[1]}` });
  if (b) groups.push({ raw: b[0], meaning: `Start of activity ${b[1]} (YYMMDDHHMM, UTC)` });
  if (c) groups.push({ raw: c[0], meaning: `End of activity ${c[1]} (or PERM/EST)` });
  if (d) groups.push({ raw: d[0], meaning: `Schedule ${d[1]}` });
  if (e) groups.push({ raw: "E) …", meaning: "Plain-language ICAO NOTAM text" });

  return {
    raw,
    series: header?.[1] ?? null,
    number: header?.[0] ?? null,
    fir,
    icao: a?.[1]?.split(/\s+/)[0] ?? null,
    qCode,
    category: subject,
    start: b?.[1] ?? null,
    end: c?.[1] ?? null,
    schedule: d?.[1]?.trim() ?? null,
    text: e?.[1]?.trim() ?? null,
    explanation:
      "ICAO NOTAM decode is structural. Operational meaning must be confirmed against the issuing AIS. Simulation/education only.",
    groups,
  };
}

export function categorizeNotam(decoded: DecodedNotam): string {
  const blob = `${decoded.qCode ?? ""} ${decoded.text ?? ""} ${decoded.category ?? ""}`.toUpperCase();
  if (blob.includes("RWY") || decoded.qCode?.startsWith("M")) return "runway";
  if (blob.includes("TWY") || decoded.qCode?.startsWith("MX")) return "taxiway";
  if (["GA", "GW", "IN", "ID", "NV", "NN"].some((c) => decoded.qCode?.startsWith(c))) return "navigation";
  if (decoded.qCode?.startsWith("P")) return "lighting";
  if (decoded.qCode?.startsWith("A")) return "fir";
  if (decoded.icao) return "airport";
  return "operational";
}
