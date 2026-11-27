import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useAuth } from '@/services/AuthContext';
import { API_BASE_URL } from '@/constants/api';

const COLORS = {
  background: '#081321',
  surface: '#122238',
  surfaceLight: '#1A304A',
  primary: '#E63946',
  white: '#FFFFFF',
  muted: '#9FB0C3',
  green: '#35C98A',
  border: '#263C54',
  warning: '#F5B942',
};

const POLL_INTERVAL_MS = 10000;
const STALE_AFTER_SECONDS = 120;

interface LatLng {
  lat: number;
  lng: number;
}

interface ActiveCase {
  id: number;
  status: string;
}

interface TrackingResponse {
  tracking: boolean;
  status: string;
  plate_number?: string | null;
  ambulance?: {
    plate_number: string | null;
    lat: number;
    lng: number;
    updated_at: string | null;
    age_seconds: number | null;
  } | null;
  pickup?: LatLng | null;
  eta?: {
    minutes: number;
    arrival_time: string;
    distance_km: number;
    source: string;
  } | null;
  route?: unknown;
  reason?: string;
}

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html, body, #map { height: 100%; margin: 0; background: #0b1626; }
  .pin { font-size: 26px; line-height: 30px; text-align: center; }
  .msg { color: #ffffff; font-family: sans-serif; padding: 24px; font-size: 14px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  if (typeof L === 'undefined') {
    document.body.innerHTML = '<div class="msg">The map could not be loaded. Check your internet connection.</div>';
    window.updateMap = function () {};
    window.recenter = function () {};
    return;
  }

  var map = L.map('map').setView([0.0236, 37.9062], 6);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var ambulanceMarker = null;
  var pickupMarker = null;
  var routeLine = null;
  var fitted = false;

  function makeIcon(emoji) {
    return L.divIcon({
      className: '',
      html: '<div class="pin">' + emoji + '</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  }

  function popupText(text) {
    var el = document.createElement('div');
    el.textContent = text;
    return el;
  }

  function fit() {
    var points = [];
    if (ambulanceMarker) points.push(ambulanceMarker.getLatLng());
    if (pickupMarker) points.push(pickupMarker.getLatLng());

    if (points.length === 1) {
      map.setView(points[0], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [50, 50] });
    }
  }

  window.updateMap = function (d) {
    if (d.pickup) {
      var p = [d.pickup.lat, d.pickup.lng];
      if (!pickupMarker) {
        pickupMarker = L.marker(p, { icon: makeIcon('📍') }).addTo(map);
        pickupMarker.bindPopup(popupText('Your pickup location'));
      } else {
        pickupMarker.setLatLng(p);
      }
    }

    if (d.ambulance) {
      var a = [d.ambulance.lat, d.ambulance.lng];
      if (!ambulanceMarker) {
        ambulanceMarker = L.marker(a, { icon: makeIcon('🚑') }).addTo(map);
      } else {
        ambulanceMarker.setLatLng(a);
      }
      ambulanceMarker.bindPopup(popupText(d.ambulance.label || 'Ambulance'));
    }

    if (routeLine) {
      map.removeLayer(routeLine);
      routeLine = null;
    }

    if (d.route && d.route.length > 1) {
      routeLine = L.polyline(d.route, { color: '#E63946', weight: 4 }).addTo(map);
    } else if (d.ambulance && d.pickup) {
      routeLine = L.polyline(
        [[d.ambulance.lat, d.ambulance.lng], [d.pickup.lat, d.pickup.lng]],
        { color: '#E63946', weight: 3, dashArray: '6 8' }
      ).addTo(map);
    }

    if (!fitted && (ambulanceMarker || pickupMarker)) {
      fit();
      fitted = true;
    }
  };

  window.recenter = fit;
})();
</script>
</body>
</html>`;

const distanceSquared = (point: [number, number], ref: LatLng) =>
  (point[0] - ref.lat) ** 2 + (point[1] - ref.lng) ** 2;

function normalizeRoute(raw: unknown, refs: LatLng[]): [number, number][] {
  if (!Array.isArray(raw)) return [];

  const points: [number, number][] = [];

  for (const item of raw) {
    let a: number;
    let b: number;

    if (Array.isArray(item)) {
      a = Number(item[0]);
      b = Number(item[1]);
    } else if (item && typeof item === 'object') {
      const o = item as Record<string, unknown>;
      a = Number(o.lat ?? o.latitude);
      b = Number(o.lng ?? o.lon ?? o.longitude);
    } else {
      continue;
    }

    if (Number.isFinite(a) && Number.isFinite(b)) {
      points.push([a, b]);
    }
  }

  if (points.length < 2) return [];

  if (refs.length > 0) {
    const first = points[0];
    const direct = Math.min(...refs.map((r) => distanceSquared(first, r)));
    const flipped = Math.min(
      ...refs.map((r) => distanceSquared([first[1], first[0]], r)),
    );

    if (flipped < direct) {
      return points.map(([x, y]) => [y, x] as [number, number]);
    }
  }

  return points;
}

const STATUS_MESSAGES: Record<string, string> = {
  requested:
    'Your request has been received. An ambulance will be assigned soon.',
  picked_up: 'You have been picked up and are on the way to the hospital.',
  arrived_at_hospital: 'You have arrived at the hospital.',
  handed_over: 'You are being cared for by the hospital team.',
  in_treatment: 'You are being cared for by the hospital team.',
  payment_pending: 'Treatment is complete. Payment is now pending.',
};

const formatStatus = (status: string) =>
  status.replace(/_/g, ' ').toUpperCase();

export default function LiveTrackingScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCase, setActiveCase] = useState<ActiveCase | null>(null);
  const [tracking, setTracking] = useState<TrackingResponse | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const authenticatedFetch = useCallback(
    async (url: string) => {
      if (!token) {
        throw new Error('Your session has expired. Please log in again.');
      }

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const responseText = await response.text();

      let data: any;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}).`,
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error || data.message || `Request failed (${response.status}).`,
        );
      }

      return data;
    },
    [token],
  );

  useFocusEffect(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;

      const tick = async () => {
        try {
          const cases = await authenticatedFetch(`${API_BASE_URL}/cases`);

          if (cancelled) return;

          const list: any[] = Array.isArray(cases) ? cases : [];

          const dispatched = list.find((item) => item.status === 'dispatched');
          const active =
            dispatched ??
            list.find((item) => !['paid', 'closed'].includes(item.status)) ??
            null;

          if (!active) {
            setActiveCase(null);
            setTracking(null);
          } else {
            setActiveCase({ id: Number(active.id), status: active.status });

            if (active.status === 'dispatched') {
              const data = (await authenticatedFetch(
                `${API_BASE_URL}/tracking/case/${active.id}`,
              )) as TrackingResponse;

              if (cancelled) return;

              setTracking(data);
            } else {
              setTracking(null);
            }
          }

          setError('');
        } catch (err) {
          if (!cancelled) {
            console.error('Live tracking error:', err);

            setError(
              err instanceof Error
                ? err.message
                : 'Unable to load tracking details.',
            );
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
            timer = setTimeout(tick, POLL_INTERVAL_MS);
          }
        }
      };

      tick();

      return () => {
        cancelled = true;

        if (timer) clearTimeout(timer);
      };
    }, [authenticatedFetch, reloadKey]),
  );

  const isTracking = Boolean(tracking?.tracking);

  // Fixed: Use a timeout to avoid the React setState-in-effect warning
  useEffect(() => {
    if (!isTracking) {
      const timer = setTimeout(() => setMapReady(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isTracking]);

  useEffect(() => {
    if (!mapReady || !tracking || !tracking.tracking) return;

    const refs: LatLng[] = [];

    if (tracking.ambulance) refs.push(tracking.ambulance);
    if (tracking.pickup) refs.push(tracking.pickup);

    const payload = {
      ambulance: tracking.ambulance
        ? {
            lat: tracking.ambulance.lat,
            lng: tracking.ambulance.lng,
            label: tracking.ambulance.plate_number
              ? `Ambulance ${tracking.ambulance.plate_number}`
              : 'Ambulance',
          }
        : null,
      pickup: tracking.pickup ?? null,
      route: normalizeRoute(tracking.route, refs),
    };

    webViewRef.current?.injectJavaScript(
      `window.updateMap(${JSON.stringify(payload)}); true;`,
    );
  }, [mapReady, tracking]);

  const recenter = () => {
    webViewRef.current?.injectJavaScript('window.recenter(); true;');
  };

  const formatArrival = (iso: string) => {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderTrackingPanel = (data: TrackingResponse) => {
    const age = data.ambulance?.age_seconds ?? null;
    const stale = age !== null && age > STALE_AFTER_SECONDS;
    const plate = data.ambulance?.plate_number || data.plate_number;

    return (
      <View style={styles.panel}>
        {data.eta ? (
          <View style={styles.etaRow}>
            <View>
              <Text style={styles.etaLabel}>ESTIMATED ARRIVAL</Text>
              <Text style={styles.etaValue}>{data.eta.minutes} min</Text>
            </View>

            <View style={styles.etaRight}>
              <Text style={styles.etaDetail}>
                {data.eta.distance_km} km away
              </Text>
              <Text style={styles.etaDetail}>
                Arrives about {formatArrival(data.eta.arrival_time)}
              </Text>
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.etaLabel}>AMBULANCE ON THE WAY</Text>
            <Text style={styles.waitingText}>
              {data.reason === 'waiting_for_driver_gps'
                ? 'Waiting for the driver’s GPS location. The map updates as soon as it arrives.'
                : data.reason === 'pickup_location_missing'
                  ? 'Your pickup location is missing for this request, so the arrival time cannot be calculated.'
                  : 'Calculating the arrival time…'}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          {!!plate && <Text style={styles.metaText}>🚑 {plate}</Text>}

          {age !== null && (
            <Text style={[styles.metaText, stale && styles.metaStale]}>
              {stale
                ? 'Location not updated recently'
                : `Updated ${age < 5 ? 'just now' : `${age}s ago`}`}
            </Text>
          )}
        </View>

        {!!error && (
          <Text style={styles.retryNote}>
            Connection problem. Trying again…
          </Text>
        )}
      </View>
    );
  };

  const renderMessageCard = (title: string, text: string) => (
    <View style={styles.centerWrap}>
      <View style={styles.messageCard}>
        <Text style={styles.messageIcon}>📍</Text>
        <Text style={styles.messageTitle}>{title}</Text>
        <Text style={styles.messageText}>{text}</Text>
      </View>
    </View>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (error && !activeCase) {
      return (
        <View style={styles.centerWrap}>
          <View style={styles.messageCard}>
            <Text style={styles.messageTitle}>Unable to load tracking</Text>
            <Text style={styles.messageText}>{error}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                setReloadKey((key) => key + 1);
              }}
            >
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (!activeCase) {
      return renderMessageCard(
        'No active emergency',
        'Live tracking is available while an ambulance is on its way to you.',
      );
    }

    if (tracking && tracking.tracking) {
      return (
        <View style={styles.trackingWrap}>
          <View style={styles.mapWrap}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              // @ts-ignore (Fixes the TS error with React Native WebView)
              source={{
                html: MAP_HTML,
                baseUrl: 'https://medirescue.onrender.com',
              }}
              javaScriptEnabled
              domStorageEnabled
              onLoadEnd={() => setMapReady(true)}
              style={styles.map}
            />

            <TouchableOpacity style={styles.recenterButton} onPress={recenter}>
              <Text style={styles.recenterText}>Recenter</Text>
            </TouchableOpacity>
          </View>

          {renderTrackingPanel(tracking)}
        </View>
      );
    }

    return renderMessageCard(
      `Case #${activeCase.id} · ${formatStatus(activeCase.status)}`,
      STATUS_MESSAGES[activeCase.status] ??
        'Live tracking is only available while an ambulance is on its way to you.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Live Tracking</Text>
          <Text style={styles.subtitle}>Track your ambulance</Text>
        </View>
      </View>

      {renderBody()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: COLORS.white,
    fontSize: 20,
  },
  title: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  messageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 26,
    alignItems: 'center',
  },
  messageIcon: {
    fontSize: 38,
    marginBottom: 12,
  },
  messageTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messageText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 9,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 11,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  trackingWrap: {
    flex: 1,
  },
  mapWrap: {
    flex: 1,
  },
  map: {
    flex: 1,
    backgroundColor: '#0B1626',
  },
  recenterButton: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  recenterText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 18,
    gap: 12,
  },
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  etaLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  etaValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  etaRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  etaDetail: {
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  waitingText: {
    color: COLORS.warning,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  metaStale: {
    color: COLORS.warning,
  },
  retryNote: {
    color: COLORS.warning,
    fontSize: 11,
  },
});