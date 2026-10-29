const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OSRM_TIMEOUT_MS = 4000;
const FALLBACK_SPEED_KMH = 40;
const CACHE_TTL_MS = 8000;

const routeCache = new Map();

// Straight-line distance in km (haversine)
function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Road route from OSRM (returns null if unavailable)
async function getRoadRoute(fromLat, fromLng, toLat, toLng) {
  if (typeof fetch !== 'function') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

  try {
    const url =
      `${OSRM_URL}/${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson`;

    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;

    const data = await response.json();
    const route = data.routes && data.routes[0];

    if (data.code !== 'Ok' || !route) return null;

    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      // GeoJSON is [lng, lat]; Leaflet wants [lat, lng]
      path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Distance and ETA: OSRM first, straight-line fallback
async function calculateEta(caseId, fromLat, fromLng, toLat, toLng) {
  const key = `${caseId}:${fromLat.toFixed(4)},${fromLng.toFixed(4)}`;
  const cached = routeCache.get(key);

  if (cached && Date.now() - cached.time < CACHE_TTL_MS) {
    return cached.value;
  }

  let value;
  const road = await getRoadRoute(fromLat, fromLng, toLat, toLng);

  if (road) {
    value = {
      distanceKm: road.distanceKm,
      etaMinutes: road.durationMinutes,
      path: road.path,
      source: 'road'
    };
  } else {
    const km = haversineKm(fromLat, fromLng, toLat, toLng);

    value = {
      distanceKm: km,
      etaMinutes: (km / FALLBACK_SPEED_KMH) * 60,
      path: [],
      source: 'straight_line'
    };
  }

  if (routeCache.size > 200) routeCache.clear();
  routeCache.set(key, { time: Date.now(), value });

  return value;
}

module.exports = { calculateEta };