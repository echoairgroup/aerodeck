import { cacheGetOrSet } from "@/lib/cache";
import { fetchText, ProviderError } from "@/lib/http";
import type { WeatherObservation, WeatherProvider } from "@/providers/types";

const TTL = 5 * 60 * 1000;

export const vatsimMetarProvider: WeatherProvider = {
  id: "vatsim-metar",
  async getMetar(icao: string): Promise<WeatherObservation> {
    const id = icao.trim().toUpperCase();
    return cacheGetOrSet(`vatsim-metar:${id}`, TTL, async () => {
      const url = `https://metar.vatsim.net/metar.php?id=${encodeURIComponent(id)}`;
      const { status, body } = await fetchText(url);
      if (status >= 400 || !body.trim()) {
        throw new ProviderError("VATSIM METAR is unavailable for this station.", "not_found", 404, body.slice(0, 200));
      }
      return {
        icao: id,
        raw: body.trim(),
        tafRaw: null,
        retrievedAt: new Date().toISOString(),
        source: "VATSIM METAR API",
        sourceUrl: "https://metar.vatsim.net/",
      };
    });
  },
  async getTaf(): Promise<WeatherObservation> {
    throw new ProviderError("VATSIM does not publish TAFs on the public METAR endpoint.", "unsupported", 501);
  },
};
