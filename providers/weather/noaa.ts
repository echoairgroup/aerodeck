import { cacheGetOrSet } from "@/lib/cache";
import { fetchText, ProviderError } from "@/lib/http";
import type { WeatherObservation, WeatherProvider } from "@/providers/types";

const BASE = process.env.NOAA_AWC_BASE ?? "https://aviationweather.gov/api/data";
const TTL = 5 * 60 * 1000;

async function pull(kind: "metar" | "taf", icao: string): Promise<WeatherObservation> {
  const id = icao.trim().toUpperCase();
  return cacheGetOrSet(`noaa:${kind}:${id}`, TTL, async () => {
    const url = `${BASE}/${kind}?ids=${encodeURIComponent(id)}&format=raw`;
    const { status, body } = await fetchText(url);
    if (status === 204 || !body.trim()) {
      throw new ProviderError(`No ${kind.toUpperCase()} available for ${id}`, "not_found", 404);
    }
    if (status >= 400) {
      throw new ProviderError("Weather data could not be retrieved.", "upstream_error", status, body.slice(0, 200));
    }
    const raw = body.trim();
    return {
      icao: id,
      raw: kind === "metar" ? raw : null,
      tafRaw: kind === "taf" ? raw : null,
      retrievedAt: new Date().toISOString(),
      source: "NOAA Aviation Weather Center",
      sourceUrl: "https://aviationweather.gov/",
    };
  });
}

export const noaaWeatherProvider: WeatherProvider = {
  id: "noaa-awc",
  getMetar: (icao) => pull("metar", icao),
  getTaf: (icao) => pull("taf", icao),
};
