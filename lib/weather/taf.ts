export type TafPeriod = {
  kind: "BASE" | "FM" | "TEMPO" | "BECMG" | "PROB";
  raw: string;
  probability: number | null;
  from: string | null;
  to: string | null;
  body: string;
  explanation: string;
};

export type TafDecoded = {
  raw: string;
  station: string | null;
  issued: string | null;
  valid: { from: string | null; to: string | null; raw: string | null };
  periods: TafPeriod[];
  groups: Array<{ raw: string; meaning: string }>;
};

export function decodeTaf(rawInput: string): TafDecoded {
  const raw = rawInput.replace(/\s+/g, " ").trim();
  const groups: TafDecoded["groups"] = [];
  const tokens = raw.split(" ").filter(Boolean);
  let i = 0;
  if (tokens[i] === "TAF") {
    groups.push({ raw: "TAF", meaning: "Terminal Aerodrome Forecast" });
    i += 1;
  }
  if (tokens[i] === "AMD" || tokens[i] === "COR") {
    groups.push({ raw: tokens[i], meaning: tokens[i] === "AMD" ? "Amended forecast" : "Corrected forecast" });
    i += 1;
  }
  let station: string | null = null;
  if (tokens[i] && /^[A-Z]{4}$/.test(tokens[i])) {
    station = tokens[i];
    groups.push({ raw: tokens[i], meaning: `Aerodrome ${tokens[i]}` });
    i += 1;
  }
  let issued: string | null = null;
  if (tokens[i] && /^\d{6}Z$/.test(tokens[i])) {
    issued = tokens[i];
    groups.push({ raw: tokens[i], meaning: `Forecast issued day ${tokens[i].slice(0, 2)} at ${tokens[i].slice(2, 4)}:${tokens[i].slice(4, 6)} UTC` });
    i += 1;
  }
  let validRaw: string | null = null;
  let validFrom: string | null = null;
  let validTo: string | null = null;
  if (tokens[i] && /^\d{4}\/\d{4}$/.test(tokens[i])) {
    validRaw = tokens[i];
    const [a, b] = tokens[i].split("/");
    validFrom = a;
    validTo = b;
    groups.push({ raw: tokens[i], meaning: `Valid from day ${a.slice(0, 2)} ${a.slice(2)}Z until day ${b.slice(0, 2)} ${b.slice(2)}Z` });
    i += 1;
  }

  const rest = tokens.slice(i);
  const joined = rest.join(" ");
  const chunks = joined.split(/(?=\b(?:TEMPO|BECMG|FM\d{6}|PROB\d{2}))/);
  const periods: TafPeriod[] = [];
  chunks.forEach((chunk, idx) => {
    const text = chunk.trim();
    if (!text) return;
    if (text.startsWith("TEMPO")) {
      periods.push({
        kind: "TEMPO",
        raw: text,
        probability: null,
        from: null,
        to: null,
        body: text.replace(/^TEMPO\s*/, ""),
        explanation: "Temporary fluctuations expected for periods of less than one hour; total less than half the period.",
      });
      groups.push({ raw: text, meaning: "TEMPO: temporary conditions" });
    } else if (text.startsWith("BECMG")) {
      periods.push({
        kind: "BECMG",
        raw: text,
        probability: null,
        from: null,
        to: null,
        body: text.replace(/^BECMG\s*/, ""),
        explanation: "Becoming: a lasting change expected to develop during the given period.",
      });
      groups.push({ raw: text, meaning: "BECMG: becoming / lasting change" });
    } else if (/^FM\d{6}/.test(text)) {
      const fm = text.match(/^FM(\d{6})/);
      periods.push({
        kind: "FM",
        raw: text,
        probability: null,
        from: fm?.[1] ?? null,
        to: null,
        body: text.replace(/^FM\d{6}\s*/, ""),
        explanation: `From ${fm?.[1]?.slice(0, 2)} ${fm?.[1]?.slice(2, 4)}:${fm?.[1]?.slice(4)}Z — previous conditions are superseded.`,
      });
      groups.push({ raw: text, meaning: "FM: from-time change, replaces previous forecast" });
    } else if (/^PROB\d{2}/.test(text)) {
      const p = Number(text.slice(4, 6));
      periods.push({
        kind: "PROB",
        raw: text,
        probability: p,
        from: null,
        to: null,
        body: text.replace(/^PROB\d{2}\s*/, ""),
        explanation: `${p}% probability of the described conditions (commonly PROB30 or PROB40).`,
      });
      groups.push({ raw: text, meaning: `Probability ${p}%` });
    } else {
      periods.push({
        kind: "BASE",
        raw: text,
        probability: null,
        from: validFrom,
        to: validTo,
        body: text,
        explanation: idx === 0 ? "Baseline forecast conditions for the validity period." : "Forecast group",
      });
      groups.push({ raw: text, meaning: "Baseline TAF conditions" });
    }
  });

  return {
    raw,
    station,
    issued,
    valid: { from: validFrom, to: validTo, raw: validRaw },
    periods,
    groups,
  };
}
