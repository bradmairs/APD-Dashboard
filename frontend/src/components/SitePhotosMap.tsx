import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SiteVisitPhoto } from "../types";
import { siteVisitPhotoFileUrl } from "../api";
import { formatDateTime } from "../format";

// A real slippy map — unlike this app's other charts, map tiles can't be
// hand-rolled in SVG, so this is the one component that reaches for a
// mapping library (Leaflet) and a tile provider (OpenStreetMap, no API key
// needed). The marker is a small inline-SVG pin via a Leaflet divIcon rather
// than Leaflet's bundled marker images, which avoids the well-known bundler
// asset-path issue with Icon.Default (its image URLs are relative to
// leaflet's own package, not the built app).
const PIN_ICON = L.divIcon({
  className: "",
  html: `<svg width="28" height="38" viewBox="0 0 28 38" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 24 14 24s14-13.5 14-24C28 6.3 21.7 0 14 0z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5.5" fill="#ffffff"/>
  </svg>`,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -34],
});

interface Props {
  photos: SiteVisitPhoto[];
}

export default function SitePhotosMap({ photos }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);

  const geotagged = photos.filter(
    (p): p is SiteVisitPhoto & { latitude: number; longitude: number } =>
      p.latitude !== null && p.longitude !== null
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [0, 0],
      zoom: 2,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    markersRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markersRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    if (geotagged.length === 0) return;

    const bounds = L.latLngBounds(geotagged.map((p) => [p.latitude, p.longitude]));
    geotagged.forEach((photo) => {
      const marker = L.marker([photo.latitude, photo.longitude], { icon: PIN_ICON });
      const popupHtml = `
        <div style="min-width:160px">
          <img src="${siteVisitPhotoFileUrl(photo.id)}" alt="${photo.originalName}"
               style="width:100%;max-width:200px;height:120px;object-fit:cover;border-radius:4px;display:block;margin-bottom:6px" />
          <div class="text-xs font-semibold text-slate-900 dark:text-slate-100">${escapeHtml(
            photo.siteVisit?.location ?? ""
          )}</div>
          <div class="text-xs text-slate-500 dark:text-slate-400">${
            photo.siteVisit ? formatDateTime(photo.siteVisit.visitDate) : ""
          }</div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      marker.addTo(markerGroup);
    });

    map.fitBounds(bounds.pad(0.2), { maxZoom: 17 });
    setTimeout(() => map.invalidateSize(), 0);
  }, [geotagged]);

  if (photos.length === 0) {
    return null;
  }

  if (geotagged.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 py-3">
        {photos.length} photo{photos.length === 1 ? "" : "s"} logged, but none have
        location data yet — take a new photo with location services enabled to see it
        here.
      </p>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="w-full h-72 rounded-lg border border-slate-200 dark:border-slate-700 z-0"
      />
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
        {geotagged.length} of {photos.length} photo{photos.length === 1 ? "" : "s"} have
        location data and are shown on the map.
      </p>
    </div>
  );
}

function escapeHtml(value: string): string {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}
