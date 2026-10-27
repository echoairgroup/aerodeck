import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

type AirportRow = Record<string, string>;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 100).toLowerCase() || "";
  if (query.length < 2) return NextResponse.json({ items: [] });

  try {
    const response = await fetch("https://ourairports.com/data/airports.csv", {
      headers: { Accept: "text/csv" },
      next: { revalidate: 86400 },
    });
    if (!response.ok) return NextResponse.json({ error: "The airport data source is unavailable.", items: [] }, { status: 502 });

    const csv = await response.text();
    const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, relax_quotes: true }) as AirportRow[];
    const matches = rows
      .filter((row) => row.type !== "closed")
      .filter((row) => [
        row.gps_code, row.ident, row.iata_code, row.name, row.municipality, row.iso_country, row.iso_region
      ].join(" ").toLowerCase().includes(query))
      .map((row) => {
        const gps = String(row.gps_code || "").toUpperCase();
        const ident = String(row.ident || "").toUpperCase();
        const icao = /^[A-Z0-9]{4}$/.test(gps) ? gps : /^[A-Z0-9]{4}$/.test(ident) ? ident : ident;
        const elevation = row.elevation_ft === undefined || row.elevation_ft === "" ? null : Number(row.elevation_ft);
        return {
          icao,
          iata: String(row.iata_code || "").toUpperCase(),
          name: row.name || "Unnamed airport",
          city: row.municipality || "",
          country: row.iso_country || "",
          elev: Number.isFinite(elevation) ? elevation : null,
          type: row.type || "airport",
          runways: [] as string[],
          source: "OurAirports",
        };
      })
      .sort((a, b) => {
        const rank = (item: typeof matches[number]) => {
          if (item.icao.toLowerCase() === query) return 0;
          if (item.iata.toLowerCase() === query) return 1;
          if (item.name.toLowerCase().startsWith(query)) return 2;
          if (item.city.toLowerCase().startsWith(query)) return 3;
          if (item.type === "large_airport") return 4;
          if (item.type === "medium_airport") return 5;
          return 6;
        };
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      })
      .slice(0, 50);

    return NextResponse.json({ items: matches, source: "OurAirports" }, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=3600" }
    });
  } catch {
    return NextResponse.json({ error: "Could not search the airport data source.", items: [] }, { status: 502 });
  }
}
