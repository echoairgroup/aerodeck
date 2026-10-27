import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://newsky.app/api/airline-api";

export async function GET(request: NextRequest) {
  const apiKey = process.env.NEWSKY_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      configured: false,
      error: "NewSky is not connected yet. Add NEWSKY_API_KEY to the hosting environment."
    }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const view = params.get("view") || "ongoing";
  let url = "";
  let method: "GET" | "POST" = "GET";
  let body: string | undefined;

  if (view === "ongoing") {
    url = API_BASE + "/flights/ongoing";
  } else if (view === "recent") {
    url = API_BASE + "/flights/recent";
    method = "POST";
    body = JSON.stringify({ skip: 0, count: 50, includeDeleted: false });
  } else if (view === "flight") {
    const id = params.get("id")?.trim() || "";
    if (!/^[a-zA-Z0-9_-]{1,120}$/.test(id)) {
      return NextResponse.json({ configured: true, error: "A valid NewSky flight ID is required." }, { status: 400 });
    }
    url = API_BASE + "/flight/" + encodeURIComponent(id);
  } else {
    return NextResponse.json({ configured: true, error: "Unsupported NewSky view." }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + apiKey,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = response.status === 401 || response.status === 403
        ? "NewSky rejected the API key or its permissions. Check the key and the flights scope in Airline Management."
        : response.status === 429
          ? "NewSky rate limit reached. Wait before refreshing again."
          : "NewSky API request failed (" + response.status + ").";
      return NextResponse.json({ configured: true, error: message, upstreamStatus: response.status }, {
        status: response.status === 429 ? 429 : 502,
        headers: { "Cache-Control": "no-store" }
      });
    }

    const data = await response.json();
    return NextResponse.json({ configured: true, view, ...(
      data && typeof data === "object" && !Array.isArray(data) ? data : { results: data }
    ) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ configured: true, error: "Could not reach the NewSky API. Try again later." }, { status: 502 });
  }
}
