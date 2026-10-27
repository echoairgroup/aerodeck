'use client';

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const RouteLeaflet = dynamic(() => import("./RouteLeaflet").then((module) => module.RouteLeaflet), {
  ssr: false,
  loading: () => <div className="notice">Loading route map…</div>,
});

type FavoriteItem = { kind: "airport" | "aircraft"; code: string; label?: string };

type Flight = {
  id: string;
  callsign: string;
  aircraft: string;
  from: string;
  to: string;
  duration: string;
  landing: string;
  date: string;
  notes: string;
  route?: string;
  source?: "manual" | "simbrief" | "newsky";
  status?: "planned" | "active" | "logged";
  flightNumber?: string;
  cruiseAltitude?: string;
  blockFuel?: string;
  ofpJson?: unknown;
};

const DEFAULT_PROFILE = { name: "Christian", callsign: "", home: "", sim: "MSFS 2024" };

function cleanProfile(value: any) {
  const profile = { ...DEFAULT_PROFILE, ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}) };
  if (profile.callsign === "ECV412") { profile.callsign = ""; if (profile.home === "EDDL") profile.home = ""; }
  return profile;
}

function cleanFlights(value: any): Flight[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((flight) => flight && typeof flight === "object" && flight.id !== "seed" && flight.from !== "EDDL" && flight.to !== "LGSM" && flight.notes !== "Greek Islands Discovery")
    .map((flight) => {
      const existingStatus = flight.status;
      const status = existingStatus === "planned" || existingStatus === "active" || existingStatus === "logged"
        ? existingStatus
        : (String(flight.duration || "").match(/^\d{1,3}:\d{2}$/) && String(flight.landing || "").trim() ? "logged" : "planned");
      return { ...flight, status } as Flight;
    });
}

function cleanFavorites(value: any): FavoriteItem[] {
  if (!Array.isArray(value)) return [];
  const legacyDefaults = ["EHAM", "EDDL", "LGSM", "A21N"];
  if (value.length === legacyDefaults.length && legacyDefaults.every((item, index) => value[index] === legacyDefaults[index])) return [];
  return value.map((item) => {
    if (typeof item === "string") {
      const code = item.trim().toUpperCase();
      if (!code) return null;
      const kind = aircraft.some((entry) => entry.icao === code) ? "aircraft" : "airport";
      return { kind, code } as FavoriteItem;
    }
    if (item && typeof item === "object" && (item.kind === "airport" || item.kind === "aircraft") && typeof item.code === "string") {
      return { kind: item.kind, code: item.code.toUpperCase(), ...(typeof item.label === "string" ? { label: item.label } : {}) } as FavoriteItem;
    }
    return null;
  }).filter((item): item is FavoriteItem => item !== null);
}

function displayValue(...values: any[]): string {
  const value = values.find((candidate) => candidate !== undefined && candidate !== null && String(candidate).trim() !== "");
  return value === undefined ? "—" : String(value);
}

function navlogEntries(data: any): any[] {
  const raw = data?.navlog?.fix ?? data?.navlog?.fixes ?? data?.navlog;
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") return Object.values(raw).filter((item: any) => item && typeof item === "object");
  return [];
}

function routeCoordinates(data: any) {
  const coordinate = (item: any, label: string) => {
    if (!item) return null;
    const lat = Number(item.pos_lat ?? item.lat ?? item.latitude ?? item.pos?.lat ?? item.position?.lat ?? item.position?.latitude ?? item.location?.lat ?? item.location?.latitude);
    const lon = Number(item.pos_long ?? item.lon ?? item.long ?? item.longitude ?? item.pos?.lon ?? item.pos?.long ?? item.position?.lon ?? item.position?.long ?? item.position?.longitude ?? item.location?.lon ?? item.location?.long ?? item.location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { label, lat, lon };
  };
  const fixes = navlogEntries(data).map((item: any, index: number) =>
    coordinate(item, displayValue(item.ident, item.name, item.fix, "Waypoint " + (index + 1)))
  ).filter(Boolean);
  const originObject = data?.origin?.pos ?? data?.origin ?? data?.departure?.pos ?? data?.departure ?? data?.departureAirport ?? data?.departure_airport;
  const destinationObject = data?.destination?.pos ?? data?.destination ?? data?.arrival?.pos ?? data?.arrival ?? data?.arrivalAirport ?? data?.arrival_airport;
  const origin = coordinate(originObject, displayValue(data?.origin?.icao, data?.departure?.icao, data?.departureIcao, data?.params?.orig, "Origin"));
  const destination = coordinate(destinationObject, displayValue(data?.destination?.icao, data?.arrival?.icao, data?.destinationIcao, data?.params?.dest, "Destination"));
  return [origin, ...fixes, destination].filter(Boolean) as { label: string; lat: number; lon: number }[];
}

function RouteMap({ data, sourceName = "SimBrief" }: { data: any; sourceName?: string }) {
  const points = routeCoordinates(data);
  if (points.length < 3) {
    return <div className="notice">{sourceName} did not supply enough route waypoints with coordinates. AeroDeck will not invent a route.</div>;
  }
  return <RouteLeaflet points={points} sourceName={sourceName} />;
}

const nav = [
  ["dashboard", "Dashboard", "⌂"],
  ["flight", "Flight Center", "✈"],
  ["simbrief", "SimBrief", "▣"],
  ["newsky", "NewSky", "↗"],
  ["airports", "Airports", "⌖"],
  ["aircraft", "Aircraft", "◫"],
  ["weather", "Weather", "◌"],
  ["vatsim", "VATSIM", "◎"],
  ["training", "Training", "◆"],
  ["knowledge", "Knowledge", "?"],
  ["calculators", "Calculators", "∑"],
  ["logbook", "Logbook", "▤"],
  ["favorites", "Favorites", "★"],
  ["settings", "Settings", "⚙"],
] as const;

const airports = [
  { icao: "EHAM", iata: "AMS", name: "Amsterdam Schiphol", city: "Amsterdam", country: "Netherlands", elev: 11, runways: ["18R/36L", "18C/36C", "18L/36R", "06/24", "09/27"] },
  { icao: "EDDL", iata: "DUS", name: "Düsseldorf Airport", city: "Düsseldorf", country: "Germany", elev: 147, runways: ["05R/23L", "05L/23R"] },
  { icao: "LGSM", iata: "SMI", name: "Samos International", city: "Samos", country: "Greece", elev: 19, runways: ["09/27"] },
  { icao: "LGIO", iata: "IOA", name: "Ioannina Airport", city: "Ioannina", country: "Greece", elev: 1558, runways: ["14/32"] },
  { icao: "EGLL", iata: "LHR", name: "London Heathrow", city: "London", country: "United Kingdom", elev: 83, runways: ["09L/27R", "09R/27L"] },
  { icao: "KJFK", iata: "JFK", name: "John F. Kennedy International", city: "New York", country: "United States", elev: 13, runways: ["04L/22R", "04R/22L", "13L/31R", "13R/31L"] },
];

const aircraft = [
  { icao: "A20N", name: "Airbus A320neo", family: "A320neo", range: "3,400 nm", cruise: "M0.78", mtow: "79 t", seats: "150–186", engine: "LEAP-1A / PW1100G" },
  { icao: "A21N", name: "Airbus A321neo", family: "A320neo", range: "4,000 nm", cruise: "M0.78", mtow: "97 t", seats: "180–244", engine: "LEAP-1A / PW1100G" },
  { icao: "A359", name: "Airbus A350-900", family: "A350", range: "8,100 nm", cruise: "M0.85", mtow: "280 t", seats: "300–350", engine: "Trent XWB" },
  { icao: "B738", name: "Boeing 737-800", family: "737 NG", range: "2,935 nm", cruise: "M0.785", mtow: "79 t", seats: "162–189", engine: "CFM56-7B" },
  { icao: "B38M", name: "Boeing 737 MAX 8", family: "737 MAX", range: "3,500 nm", cruise: "M0.79", mtow: "82 t", seats: "162–178", engine: "LEAP-1B" },
  { icao: "E190", name: "Embraer E190", family: "E-Jet", range: "2,450 nm", cruise: "M0.82", mtow: "52 t", seats: "96–114", engine: "CF34" },
];

const terms = [
  ["QNH", "Pressure setting referenced to mean sea level."],
  ["V1", "Takeoff decision speed. Use approved aircraft-specific data in real operations."],
  ["VR", "Rotation speed for takeoff."],
  ["ILS", "Instrument Landing System providing lateral and vertical approach guidance."],
  ["RNAV", "Area navigation that allows aircraft to fly desired paths using navigation capability."],
  ["RNP", "Performance-based navigation with onboard performance monitoring and alerting."],
  ["TOD", "Top of descent: planned point where descent begins."],
  ["RVSM", "Reduced Vertical Separation Minimum airspace in designated flight levels."],
  ["MDA", "Minimum descent altitude for an approach where a DA is not used."],
  ["DA", "Decision altitude for an approach when required visual references are absent."],
];

const lessons = [
  ["Flight Planning", "Build a clean dispatch brief before every flight."],
  ["METAR Basics", "Read wind, visibility, clouds and QNH quickly."],
  ["ILS Approach", "Understand localizer, glideslope and approach minima."],
  ["VATSIM Radio", "Practice concise, correct readbacks."],
  ["Top of Descent", "Plan descent using altitude constraints and groundspeed."],
];

function defaultFlights(): Flight[] { return []; }

export default function AeroDeck({ initialSection = "dashboard" }: { initialSection?: string } = {}) {
  const [section, setSection] = useState(initialSection);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [externalSearchResults, setExternalSearchResults] = useState<any[]>([]);
  const [externalSearchLoading, setExternalSearchLoading] = useState(false);
  const [externalSearchError, setExternalSearchError] = useState("");
  const [flights, setFlights] = useState<Flight[]>(defaultFlights());
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [trainingDone, setTrainingDone] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [db, setDb] = useState("checking");
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aerodeck-state");
      if (raw) {
        const state = JSON.parse(raw);
        if (Array.isArray(state.flights)) setFlights(cleanFlights(state.flights));
        if (state.profile && typeof state.profile === "object" && !Array.isArray(state.profile)) {
          setProfile(cleanProfile(state.profile));
        }
        if (Array.isArray(state.favorites)) setFavorites(cleanFavorites(state.favorites));
        if (Array.isArray(state.training)) setTrainingDone(state.training);
        if (state.notes) setNotes(state.notes);
      }
    } catch {}
    fetch("/api/db/health").then((r) => setDb(r.ok ? "online" : "offline")).catch(() => setDb("offline"));
    fetch("/api/state").then(async (r) => {
      if (!r.ok) throw new Error("cloud unavailable");
      const state = await r.json();
      try {
        const rawProfile = JSON.parse(state.profileJson || "{}");
        const rawFlights = JSON.parse(state.flightsJson || "[]");
        const rawFavorites = JSON.parse(state.favoritesJson || "[]");
        const cloudProfile = cleanProfile(rawProfile);
        const cloudFlights = cleanFlights(rawFlights);
        const cloudFavorites = cleanFavorites(rawFavorites);
        const cloudTraining = JSON.parse(state.trainingJson || "[]");
        const cloudNotes = JSON.parse(state.notesJson || "{}");
        const isUninitialized =
          rawProfile && typeof rawProfile === "object" && !Array.isArray(rawProfile) && Object.keys(rawProfile).length === 0 &&
          cloudFlights.length === 0 && cloudFavorites.length === 0 &&
          cloudNotes && typeof cloudNotes === "object" && !Array.isArray(cloudNotes) && Object.keys(cloudNotes).length === 0 && Array.isArray(cloudTraining) && cloudTraining.length === 0;

        // Empty cloud rows do not wipe local data. Legacy demo values are scrubbed before sync.
        if (!isUninitialized) {
          setProfile(cloudProfile);
          setFlights(cloudFlights);
          setFavorites(cloudFavorites);
          if (Array.isArray(cloudTraining)) setTrainingDone(cloudTraining);
          if (cloudNotes && typeof cloudNotes === "object" && !Array.isArray(cloudNotes)) setNotes(cloudNotes);
        }
        setDb("online");
      } catch {
        setDb("online");
      }
    }).catch(() => {}).finally(() => setCloudLoaded(true));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("aerodeck-state", JSON.stringify({ flights, profile, favorites, notes, training: trainingDone }));
    } catch {}
    if (!cloudLoaded) return;
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flights, profile, favorites, notes, training: trainingDone }),
      }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [flights, profile, favorites, notes, trainingDone, cloudLoaded]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const syncSectionFromUrl = () => {
      const pathSection = window.location.pathname.split("/").filter(Boolean)[0] || "dashboard";
      setSection(nav.some(([id]) => id === pathSection) ? pathSection : "dashboard");
    };
    window.addEventListener("popstate", syncSectionFromUrl);
    return () => window.removeEventListener("popstate", syncSectionFromUrl);
  }, []);

  const go = (id: string) => {
    setSection(id);
    const nextPath = id === "dashboard" ? "/" : "/" + id;
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return terms
      .filter((x) => (x[0] + " " + x[1]).toLowerCase().includes(q))
      .map((x) => ({ type: "Knowledge", title: x[0], meta: x[1] }));
  }, [search]);

  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setExternalSearchResults([]);
      setExternalSearchLoading(false);
      setExternalSearchError("");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setExternalSearchLoading(true);
      setExternalSearchError("");
      try {
        const [airportResponse, aircraftResponse] = await Promise.all([
          fetch("/api/airports?q=" + encodeURIComponent(query), { signal: controller.signal }).then(async (response) => {
            const data = await response.json();
            return response.ok ? data : { items: [], error: data.error };
          }),
          fetch("/api/aircraft?q=" + encodeURIComponent(query), { signal: controller.signal }).then(async (response) => {
            const data = await response.json();
            return response.ok ? data : { items: [], error: data.error };
          })
        ]);
        const airportResults = (Array.isArray(airportResponse.items) ? airportResponse.items : []).map((item:any) => ({
          type: "Airport",
          title: [item.icao, item.iata, item.name].filter(Boolean).join(" · "),
          meta: [item.city, item.country].filter(Boolean).join(", ")
        }));
        const aircraftResults = (Array.isArray(aircraftResponse.items) ? aircraftResponse.items : []).map((item:any) => ({
          type: "Aircraft",
          title: [item.icao, item.iata, item.name].filter(Boolean).join(" · "),
          meta: "OpenFlights reference"
        }));
        setExternalSearchResults([...airportResults, ...aircraftResults]);
        if (!airportResponse.items && !aircraftResponse.items && (airportResponse.error || aircraftResponse.error)) {
          setExternalSearchError("One or more reference sources are unavailable.");
        }
      } catch (error:any) {
        if (!controller.signal.aborted) setExternalSearchError(error.message || "Search sources could not be reached.");
      } finally {
        if (!controller.signal.aborted) setExternalSearchLoading(false);
      }
    }, 250);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [search]);

  const allSearchResults = useMemo(() => {
    const seen = new Set<string>();
    return [...externalSearchResults, ...searchResults].filter((item) => {
      const key = item.type + "|" + item.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 18);
  }, [externalSearchResults, searchResults]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => go("dashboard")}>
          <span className="brand-mark">AD</span>
          <span><b>AeroDeck</b><small>Flight Simulation Command Center</small></span>
        </button>

        <nav className="nav">
          {nav.map(([id, label, icon]) => (
            <button className={"nav-item " + (section === id ? "active" : "")} key={id} onClick={() => go(id)}>
              <i>{icon}</i><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-status">
          <span className="status-dot" />
          <div><b>System</b><small>{db === "online" ? "Neon connected" : db === "offline" ? "Cloud DB not connected" : "Checking cloud DB…"}</small></div>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="crumb">AeroDeck <span>/</span> {String(nav.find((x) => x[0] === section)?.[1] || "Dashboard")}</div>
          <div className="top-right">
            <button className="search-trigger" onClick={() => setSearchOpen(true)}>⌕ <span>Search anything…</span><kbd>Ctrl K</kbd></button>
            <button className="round-button" onClick={() => go("settings")}>⚙</button>
            <button className="profile" onClick={() => go("settings")}><span>{(profile.name || "P").slice(0, 1).toUpperCase()}</span><b>{profile.name || "Pilot profile"}<small>{profile.callsign || "Callsign not set"}</small></b></button>
          </div>
        </header>

        <div className="page-wrap">
          <Router
            section={section}
            flights={flights}
            setFlights={setFlights}
            profile={profile}
            setProfile={setProfile}
            favorites={favorites}
            setFavorites={setFavorites}
            notes={notes}
            setNotes={setNotes}
            trainingDone={trainingDone}
            setTrainingDone={setTrainingDone}
            go={go}
            notify={notify}
          />
        </div>
      </main>

      {searchOpen && (
        <div className="overlay" onMouseDown={() => setSearchOpen(false)}>
          <div className="search-modal" onMouseDown={(e) => e.stopPropagation()}>
            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search airports, aircraft, aviation terms…" />
            {!search && <div className="quick-search">{nav.slice(0, 10).map(([id, label, icon]) => <button key={id} onClick={() => { setSearchOpen(false); go(id); }}><i>{icon}</i>{label}</button>)}</div>}
            {search && <div className="results">{allSearchResults.length ? allSearchResults.map((result, i) => <button key={result.type + result.title + i} onClick={() => { setSearchOpen(false); go(result.type === "Airport" ? "airports" : result.type === "Aircraft" ? "aircraft" : "knowledge"); }}><span>{result.type}</span><b>{result.title}</b><small>{result.meta}</small></button>) : externalSearchLoading ? <div className="empty">Searching live reference data…</div> : externalSearchError ? <div className="empty">{externalSearchError}</div> : <div className="empty">No results found in the available reference data.</div>}</div>}
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Router(props: any) {
  if (props.section === "flight") return <FlightCenter {...props} />;
  if (props.section === "simbrief") return <SimBrief {...props} />;
  if (props.section === "newsky") return <NewSky {...props} />;
  if (props.section === "airports") return <Airports {...props} />;
  if (props.section === "aircraft") return <Aircraft {...props} />;
  if (props.section === "weather") return <Weather />;
  if (props.section === "vatsim") return <Vatsim />;
  if (props.section === "training") return <Training {...props} />;
  if (props.section === "knowledge") return <Knowledge />;
  if (props.section === "calculators") return <Calculators />;
  if (props.section === "logbook") return <Logbook {...props} />;
  if (props.section === "favorites") return <Favorites {...props} />;
  if (props.section === "settings") return <Settings {...props} />;
  return <Dashboard {...props} />;
}

function Header({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc: string; action?: ReactNode }) {
  return <div className="page-header"><div><small>{eyebrow}</small><h1>{title}</h1><p>{desc}</p></div>{action}</div>;
}
function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={"card " + className}>{children}</section>;
}
function Stat({ label, value, accent = false }: { label: string; value: ReactNode; accent?: boolean }) {
  return <div className="stat"><small>{label}</small><b className={accent ? "accent" : ""}>{value}</b></div>;
}
function Field({ label, value, onChange, placeholder = "" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}
function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "live" | "accent" | "neutral" }) {
  return <span className={"badge " + tone}>{children}</span>;
}

function Dashboard({ flights, profile, favorites, go }: any) {
  const [network, setNetwork] = useState<any>(null);
  const [weather, setWeather] = useState<any[]>([]);
  const f = flights.find((flight: Flight) => flight.status !== "logged");
  const loggedFlights = flights.filter((flight: Flight) => flight.status === "logged");
  useEffect(() => {
    fetch("/api/vatsim").then((r) => r.ok ? r.json() : Promise.reject()).then(setNetwork).catch(() => {});
    fetch("/api/metar?icao=EDDL,EHAM,LGSM").then((r) => r.ok ? r.json() : Promise.reject()).then((d) => setWeather(d.items || [])).catch(() => {});
  }, []);
  return <>
    <Header eyebrow="FLIGHT WORKSPACE" title={profile.name ? "Welcome back, " + profile.name : "Your flight workspace"} desc="Your saved plans, live network data and weather—without demo flights or invented flight stats." action={<div className="actions"><button className="btn" onClick={() => go("flight")}>Plan a flight</button><button className="btn primary" onClick={() => go("simbrief")}>Import an OFP</button></div>} />
    <div className="hero-grid">
      {f ? <Card className="hero-card">
        <div className="card-head"><div><small>{f.source === "simbrief" ? "LATEST IMPORTED OFP" : f.source === "newsky" ? "NEWSKY FLIGHT" : "SAVED FLIGHT"}</small><h2>{f.from || "—"} <span>→</span> {f.to || "—"}</h2><p>{[f.callsign, f.aircraft, f.duration, f.notes].filter(Boolean).join(" · ") || "Flight details not provided"}</p></div><Badge tone="accent">{f.source === "simbrief" ? "SIMBRIEF" : f.source === "newsky" ? "NEWSKY" : "SAVED"}</Badge></div>
        <div className="route-strip"><div><b>{f.from || "—"}</b><span>DEPARTURE</span></div><i>✈</i><div><b>{f.to || "—"}</b><span>DESTINATION</span></div></div>
        <div className="stat-grid four"><Stat label="Aircraft" value={f.aircraft || "—"}/><Stat label="Callsign" value={f.callsign || "—"}/><Stat label="Cruise altitude" value={f.cruiseAltitude || "—"}/><Stat label="Block fuel" value={f.blockFuel || "—"}/></div>
        {f.route && <p className="route-summary">{f.route}</p>}
        <div className="actions"><button className="btn" onClick={() => go("flight")}>Open Flight Center</button><button className="btn ghost" onClick={() => go("logbook")}>Open Logbook</button></div>
      </Card> : <Card className="hero-card empty-flight">
        <div className="empty-icon">✈</div><small>YOUR FLIGHT PLAN</small><h2>No flight saved yet</h2><p>Import a real SimBrief OFP or create your own plan. AeroDeck no longer preloads a fictional flight.</p>
        <div className="actions"><button className="btn primary" onClick={() => go("simbrief")}>Import from SimBrief</button><button className="btn" onClick={() => go("flight")}>Create flight</button></div>
      </Card>}
      <Card className="network-card">
        <div className="card-head"><div><small>VATSIM NETWORK</small><h3>Live network</h3></div><Badge tone={network ? "live" : "neutral"}>{network ? "LIVE" : "CONNECTING"}</Badge></div>
        <div className="big-number">{network?.general?.connected_clients?.toLocaleString() ?? "—"}</div><p>Connected clients</p>
        <div className="mini-stats"><span><b>{network?.pilots?.length?.toLocaleString() ?? "—"}</b>Pilots</span><span><b>{network?.controllers?.length?.toLocaleString() ?? "—"}</b>Controllers</span></div>
        <button className="btn full" onClick={() => go("vatsim")}>Explore VATSIM</button>
      </Card>
    </div>
    <div className="stat-grid four"><Stat label="Saved plans / flights" value={flights.length}/><Stat label="Completed flights" value={loggedFlights.length}/><Stat label="Logged hours" value={hours(loggedFlights)}/><Stat label="Home airport" value={profile.home || "—"}/></div>
    <div className="grid-3">
      <Card><div className="card-head"><div><small>QUICK ACCESS</small><h3>Flight tools</h3></div></div><div className="quick-actions">{[["Flight Center","flight","✈"],["Weather","weather","◌"],["VATSIM","vatsim","◎"],["NewSky","newsky","↗"],["Logbook","logbook","▤"],["Training","training","◆"]].map((x) => <button key={x[1]} onClick={() => go(x[1])}><i>{x[2]}</i><b>{x[0]}</b></button>)}</div></Card>
      <Card><div className="card-head"><div><small>LIVE WEATHER</small><h3>Latest METAR reports</h3></div><button className="link" onClick={() => go("weather")}>Open</button></div><div className="list">{weather.slice(0,3).map((m:any) => <div className="row" key={m.id}><div><b>{m.id}</b><span>{m.metar || "No report supplied"}</span></div><Badge tone="live">LIVE</Badge></div>)}{!weather.length && <p className="muted">Live METAR data has not loaded yet.</p>}</div></Card>
      <Card><div className="card-head"><div><small>TRAINING LIBRARY</small><h3>Practice and reference</h3></div><button className="link" onClick={() => go("training")}>Open</button></div><p>Flight planning, METAR interpretation, ILS approaches, VATSIM radio and top-of-descent planning.</p><button className="btn full" onClick={() => go("training")}>Browse training</button></Card>
    </div>
  </>;
}

function FlightCenter({ flights, setFlights, go, notify }: any) {
  const [f, setF] = useState({ callsign:"", aircraft:"", from:"", to:"", duration:"", landing:"", date:"", notes:"" });
  const add = () => {
    const from = f.from.trim().toUpperCase();
    const to = f.to.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(from) || !/^[A-Z]{4}$/.test(to)) return notify("Enter valid four-letter ICAO departure and destination codes.");
    const flight: Flight = { id: crypto.randomUUID(), ...f, date:f.date || new Date().toISOString().slice(0,10), callsign:f.callsign.trim(), aircraft:f.aircraft.trim().toUpperCase(), from, to, source:"manual", status:"planned" };
    setFlights((current: Flight[]) => [flight, ...current]);
    notify("Flight saved");
    go("logbook");
  };
  return <>
    <Header eyebrow="FLIGHT CENTER" title="Flight planning" desc="Build a plan from your own details or import a real SimBrief operational flight plan." action={<button className="btn primary" onClick={() => go("simbrief")}>Import SimBrief OFP</button>} />
    <div className="grid-2">
      <Card><div className="card-head"><div><small>NEW FLIGHT</small><h3>Flight details</h3></div></div>
        <div className="form-grid two"><Field label="Callsign (optional)" value={f.callsign} onChange={(v)=>setF({...f,callsign:v.toUpperCase()})} placeholder="Set your actual callsign"/><Field label="Aircraft ICAO" value={f.aircraft} onChange={(v)=>setF({...f,aircraft:v.toUpperCase()})} placeholder="e.g. A20N"/><Field label="Departure ICAO" value={f.from} onChange={(v)=>setF({...f,from:v.toUpperCase()})} placeholder="e.g. EHAM"/><Field label="Destination ICAO" value={f.to} onChange={(v)=>setF({...f,to:v.toUpperCase()})} placeholder="e.g. LGSM"/><Field label="Planned duration" value={f.duration} onChange={(v)=>setF({...f,duration:v})} placeholder="e.g. 02:35"/><label className="field"><span>Flight date</span><input type="date" value={f.date} onChange={(e)=>setF({...f,date:e.target.value})}/></label><Field label="Landing rate (fpm)" value={f.landing} onChange={(v)=>setF({...f,landing:v})} placeholder="Leave blank until flown"/></div>
        <label className="field"><span>Notes</span><textarea value={f.notes} onChange={(e)=>setF({...f,notes:e.target.value})} placeholder="Only enter notes you want to keep."/></label>
        <button className="btn primary full" onClick={add}>Save flight</button>
      </Card>
      <Card><small>YOUR SAVED FLIGHTS</small><h3>Planning history</h3><div className="list">{flights.slice(0,10).map((x:Flight)=><div className="row" key={x.id}><div><b>{x.from || "—"} → {x.to || "—"}</b><span>{[x.callsign, x.aircraft, x.source === "simbrief" ? "SimBrief OFP" : x.source === "newsky" ? "NewSky" : "Manual"].filter(Boolean).join(" · ")}</span></div><span className="muted">{x.duration || "—"}</span></div>)}{!flights.length && <div className="empty">No saved flights yet. Import an OFP or create your first plan.</div>}</div></Card>
    </div>
  </>;
}

function SimBrief({ notify, setFlights, go }: any) {
  const [username, setUsername] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { try { setUsername(localStorage.getItem("aerodeck-simbrief-id") || ""); } catch {} }, []);

  const load = async () => {
    const identifier = username.trim();
    if (!identifier) return setError("Enter your SimBrief username or Pilot ID.");
    setLoading(true); setError(""); setData(null);
    try {
      const key = /^\d+$/.test(identifier) ? "userid" : "username";
      const response = await fetch("/api/simbrief?" + key + "=" + encodeURIComponent(identifier), { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || String(result?.fetch?.status || "").toLowerCase() === "error") throw new Error(result.error || result?.fetch?.message || "SimBrief did not return a usable OFP. Check the identifier and ensure a latest OFP exists.");
      if (!result?.params && !result?.origin && !result?.general) throw new Error("The response did not contain recognizable OFP data.");
      setData(result); notify("OFP loaded from SimBrief");
    } catch (e:any) { setError(e.message || "Could not load the OFP."); } finally { setLoading(false); }
  };

  const origin = displayValue(data?.origin?.icao, data?.params?.orig);
  const destination = displayValue(data?.destination?.icao, data?.params?.dest);
  const aircraftCode = displayValue(data?.aircraft?.icaocode, data?.params?.type);
  const callsign = displayValue(data?.atc?.callsign, data?.params?.callsign, data?.params?.flight);
  const route = displayValue(data?.atc?.route, data?.general?.route, data?.params?.route);
  const navlog = navlogEntries(data);
  const saveFlight = () => {
    if (origin === "—" || destination === "—") return setError("This OFP does not include both departure and destination ICAO codes, so it cannot be saved as a flight yet.");
    const duration = displayValue(data?.times?.est_time_enroute, data?.times?.sched_time_enroute, data?.params?.duration);
    const cruise = displayValue(data?.general?.initial_altitude, data?.params?.cruisealt);
    const blockFuel = displayValue(data?.fuel?.block, data?.fuel?.plan_ramp, data?.params?.blockfuel);
    const flight: Flight = {
      id: crypto.randomUUID(),
      callsign: callsign === "—" ? "" : callsign,
      aircraft: aircraftCode === "—" ? "" : aircraftCode,
      from: origin,
      to: destination,
      duration: duration === "—" ? "" : duration,
      landing: "",
      date: displayValue(data?.params?.date) === "—" ? "" : displayValue(data?.params?.date),
      notes: "Imported from SimBrief",
      source: "simbrief",
      status: "planned",
      route: route === "—" ? "" : route,
      flightNumber: displayValue(data?.params?.flight) === "—" ? "" : displayValue(data?.params?.flight),
      cruiseAltitude: cruise === "—" ? "" : cruise,
      blockFuel: blockFuel === "—" ? "" : blockFuel,
      ofpJson: data
    };
    setFlights((current: Flight[]) => [flight, ...current]);
    notify("OFP saved to AeroDeck");
    go("flight");
  };

  return <>
    <Header eyebrow="SIMBRIEF INTEGRATION" title="Operational flight plan" desc="Load the latest OFP from your own SimBrief account. Only values actually returned by SimBrief are shown." />
    <Card><div className="inline"><input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="SimBrief username or numeric Pilot ID" onKeyDown={(e)=>e.key==="Enter"&&load()}/><button className="btn primary" onClick={load} disabled={loading}>{loading ? "Loading OFP…" : "Load latest OFP"}</button></div>{error&&<div className="error">{error}</div>}<p className="muted">AeroDeck does not generate a sample flight if SimBrief has no valid OFP.</p></Card>
    {data && <>
      <Card className="ofp-title"><div className="card-head"><div><small>IMPORTED OFP</small><h2>{origin} <span>→</span> {destination}</h2><p>{[callsign, aircraftCode, displayValue(data?.params?.date)].filter((v)=>v!=="—").join(" · ")}</p></div><Badge tone="live">SIMBRIEF DATA</Badge></div><button className="btn primary" onClick={saveFlight}>Save to AeroDeck flights</button></Card>
      <div className="stat-grid four"><Stat label="Aircraft" value={aircraftCode}/><Stat label="Callsign / flight" value={callsign}/><Stat label="Route distance" value={displayValue(data?.general?.route_distance, data?.params?.totaldist)==="—" ? "—" : displayValue(data?.general?.route_distance, data?.params?.totaldist) + " nm"}/><Stat label="Estimated en route" value={displayValue(data?.times?.est_time_enroute, data?.params?.duration)}/></div>
      <div className="grid-2">
        <Card><div className="card-head"><div><small>ROUTE</small><h3>Flight path</h3></div></div><p className="route-text">{route}</p><RouteMap data={data} sourceName="SimBrief"/></Card>
        <Card><small>FLIGHT DETAILS</small><h3>Aircraft and dispatch</h3><div className="data-grid">
          <div className="data-pair"><span>Registration</span><b>{displayValue(data?.aircraft?.reg)}</b></div>
          <div className="data-pair"><span>Aircraft name</span><b>{displayValue(data?.aircraft?.name)}</b></div>
          <div className="data-pair"><span>Flight number</span><b>{displayValue(data?.params?.flight)}</b></div>
          <div className="data-pair"><span>Cruise altitude</span><b>{displayValue(data?.general?.initial_altitude, data?.params?.cruisealt)}</b></div>
          <div className="data-pair"><span>Departure runway</span><b>{displayValue(data?.origin?.plan_rwy, data?.origin?.runway)}</b></div>
          <div className="data-pair"><span>Arrival runway</span><b>{displayValue(data?.destination?.plan_rwy, data?.destination?.runway)}</b></div>
          <div className="data-pair"><span>Generated</span><b>{displayValue(data?.params?.date, data?.params?.time_generated)}</b></div>
          <div className="data-pair"><span>Alternate</span><b>{displayValue(data?.alternate?.icao, data?.params?.altn)}</b></div>
        </div></Card>
        <Card><small>TIMING</small><h3>Schedule and estimates</h3><div className="data-grid">
          <div className="data-pair"><span>Scheduled off-block</span><b>{displayValue(data?.times?.sched_out)}</b></div>
          <div className="data-pair"><span>Estimated take-off</span><b>{displayValue(data?.times?.sched_off)}</b></div>
          <div className="data-pair"><span>Estimated landing</span><b>{displayValue(data?.times?.sched_on)}</b></div>
          <div className="data-pair"><span>Scheduled in-block</span><b>{displayValue(data?.times?.sched_in)}</b></div>
          <div className="data-pair"><span>En-route time</span><b>{displayValue(data?.times?.est_time_enroute)}</b></div>
          <div className="data-pair"><span>Average wind</span><b>{displayValue(data?.times?.avg_wind_dir)} / {displayValue(data?.times?.avg_wind_spd)} kt</b></div>
        </div></Card>
        <Card><small>FUEL</small><h3>Fuel plan</h3><div className="data-grid">
          {[["Taxi",data?.fuel?.taxi],["Trip burn",data?.fuel?.enroute_burn],["Contingency",data?.fuel?.contingency],["Alternate",data?.fuel?.alternate_burn],["Reserve",data?.fuel?.reserve],["Minimum take-off",data?.fuel?.min_takeoff],["Planned take-off",data?.fuel?.plan_takeoff],["Planned landing",data?.fuel?.plan_landing],["Ramp / block",data?.fuel?.plan_ramp ?? data?.fuel?.block]].map(([label,value]:any)=><div className="data-pair" key={label}><span>{label}</span><b>{value === undefined || value === null || value === "" ? "—" : String(value) + " kg"}</b></div>)}
        </div></Card>
        <Card><small>WEIGHTS</small><h3>Aircraft weights</h3><div className="data-grid">
          {[["Operating empty",data?.weights?.oew],["Payload",data?.weights?.payload],["Zero-fuel weight",data?.weights?.zfw],["Max zero-fuel weight",data?.weights?.mzfw],["Take-off weight",data?.weights?.tow],["Maximum take-off weight",data?.weights?.mtow],["Estimated landing weight",data?.weights?.est_ldw ?? data?.weights?.ldw],["Maximum landing weight",data?.weights?.mlw]].map(([label,value]:any)=><div className="data-pair" key={label}><span>{label}</span><b>{value === undefined || value === null || value === "" ? "—" : String(value) + " kg"}</b></div>)}
        </div></Card>
        <Card><small>AIRPORT WEATHER</small><h3>OFP weather reports</h3><div className="airport-metar"><b>{origin}</b><pre>{displayValue(data?.origin?.metar)}</pre></div><div className="airport-metar"><b>{destination}</b><pre>{displayValue(data?.destination?.metar)}</pre></div></Card>
      </div>
      <Card><div className="card-head"><div><small>NAVLOG</small><h3>Waypoint-by-waypoint route</h3></div><Badge tone="neutral">{navlog.length} points supplied</Badge></div>{navlog.length ? <div className="table-wrap"><table><thead><tr><th>Fix</th><th>Airway</th><th>Altitude</th><th>Leg distance</th><th>Leg time</th><th>Fuel remaining</th></tr></thead><tbody>{navlog.map((fix:any,index:number)=><tr key={String(fix.ident||fix.name||index)+index}><td>{displayValue(fix.ident,fix.name,fix.fix)}</td><td>{displayValue(fix.via_airway,fix.airway,fix.via)}</td><td>{displayValue(fix.altitude,fix.altitude_feet,fix.alt)}{displayValue(fix.altitude,fix.altitude_feet,fix.alt)!=="—"?" ft":""}</td><td>{displayValue(fix.distance,fix.dist,fix.leg_dist)}{displayValue(fix.distance,fix.dist,fix.leg_dist)!=="—"?" nm":""}</td><td>{displayValue(fix.time_leg,fix.leg_time,fix.ete)}</td><td>{displayValue(fix.fuel_remain,fix.fuel_remaining)}</td></tr>)}</tbody></table></div> : <p className="muted">This OFP response did not include a waypoint list.</p>}</Card>
      <details><summary>Raw OFP response (diagnostics)</summary><pre>{JSON.stringify(data,null,2).slice(0,30000)}</pre></details>
    </>}
  </>;
}

function Airports({ favorites, setFavorites, notes, setNotes }: any) {
  const [q,setQ] = useState("");
  const [sel,setSel] = useState<any>(null);
  const [items,setItems] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [searchError,setSearchError] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      setSel(null);
      setSearchError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const response = await fetch("/api/airports?q=" + encodeURIComponent(term), { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Airport search is temporarily unavailable.");
        const results = Array.isArray(body.items) ? body.items : [];
        setItems(results);
        setSel(null);
      } catch (error:any) {
        if (!controller.signal.aborted) {
          setSearchError(error.message || "Airport search is temporarily unavailable.");
          setItems([]);
          setSel(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  const favoriteExists = !!sel?.icao && favorites.some((item:FavoriteItem) => item.kind === "airport" && item.code === sel.icao);
  const toggle = () => {
    if (!sel?.icao) return;
    setFavorites((current: FavoriteItem[]) => favoriteExists
      ? current.filter((item) => !(item.kind === "airport" && item.code === sel.icao))
      : [...current, { kind: "airport", code: sel.icao, label: sel.name }]);
  };

  return <>
    <Header eyebrow="AIRPORTS" title="Airport Explorer" desc="Search airport identifiers, names, cities and IATA codes using the public OurAirports dataset. Runway details are shown only when available."/>
    <div className="grid-2">
      <Card>
        <Field label="Search worldwide airports" value={q} onChange={setQ} placeholder="ICAO, IATA, airport, city…"/>
        {loading && <p className="muted">Searching airport records…</p>}
        {searchError && <div className="error">{searchError}</div>}
        <div className="list scroll">
          {items.map((a:any,index:number)=><button className={"row button-row "+(a.icao===sel?.icao?"selected":"")} key={a.icao || a.iata || a.name+index} onClick={()=>setSel(a)}>
            <div><b>{a.icao || a.iata || a.ident || "No ICAO code"}{a.iata ? " · "+a.iata : ""}</b><span>{a.name}</span></div><small>{a.city || a.country || a.type || ""}</small>
          </button>)}
          {!loading && !items.length && !searchError && <div className="empty">{q.trim().length < 2 ? "Search by at least two characters to load real airport records." : "No matching airports found in the returned dataset."}</div>}
          {!loading && !items.length && searchError && <div className="empty">Airport details are unavailable because the source did not respond.</div>}
        </div>
      </Card>
      {sel && <Card>
        <div className="card-head"><div><small>AIRPORT PROFILE</small><h3>{sel.icao || sel.ident || "Identifier unavailable"}</h3></div><button className={"star "+(favoriteExists?"on":"")} onClick={toggle} disabled={!sel.icao} aria-label="Toggle airport favourite">★</button></div>
        <h2>{sel.name}</h2>
        <p>{[sel.city,sel.country].filter(Boolean).join(", ") || "Location details not supplied"} · {sel.elev === null || sel.elev === undefined || sel.elev === "" ? "Elevation not supplied" : sel.elev+" ft"}</p>
        <div className="stat-grid four"><Stat label="ICAO / Ident" value={sel.icao || sel.ident || "—"}/><Stat label="IATA" value={sel.iata || "—"}/><Stat label="Elevation" value={sel.elev === null || sel.elev === undefined || sel.elev === "" ? "—" : sel.elev+" ft"}/><Stat label="Runways" value={sel.runways?.length ? sel.runways.length : "Not supplied"}/></div>
        <h4>Runways</h4>
        {sel.runways?.length ? <div className="chips">{sel.runways.map((r:string)=><span key={r}>{r}</span>)}</div> : <p className="muted">Runway details are not included in the current airport lookup result.</p>}
        <label className="field"><span>Personal note</span><textarea value={notes[sel.icao || sel.ident] || ""} onChange={(e)=>setNotes({...notes,[sel.icao || sel.ident]:e.target.value})} placeholder="Your airport notes…"/></label>
        <p className="muted">Airport lookup source: {sel.source || "OurAirports"}.</p>
      </Card>}
    </div>
  </>;
}

function Aircraft({ favorites, setFavorites, notes, setNotes }: any) {
  const [q,setQ] = useState("");
  const [items,setItems] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [sourceInfo,setSourceInfo] = useState<any>(null);
  const [selected,setSelected] = useState<any>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setItems([]);
      setSelected(null);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/aircraft?q=" + encodeURIComponent(query), { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Aircraft data is unavailable.");
        setItems(Array.isArray(body.items) ? body.items : []);
        setSourceInfo(body);
        setSelected(null);
      } catch (e:any) {
        if (!controller.signal.aborted) {
          setItems([]);
          setSelected(null);
          setError(e.message || "Aircraft data is unavailable.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  const list = items;
  const active = selected && list.some((item:any) => item.name === selected.name && item.icao === selected.icao)
    ? selected
    : list[0] || null;
  const noteKey = active?.icao || active?.name || "";
  const favoriteExists = !!active?.icao && favorites.some((item:FavoriteItem) => item.kind === "aircraft" && item.code === active.icao);
  const toggle = () => {
    if (!active?.icao) return;
    setFavorites((current: FavoriteItem[]) => favoriteExists
      ? current.filter((item) => !(item.kind === "aircraft" && item.code === active.icao))
      : [...current, { kind: "aircraft", code: active.icao, label: active.name }]);
  };

  return <>
    <Header eyebrow="AIRCRAFT REFERENCE" title="Aircraft library" desc="Search aircraft type names and IATA/ICAO type codes. This directory uses a curated public reference dataset; it does not invent performance specifications." />
    <div className="grid-2">
      <Card>
        <Field label="Search aircraft types" value={q} onChange={(value)=>{setQ(value);setSelected(null);}} placeholder="A320neo, B738, A359, E190…"/>
        {loading && <p className="muted">Searching aircraft type records…</p>}
        {error && <div className="error">{error}</div>}
        <div className="list scroll">
          {list.map((item:any,index:number)=><button className={"row button-row "+(item.name===active?.name&&item.icao===active?.icao?"selected":"")} key={item.icao+"-"+item.iata+"-"+item.name+"-"+index} onClick={()=>setSelected(item)}>
            <div><b>{item.icao || "ICAO unavailable"}{item.iata ? " · "+item.iata : ""}</b><span>{item.name}</span></div>
          </button>)}
          {!loading && !error && !list.length && <div className="empty">{q.trim().length < 2 ? "Search by at least two characters to query the aircraft reference dataset." : "No matching aircraft type in this dataset."}</div>}
          {!loading && error && !items.length && <div className="empty">Aircraft results are unavailable because the source did not respond.</div>}
        </div>
      </Card>
      {active && <Card>
        <div className="card-head"><div><small>AIRCRAFT TYPE</small><h3>{active.icao || "ICAO code unavailable"}</h3></div><button className={"star "+(favoriteExists?"on":"")} onClick={toggle} disabled={!active.icao} aria-label="Toggle aircraft favourite">★</button></div>
        <h2>{active.name}</h2>
        <div className="stat-grid three"><Stat label="ICAO type code" value={active.icao || "—"}/><Stat label="IATA type code" value={active.iata || "—"}/><Stat label="Data source" value={active.source || sourceInfo?.source || "—"}/></div>
        <label className="field"><span>Personal aircraft note</span><textarea value={notes[noteKey] || ""} onChange={(e)=>setNotes({...notes,[noteKey]:e.target.value})} placeholder="Your aircraft notes…"/></label>
        <div className="notice">Performance data such as range, engine variant, MTOW and seating are intentionally omitted because this reference does not supply those fields. Use the aircraft's official or simulator-specific documentation for those values.</div>
        <p className="muted">Source: <a href={sourceInfo?.sourceUrl || "https://openflights.org/data"} target="_blank" rel="noreferrer">OpenFlights aircraft database</a>. {sourceInfo?.licence || "Open Database License (ODbL)"}. The reference list is curated and may not contain every aircraft type.</p>
      </Card>}
    </div>
  </>;
}

function pickRecordValue(record: any, paths: string[]): string {
  for (const path of paths) {
    const value = path.split(".").reduce((current: any, key) => current?.[key], record);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      if (typeof value === "object") return displayValue(value.icao, value.name, value.callsign, value.code, value.id);
      return String(value);
    }
  }
  return "—";
}

function NewSky({ setFlights, go, notify }: any) {
  const [view, setView] = useState<"ongoing" | "recent">("ongoing");
  const [result, setResult] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = async (nextView: "ongoing" | "recent" = view) => {
    setView(nextView); setLoading(true); setError(""); setSelected(null);
    try {
      const response = await fetch("/api/newsky?view=" + nextView, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "NewSky request failed.");
      setResult(body); setLoaded(true);
    } catch (e:any) {
      setResult(null); setError(e.message || "Could not load NewSky data."); setLoaded(true);
    } finally { setLoading(false); }
  };
  const records = Array.isArray(result?.results) ? result.results : Array.isArray(result?.flights) ? result.flights : Array.isArray(result) ? result : [];
  const details = async (record: any) => {
    const id = pickRecordValue(record, ["id","_id","flightId","flight.id"]);
    if (id === "—") { setSelected(record); return; }
    try {
      const response = await fetch("/api/newsky?view=flight&id=" + encodeURIComponent(id), { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not fetch flight details.");
      setSelected(body.flight || body);
    } catch { setSelected(record); }
  };

  const importSelectedFlight = () => {
    if (!selected) return;
    const from = pickRecordValue(selected, ["departure.icao","departure.icaoCode","departureIcao","origin.icao","origin","departureAirport.icao","departureAirportIcao"]);
    const to = pickRecordValue(selected, ["arrival.icao","arrival.icaoCode","destinationIcao","destination.icao","destination","arrivalAirport.icao","arrivalAirportIcao"]);
    if (!/^[A-Z0-9]{4}$/.test(from) || !/^[A-Z0-9]{4}$/.test(to)) {
      setError("This NewSky record does not provide both ICAO departure and destination codes, so AeroDeck cannot safely import it as a flight.");
      return;
    }
    const rawDuration = pickRecordValue(selected, ["flightTime","flight_time","duration","blockTime","block_time","times.flight"]);
    const duration = /^\d{1,3}:\d{2}$/.test(rawDuration) ? rawDuration : "";
    const rawDate = pickRecordValue(selected, ["date","flightDate","flight_date","createdAt","departureTime","scheduledDeparture","startTime"]);
    const flight: Flight = {
      id: crypto.randomUUID(),
      callsign: pickRecordValue(selected, ["callsign","atc.callsign","flightNumber","flight_number"]) === "—" ? "" : pickRecordValue(selected, ["callsign","atc.callsign","flightNumber","flight_number"]),
      aircraft: pickRecordValue(selected, ["aircraft.icao","aircraft.icaoCode","aircraft.name","aircraftIcao","aircraft_code","aircraft"]) === "—" ? "" : pickRecordValue(selected, ["aircraft.icao","aircraft.icaoCode","aircraft.name","aircraftIcao","aircraft_code","aircraft"]),
      from,
      to,
      duration,
      landing: pickRecordValue(selected, ["landingRateFpm","landingRate","landing_rate_fpm","landing.rate"]) === "—" ? "" : pickRecordValue(selected, ["landingRateFpm","landingRate","landing_rate_fpm","landing.rate"]),
      date: rawDate === "—" ? "" : rawDate,
      notes: "Imported from NewSky",
      source: "newsky",
      status: view === "recent" ? "logged" : "active",
      route: pickRecordValue(selected, ["route","flightPlan.route","flight_plan.route"]) === "—" ? "" : pickRecordValue(selected, ["route","flightPlan.route","flight_plan.route"]),
    };
    setFlights((current: Flight[]) => [flight, ...current.filter((item) => item.id !== flight.id)]);
    notify(view === "recent" ? "NewSky flight imported into the logbook" : "Ongoing NewSky flight imported");
    go(view === "recent" ? "logbook" : "flight");
  };

  useEffect(() => { void load("ongoing"); }, []);

  return <>
    <Header eyebrow="AIRLINE INTEGRATION" title="NewSky" desc="Live airline flights and recent results from your NewSky account. Values appear only when the official API returns them." action={<Badge tone={result ? "live" : "neutral"}>{loading ? "CONNECTING" : result ? "CONNECTED" : "API STATUS"}</Badge>} />
    <Card><div className="newsky-toolbar"><div className="tabs"><button className={view==="ongoing"?"active":""} onClick={()=>load("ongoing")} disabled={loading}>Ongoing flights</button><button className={view==="recent"?"active":""} onClick={()=>load("recent")} disabled={loading}>Recent flights</button></div><button className="btn" onClick={()=>load(view)} disabled={loading}>{loading ? "Refreshing…" : "Refresh data"}</button></div>
      {error && <div className="error">{error}</div>}
      {!loaded && !loading && <div className="empty">Choose a NewSky view to load your airline data.</div>}
      {result && <div className="notice">Connected to NewSky. {result.totalResults !== undefined ? result.totalResults + " matching records reported by the API." : records.length + " records returned."}</div>}
      {loaded && !error && !records.length && <div className="empty">NewSky returned no {view === "ongoing" ? "ongoing" : "recent"} flights.</div>}
    </Card>
    {records.length > 0 && <Card><div className="table-wrap"><table><thead><tr><th>Flight / ID</th><th>Pilot</th><th>Aircraft</th><th>Departure</th><th>Arrival</th><th>Status</th><th></th></tr></thead><tbody>
      {records.map((record:any,index:number)=><tr key={String(record.id||record._id||index)}>
        <td><b>{pickRecordValue(record,["callsign","atc.callsign","flightNumber","flight_number","number","id"])}</b><small>{pickRecordValue(record,["id","_id","flightId"])}</small></td>
        <td>{pickRecordValue(record,["pilot.name","pilot.fullName","pilotName","pilot.callsign","user.name"])}</td>
        <td>{pickRecordValue(record,["aircraft.icao","aircraft.icaoCode","aircraft.name","aircraftIcao","aircraft_code","aircraft"])}</td>
        <td>{pickRecordValue(record,["departure.icao","departure.icaoCode","departureIcao","origin.icao","origin","departureAirport.icao"])}</td>
        <td>{pickRecordValue(record,["arrival.icao","arrival.icaoCode","destinationIcao","destination.icao","destination","arrivalAirport.icao"])}</td>
        <td>{pickRecordValue(record,["status","state","flight.status"])}</td>
        <td><button className="link" onClick={()=>details(record)}>Details</button></td>
      </tr>)}
    </tbody></table></div></Card>}
    {selected && <Card><div className="card-head"><div><small>FLIGHT DETAILS</small><h3>{pickRecordValue(selected,["callsign","atc.callsign","flightNumber","id","_id"])}</h3></div><button className="btn" onClick={()=>setSelected(null)}>Close</button></div>
      <div className="grid-2"><div className="data-pair"><span>Route</span><b>{pickRecordValue(selected,["departure.icao","departureIcao","origin.icao","origin"])} → {pickRecordValue(selected,["arrival.icao","destinationIcao","destination.icao","destination"])}</b></div><div className="data-pair"><span>Landing rate</span><b>{pickRecordValue(selected,["landingRateFpm","landingRate","landing_rate_fpm","landing.rate"])}</b></div></div>
      <RouteMap data={selected} sourceName="NewSky"/>
      <div className="actions"><button className="btn primary" onClick={importSelectedFlight}>Import into AeroDeck</button></div>
      <details><summary>Full response from NewSky</summary><pre>{JSON.stringify(selected,null,30000).slice(0,30000)}</pre></details>
    </Card>}
    <Card><small>SETUP</small><h3>Secure API connection</h3><p>NewSky airline endpoints require an API key with the appropriate scope. Store it in the hosting provider as <code>NEWSKY_API_KEY</code>; the key is used only on the server and is never sent to the browser. The API key must include the <b>flights</b> scope for flight lists/details.</p><a href="https://wiki.newsky.app/en/airline/airline-api" target="_blank" rel="noreferrer">NewSky API documentation ↗</a></Card>
  </>;
}

function Weather() {
  const [icao,setIcao] = useState("EHAM"); const [items,setItems] = useState<any[]>([]); const [loading,setLoading] = useState(false);
  const load = async () => { setLoading(true); try { const r=await fetch("/api/metar?icao="+encodeURIComponent(icao)); const d=await r.json(); setItems(d.items||[]);} finally {setLoading(false);} };
  return <><Header eyebrow="WEATHER" title="Weather Center" desc="Live public VATSIM METAR data with an aviation-focused display." action={<Badge tone="live">LIVE DATA</Badge>}/><Card><div className="inline"><input value={icao} onChange={(e)=>setIcao(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&load()} placeholder="EHAM"/><button className="btn primary" onClick={load}>{loading?"Loading…":"Retrieve METAR"}</button></div><div className="chips">{["EHAM","EDDL","LGSM","EGLL","KJFK"].map((x)=><button key={x} onClick={()=>setIcao(x)}>{x}</button>)}</div></Card><div className="grid-2">{items.map((m:any)=><Card key={m.id}><div className="card-head"><h3>{m.id}</h3><Badge tone="live">LIVE</Badge></div><pre>{m.metar||JSON.stringify(m,null,2)}</pre></Card>)}{!items.length&&<Card><div className="empty">Enter an ICAO code and retrieve a report.</div></Card>}</div></>;
}

function Vatsim() {
  const [d,setD] = useState<any>(null); const [events,setEvents] = useState<any[]>([]); const [tab,setTab]=useState("traffic"); const [q,setQ]=useState("");
  useEffect(()=>{Promise.all([fetch("/api/vatsim").then(r=>r.json()),fetch("/api/events").then(r=>r.json())]).then(([a,e])=>{setD(a);setEvents(e.data||[])}).catch(()=>{})},[]);
  const pilots=(d?.pilots||[]).filter((p:any)=>(p.callsign+" "+(p.flight_plan?.departure||"")+" "+(p.flight_plan?.arrival||"")).toLowerCase().includes(q.toLowerCase())).slice(0,40);
  return <><Header eyebrow="NETWORK" title="VATSIM Live" desc="Live network data, controllers and events." action={<Badge tone={d?"live":"neutral"}>{d?"CONNECTED":"OFFLINE"}</Badge>}/><div className="stat-grid four"><Stat label="Clients" value={d?.general?.connected_clients?.toLocaleString()||"—"}/><Stat label="Pilots" value={d?.pilots?.length?.toLocaleString()||"—"}/><Stat label="Controllers" value={d?.controllers?.length?.toLocaleString()||"—"}/><Stat label="Updated" value={d?.general?.update_timestamp ? new Date(d.general.update_timestamp).toLocaleTimeString("en-GB") : "—"}/></div><div className="tabs">{[["traffic","Live Traffic"],["controllers","Controllers"],["events","Events"]].map((t)=><button className={tab===t[0]?"active":""} key={t[0]} onClick={()=>setTab(t[0])}>{t[1]}</button>)}</div>{tab==="traffic"&&<Card><div className="card-head"><h3>Aircraft on network</h3><input className="small-input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Filter callsign / route"/></div><div className="table-wrap"><table><thead><tr><th>Callsign</th><th>Type</th><th>Route</th><th>Alt</th><th>GS</th><th>HDG</th></tr></thead><tbody>{pilots.map((p:any)=><tr key={String(p.cid)+p.callsign}><td>{p.callsign}</td><td>{p.flight_plan?.aircraft_short||"—"}</td><td>{p.flight_plan?.departure||"—"} → {p.flight_plan?.arrival||"—"}</td><td>{p.altitude?.toLocaleString()||"—"}</td><td>{p.groundspeed||"—"}</td><td>{p.heading||"—"}°</td></tr>)}</tbody></table></div></Card>}{tab==="controllers"&&<Card><div className="table-wrap"><table><thead><tr><th>Callsign</th><th>Frequency</th><th>Facility</th></tr></thead><tbody>{(d?.controllers||[]).slice(0,50).map((c:any)=><tr key={String(c.cid)+c.callsign}><td>{c.callsign}</td><td>{c.frequency}</td><td>{c.facility}</td></tr>)}</tbody></table></div></Card>}{tab==="events"&&<div className="grid-3">{events.slice(0,12).map((e:any)=><Card key={e.id}><small>{e.start_time ? new Date(e.start_time).toLocaleString("en-GB") : "Upcoming"}</small><h3>{e.name}</h3><p>{e.short_description||"VATSIM event"}</p>{e.link&&<a className="btn ghost full" href={e.link} target="_blank" rel="noreferrer">Open event</a>}</Card>)}</div>}</>;
}

function Training({ trainingDone: done, setTrainingDone: setDone }: any) {
  const toggle=(id:string)=>{const next=done.includes(id)?done.filter((x:string)=>x!==id):[...done,id];setDone(next);};
  return <><Header eyebrow="TRAINING" title="Flight-sim training" desc="Structured learning for planning, IFR, radio work and airline operations."/><div className="grid-3">{lessons.map((l,i)=><Card key={l[0]}><Badge tone={done.includes(String(i))?"live":"accent"}>{done.includes(String(i))?"COMPLETE":"LESSON "+(i+1)}</Badge><h3>{l[0]}</h3><p>{l[1]}</p><button className="btn full" onClick={()=>toggle(String(i))}>{done.includes(String(i))?"Mark incomplete":"Complete lesson"}</button></Card>)}</div><Card><div className="progress-row"><b>Overall progress</b><span>{Math.round(done.length/lessons.length*100)}%</span></div><div className="progress"><i style={{width:(done.length/lessons.length*100)+"%"}} /></div></Card></>;
}

function Knowledge() {
  const [q,setQ]=useState(""); const list=terms.filter((x)=>(x[0]+" "+x[1]).toLowerCase().includes(q.toLowerCase()));
  return <><Header eyebrow="KNOWLEDGE" title="Aviation Knowledge Base" desc="Searchable explanations for flight simulation and aviation concepts."/><Card><Field label="Search terms" value={q} onChange={setQ} placeholder="QNH, ILS, RNP, TOD…"/><div className="grid-2">{list.map((x)=><div className="term-card" key={x[0]}><b>{x[0]}</b><p>{x[1]}</p></div>)}</div></Card></>;
}

function Calculators() {
  const [rwy,setRwy]=useState("230"),[wind,setWind]=useState("260"),[speed,setSpeed]=useState("18");
  const angle=((Number(wind)-Number(rwy)+540)%360)-180; const radians=angle*Math.PI/180; const cross=Math.abs(Number(speed)*Math.sin(radians)); const head=Number(speed)*Math.cos(radians);
  const [alt,setAlt]=useState("10000"),[target,setTarget]=useState("3000"),[vs,setVs]=useState("1500");
  const tod=(Number(alt)-Number(target))/1000*3; const time=(Number(alt)-Number(target))/Number(vs||1);
  return <><Header eyebrow="CALCULATORS" title="Flight calculators" desc="Useful planning math with clear assumptions and live results."/><div className="grid-2"><Card><small>WIND COMPONENTS</small><h3>Runway / wind</h3><div className="form-grid three"><Field label="Runway°" value={rwy} onChange={setRwy}/><Field label="Wind°" value={wind} onChange={setWind}/><Field label="Wind kt" value={speed} onChange={setSpeed}/></div><div className="calc-grid"><Stat label="Crosswind" value={cross.toFixed(1)+" kt"}/><Stat label={head>=0?"Headwind":"Tailwind"} value={Math.abs(head).toFixed(1)+" kt"}/><Stat label="Angle" value={Math.abs(angle).toFixed(1)+"°"}/></div></Card><Card><small>TOP OF DESCENT</small><h3>3:1 descent planning</h3><div className="form-grid three"><Field label="Current ft" value={alt} onChange={setAlt}/><Field label="Target ft" value={target} onChange={setTarget}/><Field label="VS fpm" value={vs} onChange={setVs}/></div><div className="calc-grid"><Stat label="Rule-of-thumb TOD" value={tod.toFixed(1)+" NM"}/><Stat label="Descent time" value={time.toFixed(1)+" min"}/></div></Card></div><Card><small>UNIT CONVERTER</small><h3>Common aviation conversions</h3><div className="converter">{[["100 kg","220.46 lb"],["1000 ft","304.8 m"],["100 kt","185.2 km/h"],["15 °C","59 °F"]].map(x=><div className="convert" key={x[0]}><span>{x[0]}</span><b>→ {x[1]}</b></div>)}</div></Card></>;
}

function Logbook({ flights,setFlights,notify }:any) {
  const loggedFlights = flights.filter((flight: Flight) => flight.status === "logged");
  const [d,setD]=useState({callsign:"",aircraft:"",from:"",to:"",duration:"",landing:"",date:"",notes:""});
  const add=()=>{
    const from=d.from.trim().toUpperCase();
    const to=d.to.trim().toUpperCase();
    if(!/^[A-Z]{4}$/.test(from)||!/^[A-Z]{4}$/.test(to)){notify("Enter valid four-letter departure and destination ICAO codes.");return;}
    setFlights([{id:crypto.randomUUID(),...d,from,to,date:d.date||new Date().toISOString().slice(0,10),source:"manual",status:"logged"},...flights]);
    setD({callsign:"",aircraft:"",from:"",to:"",duration:"",landing:"",date:"",notes:""});
    notify("Flight logged");
  };
  return <><Header eyebrow="LOGBOOK" title="Personal Logbook" desc="Keep your flight history in AeroDeck." action={<button className="btn primary" onClick={add}>Log flight</button>}/><div className="stat-grid four"><Stat label="Logged flights" value={loggedFlights.length}/><Stat label="Logged hours" value={hours(loggedFlights)}/><Stat label="Airports visited" value={new Set(loggedFlights.flatMap((x:Flight)=>[x.from,x.to])).size}/><Stat label="Best landing" value={bestLanding(loggedFlights)}/></div><div className="grid-2"><Card><small>NEW ENTRY</small><h3>Log flight</h3><div className="form-grid two"><Field label="Callsign" value={d.callsign} onChange={(v)=>setD({...d,callsign:v})}/><Field label="Aircraft" value={d.aircraft} onChange={(v)=>setD({...d,aircraft:v})}/><Field label="Departure" value={d.from} onChange={(v)=>setD({...d,from:v.toUpperCase()})}/><Field label="Destination" value={d.to} onChange={(v)=>setD({...d,to:v.toUpperCase()})}/><Field label="Duration" value={d.duration} onChange={(v)=>setD({...d,duration:v})}/><label className="field"><span>Flight date</span><input type="date" value={d.date} onChange={(e)=>setD({...d,date:e.target.value})}/></label><Field label="Landing rate" value={d.landing} onChange={(v)=>setD({...d,landing:v})}/></div><label className="field"><span>Notes</span><textarea value={d.notes} onChange={(e)=>setD({...d,notes:e.target.value})}/></label></Card><Card><small>HISTORY</small><h3>Recent flights</h3><div className="list">{loggedFlights.map((x:Flight)=><div className="row" key={x.id}><div><b>{x.callsign || "Callsign not recorded"}</b><span>{x.from} → {x.to} · {x.aircraft || "Aircraft not recorded"} · {x.date || "Date not supplied"}</span></div><span>{x.landing || "Landing rate not recorded"}</span></div>)}{!loggedFlights.length && <div className="empty">No completed flights logged yet. Use a NewSky recent flight import or enter your flight details here.</div>}</div></Card></div></>;
}

function Favorites({ favorites, go }:any) {
  const savedAirports = favorites.filter((item: FavoriteItem) => item.kind === "airport");
  const savedAircraft = favorites.filter((item: FavoriteItem) => item.kind === "aircraft");
  return <>
    <Header eyebrow="SAVED" title="Favorites" desc="Your saved airport and aircraft references."/>
    <div className="grid-2">
      <Card><h3>Airports</h3><div className="list">
        {savedAirports.map((item:FavoriteItem)=><button className="row button-row" key={item.kind+item.code} onClick={()=>go("airports")}><div><b>{item.code}</b><span>{item.label || airports.find((a)=>a.icao===item.code)?.name || "Open Airport Explorer for details"}</span></div><span>→</span></button>)}
        {!savedAirports.length && <div className="empty">No saved airports yet.</div>}
      </div></Card>
      <Card><h3>Aircraft</h3><div className="list">
        {savedAircraft.map((item:FavoriteItem)=><button className="row button-row" key={item.kind+item.code} onClick={()=>go("aircraft")}><div><b>{item.code}</b><span>{item.label || aircraft.find((a)=>a.icao===item.code)?.name || "Open Aircraft Library for details"}</span></div><span>→</span></button>)}
        {!savedAircraft.length && <div className="empty">No saved aircraft types yet.</div>}
      </div></Card>
    </div>
  </>;
}

function Settings({ profile,setProfile }:any) {
  const [dbStatus, setDbStatus] = useState<"checking"|"online"|"offline">("checking");
  const [simbriefId, setSimbriefId] = useState("");
  useEffect(() => {
    fetch("/api/db/health").then((r)=>setDbStatus(r.ok?"online":"offline")).catch(()=>setDbStatus("offline"));
    try { setSimbriefId(localStorage.getItem("aerodeck-simbrief-id") || ""); } catch {}
  }, []);
  const storeSimbriefId = (value:string) => {
    setSimbriefId(value);
    try { localStorage.setItem("aerodeck-simbrief-id", value); } catch {}
  };
  return <>
    <Header eyebrow="PREFERENCES" title="Workspace settings" desc="Set your identity and connect the providers you actually use."/>
    <div className="grid-2">
      <Card><h3>Pilot profile</h3><div className="form-grid two">
        <Field label="Name" value={profile.name} onChange={(v)=>setProfile({...profile,name:v})}/>
        <Field label="Callsign (optional)" value={profile.callsign} onChange={(v)=>setProfile({...profile,callsign:v.toUpperCase()})} placeholder="Enter when relevant"/>
        <Field label="Home airport ICAO" value={profile.home} onChange={(v)=>setProfile({...profile,home:v.toUpperCase()})} placeholder="e.g. EHAM"/>
        <Field label="Preferred simulator" value={profile.sim} onChange={(v)=>setProfile({...profile,sim:v})} placeholder="e.g. MSFS 2024"/>
      </div><p>Callsigns are not generated by AeroDeck. A callsign appears only when you set one or your imported flight plan includes one.</p></Card>
      <Card><h3>Connections</h3>
        <div className="row"><div><b>Database</b><span>Neon PostgreSQL</span></div><Badge tone={dbStatus==="online"?"live":"neutral"}>{dbStatus==="online"?"CONNECTED":dbStatus==="offline"?"OFFLINE":"CHECKING"}</Badge></div>
        <div className="row"><div><b>VATSIM</b><span>Public live network and METAR feeds</span></div><Badge tone="accent">PUBLIC API</Badge></div>
        <div className="row"><div><b>SimBrief</b><span>Uses the username or Pilot ID you enter</span></div><Badge tone="accent">ON DEMAND</Badge></div>
        <div className="row"><div><b>NewSky</b><span>Requires a server-side airline API key</span></div><Badge tone="neutral">SETUP REQUIRED</Badge></div>
      </Card>
      <Card><h3>SimBrief shortcut</h3><p>Save the identifier you normally use. It is stored in this browser, not sent anywhere until you import an OFP.</p><Field label="SimBrief username or numeric Pilot ID" value={simbriefId} onChange={storeSimbriefId} placeholder="Username / Pilot ID"/></Card>
    </div>
  </>;
}

function hours(fs:Flight[]) {
  return fs.reduce((sum,f)=>{ const match=String(f.duration||"").trim().match(/^(\d{1,3}):([0-5]\d)$/); if(!match)return sum; return sum+Number(match[1])+Number(match[2])/60; },0).toFixed(1);
}
function bestLanding(fs:Flight[]) {
  const values = fs
    .map((flight) => String(flight.landing || "").match(/-?\d+(?:\.\d+)?/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => Number(match[0]))
    .filter((value) => Number.isFinite(value));
  if (!values.length) return "—";
  const best = values.sort((a, b) => Math.abs(a) - Math.abs(b))[0];
  return best + " fpm";
}