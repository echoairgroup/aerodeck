'use client';

import { useEffect, useMemo, useState, type ReactNode } from "react";

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
};

const nav = [
  ["dashboard", "Dashboard", "⌂"],
  ["flight", "Flight Center", "✈"],
  ["simbrief", "SimBrief", "▣"],
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

function defaultFlights(): Flight[] {
  return [{
    id: "seed",
    callsign: "ECV412",
    aircraft: "A21N",
    from: "EDDL",
    to: "LGSM",
    duration: "02:48",
    landing: "-142 fpm",
    date: "2026-10-25",
    notes: "Greek Islands Discovery",
  }];
}

export default function AeroDeck() {
  const [section, setSection] = useState("dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [flights, setFlights] = useState<Flight[]>(defaultFlights());
  const [profile, setProfile] = useState({ name: "Christian", callsign: "ECV412", home: "EDDL", sim: "MSFS 2024" });
  const [favorites, setFavorites] = useState<string[]>(["EHAM", "EDDL", "LGSM", "A21N"]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [db, setDb] = useState("checking");
  const [cloudLoaded, setCloudLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aerodeck-state");
      if (raw) {
        const state = JSON.parse(raw);
        if (Array.isArray(state.flights)) setFlights(state.flights);
        if (state.profile) setProfile(state.profile);
        if (Array.isArray(state.favorites)) setFavorites(state.favorites);
        if (state.notes) setNotes(state.notes);
      }
    } catch {}
    fetch("/api/db/health").then((r) => setDb(r.ok ? "online" : "offline")).catch(() => setDb("offline"));
    fetch("/api/state").then(async (r) => {
      if (!r.ok) throw new Error("cloud unavailable");
      const state = await r.json();
      try {
        if (state.profileJson) setProfile(JSON.parse(state.profileJson));
        if (state.flightsJson) setFlights(JSON.parse(state.flightsJson));
        if (state.favoritesJson) setFavorites(JSON.parse(state.favoritesJson));
        if (state.notesJson) setNotes(JSON.parse(state.notesJson));
        setDb("online");
      } catch {}
    }).catch(() => {}).finally(() => setCloudLoaded(true));
  }, []);

  useEffect(() => {
    localStorage.setItem("aerodeck-state", JSON.stringify({ flights, profile, favorites, notes }));
    if (!cloudLoaded) return;
    const timer = window.setTimeout(() => {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flights, profile, favorites, notes }),
      }).catch(() => {});
    }, 500);
    return () => window.clearTimeout(timer);
  }, [flights, profile, favorites, notes, cloudLoaded]);

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

  const go = (id: string) => {
    setSection(id);
    window.history.replaceState({}, "", id === "dashboard" ? "/" : "/" + id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const a = airports
      .filter((x) => (x.icao + " " + x.iata + " " + x.name + " " + x.city).toLowerCase().includes(q))
      .map((x) => ({ type: "Airport", title: x.icao + " · " + x.name, meta: x.city }));
    const ac = aircraft
      .filter((x) => (x.icao + " " + x.name + " " + x.family).toLowerCase().includes(q))
      .map((x) => ({ type: "Aircraft", title: x.icao + " · " + x.name, meta: x.family }));
    const k = terms
      .filter((x) => (x[0] + " " + x[1]).toLowerCase().includes(q))
      .map((x) => ({ type: "Knowledge", title: x[0], meta: x[1] }));
    return [...a, ...ac, ...k].slice(0, 12);
  }, [search]);

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
            <button className="profile" onClick={() => go("settings")}><span>{profile.name.slice(0, 1).toUpperCase()}</span><b>{profile.name}<small>{profile.callsign}</small></b></button>
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
            {search && <div className="results">{searchResults.length ? searchResults.map((result, i) => <button key={i} onClick={() => { setSearchOpen(false); go(result.type === "Airport" ? "airports" : result.type === "Aircraft" ? "aircraft" : "knowledge"); }}><span>{result.type}</span><b>{result.title}</b><small>{result.meta}</small></button>) : <div className="empty">No results.</div>}</div>}
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
  if (props.section === "airports") return <Airports {...props} />;
  if (props.section === "aircraft") return <Aircraft {...props} />;
  if (props.section === "weather") return <Weather />;
  if (props.section === "vatsim") return <Vatsim />;
  if (props.section === "training") return <Training />;
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

function Dashboard({ flights, profile, go }: any) {
  const [network, setNetwork] = useState<any>(null);
  const [weather, setWeather] = useState<any[]>([]);
  const f = flights[0];
  useEffect(() => {
    fetch("/api/vatsim").then((r) => r.json()).then(setNetwork).catch(() => {});
    fetch("/api/metar?icao=EDDL,EHAM,LGSM").then((r) => r.json()).then((d) => setWeather(d.items || [])).catch(() => {});
  }, []);
  return <>
    <Header eyebrow="FLIGHT SIMULATION COMMAND CENTER" title={"Welcome back, " + profile.name} desc="Your flight planning, weather, network, training and logbook workspace." action={<div className="actions"><button className="btn" onClick={() => go("flight")}>+ New flight</button><button className="btn primary" onClick={() => go("simbrief")}>Import SimBrief</button></div>} />
    <div className="hero-grid">
      <Card className="hero-card">
        <div className="card-head"><div><small>ACTIVE / NEXT FLIGHT</small><h2>{f.from} <span>→</span> {f.to}</h2><p>{f.callsign} · {f.aircraft} · {f.duration} · {f.notes}</p></div><Badge tone="live">READY</Badge></div>
        <div className="route-strip"><div><b>{f.from}</b><span>DEPARTURE</span></div><i>✈</i><div><b>{f.to}</b><span>DESTINATION</span></div></div>
        <div className="stat-grid four"><Stat label="Aircraft" value={f.aircraft}/><Stat label="Network" value="VATSIM" accent/><Stat label="Cruise" value="FL350"/><Stat label="Landing" value={f.landing}/></div>
        <div className="actions"><button className="btn" onClick={() => go("flight")}>Open flight</button><button className="btn ghost" onClick={() => go("calculators")}>Flight tools</button></div>
      </Card>
      <Card><small>VATSIM NETWORK</small><div className="big-number">{network?.general?.connected_clients?.toLocaleString() || "—"}</div><p>Connected clients</p><div className="mini-stats"><span><b>{network?.pilots?.length || "—"}</b>Pilots</span><span><b>{network?.controllers?.length || "—"}</b>Controllers</span></div><button className="btn full" onClick={() => go("vatsim")}>Open live network</button></Card>
    </div>
    <div className="stat-grid four"><Stat label="Flights logged" value={flights.length}/><Stat label="Approx. hours" value={hours(flights)}/><Stat label="Favorite airports" value="3"/><Stat label="Training progress" value="42%" accent/></div>
    <div className="grid-3">
      <Card><div className="card-head"><div><small>QUICK ACTIONS</small><h3>Flight tools</h3></div></div><div className="quick-actions">{[["Flight Center","flight","✈"],["Weather","weather","◌"],["VATSIM","vatsim","◎"],["Calculators","calculators","∑"],["Logbook","logbook","▤"],["Training","training","◆"]].map((x) => <button key={x[1]} onClick={() => go(x[1])}><i>{x[2]}</i><b>{x[0]}</b></button>)}</div></Card>
      <Card><div className="card-head"><div><small>FAVORITE WEATHER</small><h3>Current reports</h3></div><button className="link" onClick={() => go("weather")}>Open</button></div><div className="list">{weather.slice(0,3).map((m:any) => <div className="row" key={m.id}><div><b>{m.id}</b><span>{m.metar || "No report"}</span></div><Badge tone="live">LIVE</Badge></div>)}</div></Card>
      <Card><div className="card-head"><div><small>TRAINING</small><h3>Continue learning</h3></div><button className="link" onClick={() => go("training")}>View all</button></div><div className="lesson"><b>METAR Basics</b><span>2 / 5 lessons</span></div><div className="progress"><i style={{width:"42%"}} /></div><button className="btn full" onClick={() => go("training")}>Continue lesson</button></Card>
    </div>
  </>;
}

function FlightCenter({ flights, setFlights, go, notify }: any) {
  const [f, setF] = useState({ callsign:"ECV412", aircraft:"A21N", from:"EDDL", to:"LGSM", duration:"02:48", landing:"", date:new Date().toISOString().slice(0,10), notes:"" });
  const add = () => {
    if (!f.callsign || !f.from || !f.to) return notify("Fill callsign, departure and destination");
    setFlights([{ id: crypto.randomUUID(), ...f }, ...flights]);
    notify("Flight saved");
    go("logbook");
  };
  return <><Header eyebrow="FLIGHT CENTER" title="Build your next flight" desc="Create a flight manually or import a SimBrief operational flight plan." action={<button className="btn primary" onClick={() => go("simbrief")}>Import SimBrief OFP</button>} /><div className="grid-2"><Card><div className="card-head"><div><small>NEW FLIGHT</small><h3>Flight setup</h3></div></div><div className="form-grid two"><Field label="Callsign" value={f.callsign} onChange={(v)=>setF({...f,callsign:v})}/><Field label="Aircraft" value={f.aircraft} onChange={(v)=>setF({...f,aircraft:v.toUpperCase()})}/><Field label="Departure" value={f.from} onChange={(v)=>setF({...f,from:v.toUpperCase()})}/><Field label="Destination" value={f.to} onChange={(v)=>setF({...f,to:v.toUpperCase()})}/><Field label="Flight time" value={f.duration} onChange={(v)=>setF({...f,duration:v})} placeholder="02:35"/><Field label="Landing rate" value={f.landing} onChange={(v)=>setF({...f,landing:v})} placeholder="-120 fpm"/></div><label className="field"><span>Notes</span><textarea value={f.notes} onChange={(e)=>setF({...f,notes:e.target.value})} placeholder="Trip, event, route notes…"/></label><button className="btn primary full" onClick={add}>Save flight</button></Card><Card><small>RECENT FLIGHTS</small><h3>Planning history</h3><div className="list">{flights.slice(0,8).map((x:Flight)=><div className="row" key={x.id}><div><b>{x.callsign}</b><span>{x.from} → {x.to} · {x.aircraft}</span></div><span className="muted">{x.duration}</span></div>)}</div></Card></div></>;
}

function SimBrief({ notify }: any) {
  const [username, setUsername] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (!username.trim()) return setError("Enter your SimBrief / Navigraph identifier.");
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/simbrief?username=" + encodeURIComponent(username));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Import failed");
      setData(d); notify("Latest OFP imported");
    } catch (e:any) { setError(e.message); } finally { setLoading(false); }
  };
  return <><Header eyebrow="SIMBRIEF" title="Operational Flight Plan" desc="Import your latest OFP on demand and use it as the basis of your AeroDeck briefing."/><Card><div className="inline"><input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="SimBrief / Navigraph username or Pilot ID"/><button className="btn primary" onClick={load} disabled={loading}>{loading ? "Importing…" : "Import latest OFP"}</button></div>{error&&<div className="error">{error}</div>}</Card>{data&&<Card><div className="route-strip"><div><b>{data.origin?.icao || data.params?.orig || "----"}</b><span>ORIGIN</span></div><i>→</i><div><b>{data.destination?.icao || data.params?.dest || "----"}</b><span>DESTINATION</span></div></div><div className="stat-grid four"><Stat label="Aircraft" value={data.aircraft?.icaocode || data.params?.type || "—"}/><Stat label="Callsign" value={data.params?.flight || "—"}/><Stat label="Distance" value={data.params?.totaldist ? data.params.totaldist + " nm" : "—"}/><Stat label="Block fuel" value={data.params?.blockfuel ? data.params.blockfuel + " kg" : "—"}/></div><details><summary>Raw OFP data</summary><pre>{JSON.stringify(data,null,2).slice(0,16000)}</pre></details></Card>}</>;
}

function Airports({ favorites, setFavorites, notes, setNotes }: any) {
  const [q,setQ] = useState(""); const [sel,setSel] = useState(airports[0]);
  const list = airports.filter((x) => (x.icao+" "+x.iata+" "+x.name+" "+x.city).toLowerCase().includes(q.toLowerCase()));
  const toggle = () => setFavorites(favorites.includes(sel.icao) ? favorites.filter((x:string)=>x!==sel.icao) : [...favorites,sel.icao]);
  return <><Header eyebrow="AIRPORTS" title="Airport Explorer" desc="Start with a useful curated dataset; live/expanded providers can be added without changing the interface."/><div className="grid-2"><Card><Field label="Search" value={q} onChange={setQ} placeholder="ICAO, IATA, city…"/><div className="list scroll">{list.map((a)=><button className={"row button-row "+(a.icao===sel.icao?"selected":"")} key={a.icao} onClick={()=>setSel(a)}><div><b>{a.icao} · {a.iata}</b><span>{a.name}</span></div><span>{a.runways.length}</span></button>)}</div></Card><Card><div className="card-head"><div><small>AIRPORT PROFILE</small><h3>{sel.icao}</h3></div><button className={"star "+(favorites.includes(sel.icao)?"on":"")} onClick={toggle}>★</button></div><h2>{sel.name}</h2><p>{sel.city}, {sel.country} · {sel.elev} ft</p><div className="stat-grid four"><Stat label="ICAO" value={sel.icao}/><Stat label="IATA" value={sel.iata}/><Stat label="Elevation" value={sel.elev+" ft"}/><Stat label="Runways" value={sel.runways.length}/></div><h4>Runways</h4><div className="chips">{sel.runways.map((r)=><span key={r}>{r}</span>)}</div><label className="field"><span>Private note</span><textarea value={notes[sel.icao] || ""} onChange={(e)=>setNotes({...notes,[sel.icao]:e.target.value})} placeholder="Your airport notes…"/></label></Card></div></>;
}

function Aircraft({ favorites, setFavorites }: any) {
  const [q,setQ] = useState(""); const [sel,setSel] = useState(aircraft[0]);
  const list = aircraft.filter((x) => (x.icao+" "+x.name+" "+x.family).toLowerCase().includes(q.toLowerCase()));
  const toggle = () => setFavorites(favorites.includes(sel.icao) ? favorites.filter((x:string)=>x!==sel.icao) : [...favorites,sel.icao]);
  return <><Header eyebrow="AIRCRAFT" title="Aircraft Library" desc="Simulation-oriented reference pages for the aircraft you fly."/><div className="grid-2"><Card><Field label="Search" value={q} onChange={setQ} placeholder="A320, 737, E190…"/><div className="list scroll">{list.map((a)=><button className={"row button-row "+(a.icao===sel.icao?"selected":"")} key={a.icao} onClick={()=>setSel(a)}><div><b>{a.icao}</b><span>{a.name}</span></div><small>{a.family}</small></button>)}</div></Card><Card><div className="card-head"><div><small>AIRCRAFT PROFILE</small><h3>{sel.icao}</h3></div><button className={"star "+(favorites.includes(sel.icao)?"on":"")} onClick={toggle}>★</button></div><h2>{sel.name}</h2><p>{sel.family}</p><div className="stat-grid three"><Stat label="Range" value={sel.range}/><Stat label="Cruise" value={sel.cruise}/><Stat label="MTOW" value={sel.mtow}/><Stat label="Seats" value={sel.seats}/><Stat label="Engine" value={sel.engine}/></div><div className="notice">Simulation reference only. Verify technical data against current aircraft documentation.</div></Card></div></>;
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

function Training() {
  const [done,setDone] = useState<string[]>([]);
  useEffect(()=>{try{setDone(JSON.parse(localStorage.getItem("aerodeck-training")||"[]"))}catch{}},[]);
  const toggle=(id:string)=>{const next=done.includes(id)?done.filter(x=>x!==id):[...done,id];setDone(next);localStorage.setItem("aerodeck-training",JSON.stringify(next));};
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

function Logbook({ flights,setFlights }:any) {
  const [d,setD]=useState({callsign:"",aircraft:"",from:"",to:"",duration:"",landing:"",date:new Date().toISOString().slice(0,10),notes:""});
  const add=()=>{if(!d.callsign)return;setFlights([{id:crypto.randomUUID(),...d},...flights]);setD({...d,callsign:"",aircraft:"",from:"",to:"",duration:"",landing:"",notes:""});};
  return <><Header eyebrow="LOGBOOK" title="Personal Logbook" desc="Keep your flight history in AeroDeck." action={<button className="btn primary" onClick={add}>Log flight</button>}/><div className="stat-grid four"><Stat label="Flights" value={flights.length}/><Stat label="Approx. hours" value={hours(flights)}/><Stat label="Airports" value={new Set(flights.flatMap((x:Flight)=>[x.from,x.to])).size}/><Stat label="Best landing" value={bestLanding(flights)}/></div><div className="grid-2"><Card><small>NEW ENTRY</small><h3>Log flight</h3><div className="form-grid two"><Field label="Callsign" value={d.callsign} onChange={(v)=>setD({...d,callsign:v})}/><Field label="Aircraft" value={d.aircraft} onChange={(v)=>setD({...d,aircraft:v})}/><Field label="Departure" value={d.from} onChange={(v)=>setD({...d,from:v.toUpperCase()})}/><Field label="Destination" value={d.to} onChange={(v)=>setD({...d,to:v.toUpperCase()})}/><Field label="Duration" value={d.duration} onChange={(v)=>setD({...d,duration:v})}/><Field label="Landing rate" value={d.landing} onChange={(v)=>setD({...d,landing:v})}/></div><label className="field"><span>Notes</span><textarea value={d.notes} onChange={(e)=>setD({...d,notes:e.target.value})}/></label></Card><Card><small>HISTORY</small><h3>Recent flights</h3><div className="list">{flights.map((x:Flight)=><div className="row" key={x.id}><div><b>{x.callsign}</b><span>{x.from} → {x.to} · {x.aircraft}</span></div><span>{x.landing}</span></div>)}</div></Card></div></>;
}

function Favorites({ favorites, go }:any) {
  const as=favorites.filter((x:string)=>airports.some(a=>a.icao===x)); const ac=favorites.filter((x:string)=>aircraft.some(a=>a.icao===x));
  return <><Header eyebrow="SAVED" title="Favorites" desc="Your most-used airports and aircraft."/><div className="grid-2"><Card><h3>Airports</h3><div className="list">{as.map((x:string)=><button className="row button-row" key={x} onClick={()=>go("airports")}><div><b>{x}</b><span>{airports.find(a=>a.icao===x)?.name}</span></div><span>→</span></button>)}</div></Card><Card><h3>Aircraft</h3><div className="list">{ac.map((x:string)=><button className="row button-row" key={x} onClick={()=>go("aircraft")}><div><b>{x}</b><span>{aircraft.find(a=>a.icao===x)?.name}</span></div><span>→</span></button>)}</div></Card></div></>;
}

function Settings({ profile,setProfile }:any) {
  return <><Header eyebrow="SETTINGS" title="Workspace settings" desc="Your pilot identity, simulator and integrations."/><div className="grid-2"><Card><h3>Profile</h3><div className="form-grid two"><Field label="Name" value={profile.name} onChange={(v)=>setProfile({...profile,name:v})}/><Field label="Callsign" value={profile.callsign} onChange={(v)=>setProfile({...profile,callsign:v})}/><Field label="Home airport" value={profile.home} onChange={(v)=>setProfile({...profile,home:v.toUpperCase()})}/><Field label="Simulator" value={profile.sim} onChange={(v)=>setProfile({...profile,sim:v})}/></div></Card><Card><h3>Integrations</h3><div className="row"><div><b>VATSIM</b><span>Public network APIs</span></div><Badge tone="live">READY</Badge></div><div className="row"><div><b>SimBrief</b><span>On-demand OFP import</span></div><Badge tone="accent">READY</Badge></div><div className="row"><div><b>Neon</b><span>Cloud database</span></div><Badge tone="neutral">CONFIGURABLE</Badge></div></Card></div></>;
}

function hours(fs:Flight[]) {
  return fs.reduce((sum,f)=>{ const parts=(f.duration||"0:0").split(":").map(Number); return sum+(parts[0]||0)+(parts[1]||0)/60; },0).toFixed(1);
}
function bestLanding(fs:Flight[]) {
  const values=fs.map(f=>Number(String(f.landing||"").replace(/[^\d-]/g,""))).filter(Number.isFinite);
  return values.length ? Math.min(...values)+" fpm" : "—";
}
