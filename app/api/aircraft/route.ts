import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

type AircraftRow = string[];

type AircraftResult = {
  name: string;
  iata: string;
  icao: string;
  source: "OpenFlights";
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100).toLowerCase() || "";

  try {
    const response = await fetch("https://raw.githubusercontent.com/jpatokal/openflights/master/data/planes.dat", {
      headers: { Accept: "text/plain" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) {
      return NextResponse.json({ error: "The aircraft reference data source is unavailable.", items: [] }, { status: 502 });
    }

    const text = await response.text();
    const rows = parse(text, { columns: false, skip_empty_lines: true, bom: true, relax_quotes: true }) as AircraftRow[];
    const all: AircraftResult[] = rows.map((row): AircraftResult => ({
      name: String(row[0] || "").trim(),
      iata: String(row[1] || "").trim() === "\\N" ? "" : String(row[1] || "").trim().toUpperCase(),
      icao: String(row[2] || "").trim() === "\\N" ? "" : String(row[2] || "").trim().toUpperCase(),
      source: "OpenFlights",
    })).filter((item) => item.name.length > 0);

    const matches = all.filter((item) =>
      [item.name, item.iata, item.icao].join(" ").toLowerCase().includes(query)
    ).sort((a, b) => {
      const rank = (item: AircraftResult) => {
        if (query && item.icao.toLowerCase() === query) return 0;
        if (query && item.iata.toLowerCase() === query) return 1;
        if (query && item.name.toLowerCase().startsWith(query)) return 2;
        return 3;
      };
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    }).slice(0, 200);

    return NextResponse.json({
      items: matches,
      source: "OpenFlights",
      sourceUrl: "https://openflights.org/data",
      licence: "Open Database License (ODbL)",
      datasetCount: all.length,
      note: "This is a curated aircraft-type reference, not a complete aircraft registry. It contains only fields supplied by the source."
    }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "Could not search the aircraft reference data source.", items: [] }, { status: 502 });
  }
}
