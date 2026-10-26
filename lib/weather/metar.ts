export type CloudCover = "FEW" | "SCT" | "BKN" | "OVC" | "NSC" | "NCD" | "CLR" | "SKC" | "VV";

export type MetarCloud = {
  cover: CloudCover;
  heightFt: number | null;
  cb: boolean;
  tcu: boolean;
  raw: string;
  explanation: string;
};

export type MetarDecoded = {
  raw: string;
  station: string | null;
  time: { day: number; hour: number; minute: number; raw: string } | null;
  wind: {
    directionDeg: number | null;
    variable: boolean;
    speedKt: number | null;
    gustKt: number | null;
    vrbFrom: number | null;
    vrbTo: number | null;
    unit: "KT" | "MPS" | "KMH" | null;
    raw: string;
    explanation: string;
  } | null;
  visibility: { meters: number | null; cavok: boolean; raw: string; explanation: string } | null;
  rvr: Array<{ raw: string; explanation: string }>;
  weather: Array<{ raw: string; explanation: string }>;
  clouds: MetarCloud[];
  temperatureC: number | null;
  dewpointC: number | null;
  qnhHpa: number | null;
  altimeterInhg: number | null;
  nosig: boolean;
  remarks: string | null;
  groups: Array<{ raw: string; meaning: string }>;
  ceilingFt: number | null;
};

const WX: Record<string, string> = {
  RA: "rain",
  DZ: "drizzle",
  SN: "snow",
  SG: "snow grains",
  IC: "ice crystals",
  PL: "ice pellets",
  GR: "hail",
  GS: "small hail / snow pellets",
  UP: "unknown precipitation",
  BR: "mist",
  FG: "fog",
  FU: "smoke",
  VA: "volcanic ash",
  DU: "dust",
  SA: "sand",
  HZ: "haze",
  PY: "spray",
  PO: "dust/sand whirls",
  SQ: "squalls",
  FC: "funnel cloud",
  SS: "sandstorm",
  DS: "duststorm",
  TS: "thunderstorm",
  SH: "showers",
  FZ: "freezing",
  MI: "shallow",
  BC: "patches",
  PR: "partial",
  DR: "low drifting",
  BL: "blowing",
  VC: "in the vicinity",
};

function wxExplain(code: string): string {
  let rest = code;
  let intensity = "";
  if (rest.startsWith("+")) {
    intensity = "heavy ";
    rest = rest.slice(1);
  } else if (rest.startsWith("-")) {
    intensity = "light ";
    rest = rest.slice(1);
  }
  const parts: string[] = [];
  while (rest.length >= 2) {
    const token = rest.slice(0, 2);
    parts.push(WX[token] ?? token);
    rest = rest.slice(2);
  }
  return `${intensity}${parts.join(" ")}`.trim();
}

function parseTemp(token: string): number {
  if (token.startsWith("M")) return -Number(token.slice(1));
  return Number(token);
}

export function decodeMetar(rawInput: string): MetarDecoded {
  const raw = rawInput.replace(/\s+/g, " ").trim();
  const tokens = raw.split(" ").filter(Boolean);
  const groups: MetarDecoded["groups"] = [];
  const result: MetarDecoded = {
    raw,
    station: null,
    time: null,
    wind: null,
    visibility: null,
    rvr: [],
    weather: [],
    clouds: [],
    temperatureC: null,
    dewpointC: null,
    qnhHpa: null,
    altimeterInhg: null,
    nosig: false,
    remarks: null,
    groups,
    ceilingFt: null,
  };

  let i = 0;
  if (tokens[i] === "METAR" || tokens[i] === "SPECI") {
    groups.push({ raw: tokens[i], meaning: tokens[i] === "SPECI" ? "Special selected observation" : "Routine METAR observation" });
    i += 1;
  }
  if (tokens[i] && /^[A-Z]{4}$/.test(tokens[i])) {
    result.station = tokens[i];
    groups.push({ raw: tokens[i], meaning: `ICAO station identifier ${tokens[i]}` });
    i += 1;
  }
  if (tokens[i] && /^\d{6}Z$/.test(tokens[i])) {
    const t = tokens[i];
    result.time = { day: Number(t.slice(0, 2)), hour: Number(t.slice(2, 4)), minute: Number(t.slice(4, 6)), raw: t };
    groups.push({ raw: t, meaning: `Observation time: day ${result.time.day} at ${t.slice(2, 4)}:${t.slice(4, 6)} UTC` });
    i += 1;
  }
  if (tokens[i] === "AUTO" || tokens[i] === "COR") {
    groups.push({ raw: tokens[i], meaning: tokens[i] === "AUTO" ? "Fully automated observation" : "Corrected observation" });
    i += 1;
  }

  if (tokens[i] && /^(VRB|\d{3})\d{2,3}(G\d{2,3})?(KT|MPS|KMH)$/.test(tokens[i])) {
    const w = tokens[i];
    const unit = (w.match(/(KT|MPS|KMH)$/)?.[1] ?? "KT") as "KT" | "MPS" | "KMH";
    const variable = w.startsWith("VRB");
    const dir = variable ? null : Number(w.slice(0, 3));
    const rest = w.replace(/^(VRB|\d{3})/, "").replace(/(KT|MPS|KMH)$/, "");
    const [spd, gust] = rest.split("G");
    result.wind = {
      directionDeg: dir,
      variable,
      speedKt: unit === "KT" ? Number(spd) : unit === "MPS" ? Math.round(Number(spd) * 1.94384) : Math.round(Number(spd) / 1.852),
      gustKt: gust ? (unit === "KT" ? Number(gust) : Number(gust)) : null,
      vrbFrom: null,
      vrbTo: null,
      unit,
      raw: w,
      explanation: variable
        ? `Variable wind at ${spd} ${unit.toLowerCase()}`
        : `Wind from ${dir}° at ${spd} ${unit.toLowerCase()}${gust ? `, gusting ${gust}` : ""}`,
    };
    groups.push({ raw: w, meaning: result.wind.explanation });
    i += 1;
  }
  if (tokens[i] && /^\d{3}V\d{3}$/.test(tokens[i]) && result.wind) {
    const [from, to] = tokens[i].split("V").map(Number);
    result.wind.vrbFrom = from;
    result.wind.vrbTo = to;
    groups.push({ raw: tokens[i], meaning: `Wind direction variable between ${from}° and ${to}°` });
    i += 1;
  }

  if (tokens[i] === "CAVOK") {
    result.visibility = {
      meters: 10000,
      cavok: true,
      raw: "CAVOK",
      explanation: "Ceiling and visibility OK: visibility 10 km or more, no cloud below 5,000 ft (or MSA if higher), no significant weather",
    };
    groups.push({ raw: "CAVOK", meaning: result.visibility.explanation });
    i += 1;
  } else if (tokens[i] && /^(\d{4}|\d+SM)$/.test(tokens[i])) {
    const vis = tokens[i];
    if (vis.endsWith("SM")) {
      const sm = Number(vis.replace("SM", ""));
      const meters = Math.round(sm * 1609.34);
      result.visibility = { meters, cavok: false, raw: vis, explanation: `Visibility ${sm} statute miles` };
    } else {
      const meters = Number(vis);
      result.visibility = {
        meters,
        cavok: false,
        raw: vis,
        explanation: meters === 9999 ? "Visibility 10 km or more" : `Visibility ${meters} m`,
      };
    }
    groups.push({ raw: vis, meaning: result.visibility.explanation });
    i += 1;
  }

  while (tokens[i] && /^R\d{2}/.test(tokens[i])) {
    result.rvr.push({ raw: tokens[i], explanation: `Runway visual range group ${tokens[i]}` });
    groups.push({ raw: tokens[i], meaning: `Runway visual range ${tokens[i]}` });
    i += 1;
  }

  while (tokens[i] && /^(\+|-)?(VC)?([A-Z]{2}){1,3}$/.test(tokens[i]) && !/^(FEW|SCT|BKN|OVC|NSC|NCD|CLR|SKC|VV|RMK|NOSIG|TEMPO|BECMG|QNH)/.test(tokens[i])) {
    const code = tokens[i];
    if (/^[A-Z]{4}$/.test(code) && !WX[code.slice(0, 2)]) break;
    const explanation = wxExplain(code);
    result.weather.push({ raw: code, explanation });
    groups.push({ raw: code, meaning: `Significant weather: ${explanation}` });
    i += 1;
  }

  while (tokens[i] && /^(FEW|SCT|BKN|OVC|VV|NSC|NCD|CLR|SKC)/.test(tokens[i])) {
    const c = tokens[i];
    if (c === "NSC" || c === "NCD" || c === "CLR" || c === "SKC") {
      result.clouds.push({ cover: c as CloudCover, heightFt: null, cb: false, tcu: false, raw: c, explanation: "No significant cloud / clear" });
      groups.push({ raw: c, meaning: "No significant cloud or sky clear" });
      i += 1;
      continue;
    }
    const cover = c.slice(0, c.startsWith("VV") ? 2 : 3) as CloudCover;
    const heightToken = c.replace(/^(FEW|SCT|BKN|OVC|VV)/, "").replace(/(CB|TCU)$/, "");
    const heightFt = heightToken ? Number(heightToken) * 100 : null;
    const cb = c.endsWith("CB");
    const tcu = c.endsWith("TCU");
    const label =
      cover === "FEW"
        ? "Few"
        : cover === "SCT"
          ? "Scattered"
          : cover === "BKN"
            ? "Broken"
            : cover === "OVC"
              ? "Overcast"
              : cover === "VV"
                ? "Vertical visibility"
                : cover;
    const explanation = `${label}${heightFt != null ? ` at ${heightFt.toLocaleString()} ft` : ""}${cb ? " cumulonimbus" : ""}${tcu ? " towering cumulus" : ""}`;
    result.clouds.push({ cover, heightFt, cb, tcu, raw: c, explanation });
    groups.push({ raw: c, meaning: explanation });
    i += 1;
  }

  if (tokens[i] && /^(M?\d{2})\/(M?\d{2})$/.test(tokens[i])) {
    const [t, d] = tokens[i].split("/");
    result.temperatureC = parseTemp(t);
    result.dewpointC = parseTemp(d);
    groups.push({
      raw: tokens[i],
      meaning: `Temperature ${result.temperatureC}°C, dew point ${result.dewpointC}°C`,
    });
    i += 1;
  }

  if (tokens[i] && /^Q\d{4}$/.test(tokens[i])) {
    result.qnhHpa = Number(tokens[i].slice(1));
    groups.push({ raw: tokens[i], meaning: `QNH ${result.qnhHpa} hPa (altimeter setting, altitude above mean sea level)` });
    i += 1;
  }
  if (tokens[i] && /^A\d{4}$/.test(tokens[i])) {
    result.altimeterInhg = Number(tokens[i].slice(1)) / 100;
    groups.push({ raw: tokens[i], meaning: `Altimeter ${result.altimeterInhg.toFixed(2)} inHg` });
    i += 1;
  }

  if (tokens[i] === "NOSIG") {
    result.nosig = true;
    groups.push({ raw: "NOSIG", meaning: "No significant change expected in the next 2 hours (trend)" });
    i += 1;
  }

  const rmk = tokens.indexOf("RMK", i);
  if (rmk >= 0) {
    result.remarks = tokens.slice(rmk + 1).join(" ");
    groups.push({ raw: tokens.slice(rmk).join(" "), meaning: "Remarks (station-specific, not globally standardised)" });
  } else if (i < tokens.length) {
    const leftover = tokens.slice(i).join(" ");
    if (leftover) groups.push({ raw: leftover, meaning: "Additional groups not fully decoded" });
  }

  const ceiling = result.clouds.find((c) => c.cover === "BKN" || c.cover === "OVC" || c.cover === "VV");
  result.ceilingFt = ceiling?.heightFt ?? null;
  return result;
}
