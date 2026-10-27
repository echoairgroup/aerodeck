import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://my.vatsim.net/api/v2/events/latest", {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) return NextResponse.json({ error: "Events unavailable", data: [] }, { status: 502 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return NextResponse.json({ error: "Events unavailable", data: [] }, { status: 502 });
  }
}
