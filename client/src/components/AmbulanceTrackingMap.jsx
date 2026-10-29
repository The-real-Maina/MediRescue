import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for missing default Leaflet icons in React
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// ==========================================
// PASTE YOUR TOMTOM API KEY HERE
// ==========================================
const TOMTOM_API_KEY = 'Wy82pBAQ8dVbXR4X7DDPw89jMsoQrv8t'; 

// Custom Icons
const patientIcon = new L.DivIcon({
  html: '<div style="background-color:#dc2626; width:30px; height:30px; border-radius:50%; display:grid; place-items:center; color:white; font-size:16px; border:3px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.5);">👤</div>',
  className: 'custom-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const ambulanceIcon = new L.DivIcon({
  html: '<div style="background-color:#2563eb; width:35px; height:35px; border-radius:8px; display:grid; place-items:center; color:white; font-size:18px; border:3px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.5);">🚑</div>',
  className: 'custom-icon',
  iconSize: [35, 35],
  iconAnchor: [17, 17]
});

function MapBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function AmbulanceTrackingMap({ caseData }) {
  const [route, setRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isTrafficAware, setIsTrafficAware] = useState(false);

  // Patient location
  const patientPos = caseData?.pickup_lat && caseData?.pickup_lng 
    ? [Number(caseData.pickup_lat), Number(caseData.pickup_lng)] 
    : [-1.286389, 36.817223]; // Fallback to Nairobi

  // Ambulance location (if the backend doesn't send this yet, we mock it slightly offset for testing)
  const ambulancePos = caseData?.ambulance_lat && caseData?.ambulance_lng
    ? [Number(caseData.ambulance_lat), Number(caseData.ambulance_lng)]
    : [patientPos[0] + 0.01, patientPos[1] + 0.01]; 

  const hospitalPos = caseData?.hospital_lat && caseData?.hospital_lng
    ? [Number(caseData.hospital_lat), Number(caseData.hospital_lng)]
    : null;

  useEffect(() => {
    if (!ambulancePos || !patientPos) return;

    const fetchRoute = async () => {
      try {
        // ==========================================
        // 1. TRAFFIC-AWARE ROUTING (TomTom)
        // ==========================================
        if (TOMTOM_API_KEY && TOMTOM_API_KEY !== 'YOUR_TOMTOM_API_KEY_HERE') {
          // TomTom uses [lat, lng] for routing requests
          const url = `https://api.tomtom.com/routing/1/calculateRoute/${ambulancePos[0]},${ambulancePos[1]}:${patientPos[0]},${patientPos[1]}/json?key=${TOMTOM_API_KEY}&traffic=true&travelMode=car`;
          
          const res = await fetch(url);
          const data = await res.json();

          if (data.routes && data.routes.length > 0) {
            const routeData = data.routes[0];
            
            // TomTom returns time in seconds, distance in meters
            setEta(Math.ceil(routeData.summary.travelTimeInSeconds / 60));
            setDistance((routeData.summary.lengthInMeters / 1000).toFixed(1));
            
            // TomTom returns points as [{latitude, longitude}], we need [lat, lng]
            const points = routeData.legs[0].points.map(p => [p.latitude, p.longitude]);
            setRoute(points);
            setIsTrafficAware(true);
            return;
          }
        }

        // ==========================================
        // 2. FALLBACK ROUTING (OSRM - No Traffic Data)
        // ==========================================
        console.warn("Using OSRM fallback. Add a TomTom API key for traffic-aware routing.");
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${ambulancePos[1]},${ambulancePos[0]};${patientPos[1]},${patientPos[0]}?overview=full&geometries=geojson`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();

        if (osrmData.routes && osrmData.routes.length > 0) {
          const routeData = osrmData.routes[0];
          setEta(Math.ceil(routeData.duration / 60));
          setDistance((routeData.distance / 1000).toFixed(1));
          
          const coords = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(coords);
          setIsTrafficAware(false);
        }
      } catch (err) {
        console.error("Failed to fetch route:", err);
      }
    };

    fetchRoute();
  }, [ambulancePos[0], ambulancePos[1], patientPos[0], patientPos[1]]);

  const bounds = [ambulancePos, patientPos];
  if (hospitalPos) bounds.push(hospitalPos);

  const hasTomTomKey = TOMTOM_API_KEY && TOMTOM_API_KEY !== 'YOUR_TOMTOM_API_KEY_HERE';

  return (
    <div style={{ position: 'relative', height: '400px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', zIndex: 0 }}>
      
      {/* ETA OVERLAY BOX */}
      {eta !== null && (
        <div style={{
          position: 'absolute',
          top: '15px',
          right: '15px',
          zIndex: 1000,
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          borderLeft: isTrafficAware ? '5px solid #10b981' : '5px solid #2563eb',
          minWidth: '150px'
        }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
            Ambulance ETA
          </div>
          <div style={{ fontSize: '28px', color: '#10243a', fontWeight: '900', margin: '4px 0' }}>
            {eta} min
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {distance} km away
          </div>
          {isTrafficAware && (
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginTop: '6px' }}>
              ✓ Traffic Avoided
            </div>
          )}
        </div>
      )}

      <MapContainer 
        center={ambulancePos} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        {/* BASE MAP */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* LIVE TRAFFIC OVERLAY (Only loads if TomTom key exists) */}
        {hasTomTomKey && (
          <TileLayer
            url={`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`}
            opacity={0.6} // Transparent so you can still see street names
          />
        )}
        
        <MapBounds bounds={bounds} />

        <Marker position={ambulancePos} icon={ambulanceIcon}>
          <Popup>Ambulance Current Location</Popup>
        </Marker>

        <Marker position={patientPos} icon={patientIcon}>
          <Popup>Patient Pickup Location</Popup>
        </Marker>

        {hospitalPos && (
          <Marker position={hospitalPos}>
            <Popup>Hospital</Popup>
          </Marker>
        )}

        {/* ROUTE LINE */}
        {route.length > 0 && (
          <Polyline 
            positions={route} 
            color={isTrafficAware ? "#10b981" : "#2563eb"} // Green if traffic-aware, Blue if standard
            weight={5} 
            opacity={0.8} 
          />
        )}
      </MapContainer>
    </div>
  );
}