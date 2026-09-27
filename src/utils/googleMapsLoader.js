/**
 * Google Maps Platform Infrastructure & Geolocation Telemetry Engine
 * HotPot Delights - Kigali Restaurant HQ (24G3+VHX, 11 KK 15 Rd, Kigali)
 */

export const RESTAURANT_COORDINATES = {
  lat: -1.97022762,
  lng: 30.12498964,
  name: 'HotPot Delights Kitchen HQ',
  address: '24G3+VHX, 11 KK 15 Rd, Kigali, Rwanda',
  plusCode: '24G3+VHX Kigali'
};

// High-fidelity Kigali Neighborhood Coordinates Dictionary for instant fallback
export const KIGALI_NEIGHBORHOOD_COORDS = {
  nyarutarama: { lat: -1.9360, lng: 30.0980, name: 'Nyarutarama' },
  kimihurura: { lat: -1.9560, lng: 30.0880, name: 'Kimihurura' },
  kiyovu: { lat: -1.9536, lng: 30.0605, name: 'Kiyovu' },
  kacyiru: { lat: -1.9420, lng: 30.0750, name: 'Kacyiru' },
  remera: { lat: -1.9580, lng: 30.1150, name: 'Remera' },
  gisozi: { lat: -1.9280, lng: 30.0620, name: 'Gisozi' },
  kicukiro: { lat: -1.9800, lng: 30.0950, name: 'Kicukiro' },
  gikondo: { lat: -1.9750, lng: 30.0680, name: 'Gikondo' },
  nyamirambo: { lat: -1.9850, lng: 30.0450, name: 'Nyamirambo' },
  kanombe: { lat: -1.9750, lng: 30.1450, name: 'Kanombe' },
  kagugu: { lat: -1.9150, lng: 30.0850, name: 'Kagugu' },
  kibagabaga: { lat: -1.9320, lng: 30.1180, name: 'Kibagabaga' },
  nyabugogo: { lat: -1.9400, lng: 30.0450, name: 'Nyabugogo' },
  kabeza: { lat: -1.9720, lng: 30.1320, name: 'Kabeza' }
};

/**
 * Resolve coordinates for a given customer delivery address
 */
export function resolveKigaliCoordinates(order) {
  if (order?.lat && order?.lng) {
    return { lat: Number(order.lat), lng: Number(order.lng) };
  }

  const raw = String(order?.deliveryAddress || order?.address || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(KIGALI_NEIGHBORHOOD_COORDS)) {
    if (raw.includes(key)) {
      return { lat: val.lat, lng: val.lng };
    }
  }

  // Default Kigali Delivery Destination (City Center corridor)
  return { lat: -1.9440, lng: 30.0890 };
}

/**
 * Calculate spherical trigonometry bearing / compass heading angle (theta)
 * between two GPS coordinates:
 * theta = atan2(sin(dLng) * cos(lat2), cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng))
 */
export function calculateBearing(lat1, lng1, lat2, lng2) {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360; // Normalize to 0° - 360°
}

/**
 * Calculate Great-Circle Distance between two coordinates in Kilometers (Haversine Formula)
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * High-End Dark Theme Vector Styles for Google Maps Platform (#0F1117 palette)
 */
export const darkGoogleMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#13161F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F1117' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#CBD5E1' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748B' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1A212D' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1E2433' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#141824' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94A3B8' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#2B3245' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1B2130' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F8FAFC' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1E2433' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#F97316' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0A0D14' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38BDF8' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#0F1117' }]
  }
];

let googleMapsPromise = null;

/**
 * Singleton Google Maps JavaScript API Dynamic Loader
 */
export function loadGoogleMapsPlatform(apiKey = '') {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));

  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  googleMapsPromise = new Promise((resolve, reject) => {
    // If no key is set or offline, reject gracefully so fallback canvas/Leaflet vector renders seamlessly
    if (!key) {
      // Still attempt to load if a script is present
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(window.google.maps));
        existingScript.addEventListener('error', () => reject(new Error('Google Maps script failed')));
        return;
      }
      reject(new Error('No Google Maps API Key found in environment'));
      return;
    }

    const scriptId = 'google-maps-platform-script';
    if (document.getElementById(scriptId)) {
      const check = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(check);
          resolve(window.google.maps);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google && window.google.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps script loaded but google.maps is not available'));
      }
    };

    script.onerror = (err) => {
      reject(new Error('Failed to load Google Maps script: ' + err.message));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
