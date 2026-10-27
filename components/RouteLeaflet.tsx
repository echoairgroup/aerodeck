"use client";

import { useEffect } from "react";
import { latLngBounds } from "leaflet";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";

export type RoutePoint = { label: string; lat: number; lon: number };

function FitRouteBounds({ points }: { points: RoutePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(latLngBounds(points.map((point) => [point.lat, point.lon])), { padding: [28, 28], maxZoom: 7 });
  }, [map, points]);
  return null;
}

export function RouteLeaflet({ points, sourceName }: { points: RoutePoint[]; sourceName: string }) {
  if (points.length < 3) {
    return <div className="notice">{sourceName} did not supply enough route waypoints with coordinates. AeroDeck will not invent a path.</div>;
  }

  const positions = points.map((point) => [point.lat, point.lon] as [number, number]);
  return <div className="route-map route-map-leaflet">
    <MapContainer
      center={positions[0]}
      zoom={4}
      scrollWheelZoom={false}
      style={{ height: 310, width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitRouteBounds points={points} />
      <Polyline positions={positions} pathOptions={{ color: "#167fb7", weight: 3, opacity: 0.92 }} />
      {points.map((point, index) => <CircleMarker
        key={point.label + "-" + index}
        center={[point.lat, point.lon]}
        radius={index === 0 || index === points.length - 1 ? 6 : 3}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: index === 0 ? "#16836f" : index === points.length - 1 ? "#c47c28" : "#167fb7",
          fillOpacity: 1
        }}
      >
        <Tooltip>{point.label || "Route point"}</Tooltip>
      </CircleMarker>)}
    </MapContainer>
    <div className="route-map-caption">{points.length} coordinates · supplied by {sourceName} · map data © OpenStreetMap contributors</div>
  </div>;
}
