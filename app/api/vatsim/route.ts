import { NextResponse } from "next/server";

export const revalidate = 15;

export async function GET() {
  try {
    const response = await fetch("https://data.vatsim.net/v3/vatsim-data.json", {
      headers: { Accept: "application/json" },
      next: { revalidate: 15 },
    });
    if (!response.ok) return NextResponse.json({ error: "VATSIM unavailable" }, { status: 502 });
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
  } catch {
    return NextResponse.json({ error: "VATSIM unavailable" }, { status: 502 });
  }
}
