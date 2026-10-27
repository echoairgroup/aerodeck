import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("icao")?.trim().toUpperCase();
  if (!raw) return NextResponse.json({ error: "Missing ICAO" }, { status: 400 });
  const ids = raw.split(",").map((x) => x.trim()).filter((x) => /^[A-Z]{4}$/.test(x)).slice(0, 20);
  if (!ids.length) return NextResponse.json({ error: "Invalid ICAO" }, { status: 400 });

  try {
    const response = await fetch(`https://metar.vatsim.net/${ids.join(",")}?format=json`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) return NextResponse.json({ error: "METAR unavailable", items: [] }, { status: 502 });
    const data = await response.json();
    const items = Array.isArray(data)
      ? data
      : Object.entries(data).map(([id, value]) => ({ id, metar: value }));
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ error: "METAR unavailable", items: [] }, { status: 502 });
  }
}
