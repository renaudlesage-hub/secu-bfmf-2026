import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, CircleMarker, Tooltip, LayersControl, LayerGroup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { KML_FEATURES, KML_LAYERS } from "./kml-carte";

// GeoJSON = [lon, lat] ; Leaflet = [lat, lon]. Inversion au rendu.
function toLatLng(c) { return [c[1], c[0]]; }
function toLatLngs(arr) { return arr.map(toLatLng); }

// Regroupe les features KML par calque, pour le contrôle de calques.
const PAR_CALQUE = KML_LAYERS.map((nom) => ({
  nom,
  features: KML_FEATURES.filter((f) => f.layer === nom),
}));

/* ---------------------------------------------------------------------
   FOND LEAFLET (OpenStreetMap) — chargé dynamiquement par cartographie.jsx
   uniquement quand le paquet `leaflet` + `react-leaflet` est installé.

   >>> Pour activer ce fond :
       npm install leaflet react-leaflet
   >>> Pour le hors-ligne (PWA), penser à mettre en cache les tuiles OSM
       dans le service worker (workbox runtimeCaching sur
       https://*.tile.openstreetmap.org). Sinon la carte routière n'est
       disponible qu'en ligne — le fond "Parcours" (SVG) reste, lui,
       toujours disponible hors-ligne.

   Ce composant reçoit les incidents déjà chargés (via app_store) et
   remonte les actions au parent : placer (clic) et sélectionner (marqueur).
--------------------------------------------------------------------- */

const CENTRE = [50.3835, 5.6215]; // plaine BFMF (Ferrières)

const COULEURS = { securite: "#f87171", sanitaire: "#22d3ee", logistique: "#fbbf24" };

function iconePour(categorie) {
  const c = COULEURS[categorie] || COULEURS.securite;
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:${c};border:2px solid #0d1117;box-shadow:0 0 0 3px ${c}44"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// Icône SOS : losange rouge, pour le distinguer des incidents (ronds).
function iconeSos() {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;background:#ef4444;border:2px solid #fca5a5;transform:rotate(45deg);box-shadow:0 0 0 4px #ef444455"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

// Icône thématique (emoji) pour un point KML, sur une pastille blanche.
function iconeKml(emoji) {
  return L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:15px;background:rgba(255,255,255,0.92);border:1.5px solid rgba(0,0,0,0.35);border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.4)">${emoji || "📍"}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function ClicHandler({ onPlace }) {
  useMapEvents({
    click(e) {
      onPlace(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CartographieLeaflet({ incidents, sosGeo = [], onPlace, onSelect, onSelectSos }) {
  return (
    <MapContainer center={CENTRE} zoom={15} style={{ height: "70vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
      />
      <ClicHandler onPlace={onPlace} />

      {/* ---- CARTE OFFICIELLE KML (92 éléments, 6 calques activables) ---- */}
      <LayersControl position="topright">
        {PAR_CALQUE.map((calque) => (
          <LayersControl.Overlay key={calque.nom} name={calque.nom} checked>
            <LayerGroup>
              {calque.features.map((f, i) => {
                const stroke = f.lineColor || "#3388ff";
                const fill = f.fillColor || stroke;
                if (f.geom === "polygon") {
                  return (
                    <Polygon
                      key={i}
                      positions={toLatLngs(f.coords[0])}
                      pathOptions={{ color: stroke, weight: f.width || 2, opacity: f.lineOpacity ?? 1, fillColor: fill, fillOpacity: f.fillOpacity ?? 0.2 }}
                    >
                      {f.name && <Tooltip>{f.name}</Tooltip>}
                    </Polygon>
                  );
                }
                if (f.geom === "line") {
                  return (
                    <Polyline
                      key={i}
                      positions={toLatLngs(f.coords)}
                      pathOptions={{ color: stroke, weight: f.width || 3, opacity: f.lineOpacity ?? 0.9 }}
                    >
                      {f.name && <Tooltip sticky>{f.name}</Tooltip>}
                    </Polyline>
                  );
                }
                // point : icône thématique (emoji)
                return (
                  <Marker
                    key={i}
                    position={toLatLng(f.coords)}
                    icon={iconeKml(f.icone)}
                  >
                    {f.name && <Tooltip direction="top" offset={[0, -13]}>{f.name}</Tooltip>}
                    {f.name && <Popup><strong>{f.name}</strong></Popup>}
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        ))}
      </LayersControl>

      {/* SOS participants géolocalisés (losange rouge) */}
      {sosGeo.map((sos) => (
        <Marker
          key={sos.id}
          position={[sos.gps.lat, sos.gps.lon]}
          icon={iconeSos()}
          eventHandlers={{ click: () => onSelectSos && onSelectSos(sos) }}
        >
          <Popup>
            <strong>SOS — {sos.motif || "participant"}</strong>
            <br />
            <span style={{ textTransform: "uppercase", fontSize: "0.8em", color: "#dc2626" }}>{sos.statut || "nouveau"}</span>
            {sos.surTrace && <p style={{ margin: "6px 0 0" }}>km {sos.surTrace.km} · {sos.surTrace.segment}</p>}
          </Popup>
        </Marker>
      ))}

      {/* Incidents placés à la main (ronds colorés) */}
      {incidents.map((inc) => {
        if (typeof inc.lat !== "number" || typeof inc.lon !== "number") return null;
        return (
          <Marker
            key={inc.id}
            position={[inc.lat, inc.lon]}
            icon={iconePour(inc.categorie)}
            eventHandlers={{ click: () => onSelect(inc) }}
          >
            <Popup>
              <strong>{inc.titre}</strong>
              <br />
              <span style={{ textTransform: "uppercase", fontSize: "0.8em", color: "#666" }}>{inc.categorie}</span>
              {inc.description && <p style={{ margin: "6px 0 0" }}>{inc.description}</p>}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}