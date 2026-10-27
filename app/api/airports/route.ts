import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

type AirportRow = Record<string, string>;
type AirportResult = {
  icao: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  elev: number | null;
  type: string;
  runways: string[];
  source: string;
  sourceId: string;
};

function relevance(item: AirportResult, query: string): number {
  if (item.icao.toLowerCase() === query) return 0;
  if (item.iata.toLowerCase() === query) return 1;
  if (item.name.toLowerCase().startsWith(query)) return 2;
  if (item.city.toLowerCase().startsWith(query)) return 3;
  if (item.type === "large_airport") return 4;
  if (item.type === "medium_airport") return 5;
  return 6;
}

function validField(value: string | undefined): string {
  const field = String(value || "").trim();
  return field && field !== "\\N" ? field : "";
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100).toLowerCase() || "";
  if (query.length < 2) return NextResponse.json({ items: [] });

  try {
    const [airportResponse, runwayResponse] = await Promise.all([
      fetch("https://ourairports.com/data/airports.csv", {
        headers: { Accept: "text/csv" },
        next: { revalidate: 86400 },
      }),
      fetch("https://ourairports.com/data/runways.csv", {
        headers: { Accept: "text/csv" },
        next: { revalidate: 86400 },
      }).catch(() => null),
    ]);

    if (!airportResponse.ok) {
      return NextResponse.json({ error: "The airport data source is unavailable.", items: [] }, { status: 502 });
    }

    const csv = await airportResponse.text();
    const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, relax_quotes: true }) as AirportRow[];
    const matches: AirportResult[] = rows
      .filter((row) => row.type !== "closed")
      .filter((row) => [
        row.gps_code, row.ident, row.iata_code, row.name, row.municipality, row.iso_country, row.iso_region
      ].join(" ").toLowerCase().includes(query))
      .map((row): AirportResult => {
        const gps = String(row.gps_code || "").toUpperCase();
        const ident = String(row.ident || "").toUpperCase();
        const parsedElevation = row.elevation_ft === undefined || row.elevation_ft === ""
          ? null
          : Number(row.elevation_ft);
        const elevation = parsedElevation !== null && Number.isFinite(parsedElevation) ? parsedElevation : null;
        return {
          icao: /^[A-Z0-9]{4}$/.test(gps) ? gps : ident,
          iata: String(row.iata_code || "").toUpperCase(),
          name: row.name || "Unnamed airport",
          city: row.municipality || "",
          country: row.iso_country || "",
          elev: elevation,
          type: row.type || "airport",
          runways: [],
          source: "OurAirports",
          sourceId: String(row.id || ""),
        };
      })
      .sort((a, b) => relevance(a, query) - relevance(b, query) || a.name.localeCompare(b.name))
      .slice(0, 50);

    if (runwayResponse?.ok && matches.length) {
      const runwayCsv = await runwayResponse.text();
      const runwayRows = parse(runwayCsv, { columns: true, skip_empty_lines: true, bom: true, relax_quotes: true }) as AirportRow[];
      const wantedIds = new Set(matches.map((item) => item.sourceId));
      const byAirport = new Map<string, string[]>();

      for (const row of runwayRows) {
        const airportId = String(row.airport_ref || "");
        if (!wantedIds.has(airportId) || row.closed === "1") continue;
        const low = validField(row.le_ident);
        const high = validField(row.he_ident);
        const designation = [low, high].filter(Boolean).join("/");
        const length = validField(row.length_ft);
        const width = validField(row.width_ft);
        const surface = validField(row.surface);
        const details = [
          designation || "Runway designation unavailable",
          length ? length + " × " + (width || "—") + " ft" : "",
          surface ? surface.toLowerCase() : "",
        ].filter(Boolean).join(" · ");
        const list = byAirport.get(airportId) || [];
        if (list.length < 16) list.push(details);
        byAirport.set(airportId, list);
      }

      for (const item of matches) item.runways = byAirport.get(item.sourceId) || [];
    }

    return NextResponse.json({
      items: matches.map(({ sourceId: _sourceId, ...item }) => item),
      source: "OurAirports",
      runwayDataAvailable: Boolean(runwayResponse?.ok)
    }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=3600" }
    });
  } catch {
    return NextResponse.json({ error: "Could not search the airport data source.", items: [] }, { status: 502 });
  }
}
