export type WeatherObservation = {
  icao: string;
  raw: string | null;
  tafRaw: string | null;
  retrievedAt: string;
  source: string;
  sourceUrl: string;
};

export interface WeatherProvider {
  id: string;
  getMetar(icao: string): Promise<WeatherObservation>;
  getTaf(icao: string): Promise<WeatherObservation>;
}

export type LivePilot = {
  cid: number;
  name: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitude: number;
  heading: number;
  groundspeed: number;
  aircraft: string | null;
  departure: string | null;
  destination: string | null;
  route: string | null;
  flightRules: string | null;
  server: string | null;
  transponder: string | null;
  logon: string | null;
};

export type LiveController = {
  cid: number;
  name: string;
  callsign: string;
  frequency: string;
  facility: number;
  visualRange: number;
  textAtis: string[] | null;
  logon: string | null;
};

export type TrafficSnapshot = {
  retrievedAt: string;
  source: string;
  sourceUrl: string;
  generated: string | null;
  pilots: LivePilot[];
  controllers: LiveController[];
  atis: LiveController[];
};

export interface TrafficProvider {
  id: string;
  getSnapshot(): Promise<TrafficSnapshot>;
}

export type NetworkEvent = {
  id: number;
  name: string;
  type: string | null;
  link: string | null;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  airports: string[];
  routes: Array<{ departure: string; arrival: string; route: string }>;
  organisers: string[];
};

export interface EventsProvider {
  id: string;
  listUpcoming(): Promise<{ retrievedAt: string; source: string; sourceUrl: string; events: NetworkEvent[] }>;
}

export interface AirportDataProvider {
  id: string;
  search(query: string): Promise<unknown[]>;
}
