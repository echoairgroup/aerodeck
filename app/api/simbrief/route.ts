import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username")?.trim();
  const userid = request.nextUrl.searchParams.get("userid")?.trim();
  if (!username && !userid) return NextResponse.json({ error: "Missing SimBrief username or Pilot ID" }, { status: 400 });

  const params = new URLSearchParams();
  if (username) params.set("username", username);
  if (userid) params.set("userid", userid);
  params.set("client", "AeroDeck-1.0");
  params.set("json", "v2");

  try {
    const response = await fetch("https://www.simbrief.com/api/xml.fetcher.php?" + params.toString(), { cache: "no-store" });
    const text = await response.text();
    if (!response.ok) return NextResponse.json({ error: "SimBrief rejected the request", detail: text.slice(0, 500) }, { status: 502 });
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: "SimBrief returned non-JSON data", detail: text.slice(0, 500) }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach SimBrief" }, { status: 502 });
  }
}
