// Device-aware GPS scanning service
//
// Scans directly where the device actually is: uses watchPosition so the
// browser keeps streaming location fixes (rather than one cached read) and we
// return the freshest, most accurate fix once GPS settles.

export function reverseGeocode(lat, lng) {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`
  ).then((res) => res.json());
}

// Build a real, human-readable street address from the reverse-geocode response
// (house number + road, sector/neighbourhood, district, province, country)
export function formatAddress(data) {
  const a = data && data.address;
  if (!a) return '';
  const road = a.road || a.pedestrian || a.footway || '';
  const line1 = a.house_number && road ? `${a.house_number} ${road}` : road || a.neighbourhood || a.suburb || '';
  const parts = [
    line1,
    a.suburb,
    a.city_district,
    a.city || a.town || a.village,
    a.state || a.province || a.region,
    a.country,
  ].filter((x) => x && String(x).trim());
  return parts.filter((x, i) => parts.indexOf(x) === i).join(', ');
}

export function getGeolocationErrorMessage(err) {
  switch (err && err.code) {
    case 1:
      return 'Location permission is blocked. Please allow location access for this site in your browser/device settings, then tap Scan GPS Location again.';
    case 2:
      return 'Device GPS/Location is turned OFF. Enable Location Services on this device (Location must be On), then tap Scan GPS Location again.';
    case 3:
      return 'GPS could not get a fix in time. Make sure Location is enabled and move to an open area, then try again.';
    default:
      return 'Could not detect your location. Please turn on device Location and try again.';
  }
}

// Returns browser/device-ready info before scanning so we can guide the user
// (HTTPS required, permission already granted/blocked/pending)
export async function getGeolocationStatus() {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const secure = typeof window === 'undefined' || window.isSecureContext !== false;
  let permission = 'unknown';
  try {
    if (navigator.permissions && typeof navigator.permissions.query === 'function') {
      const res = await navigator.permissions.query({ name: 'geolocation' });
      permission = res.state; // 'granted' | 'denied' | 'prompt'
    }
  } catch (e) {
    permission = 'unknown';
  }
  return { supported, secure, permission };
}

export function scanDeviceGps({
  timeoutMs = 30000,
  maxWaitMs = 15000,
  accuracyTargetM = 100,
  maxAcceptableM = 1000,
  enableHighAccuracy = true,
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      reject(new Error('Location access requires a secure connection (HTTPS or localhost). Please open this site with https:// to enable location.'));
      return;
    }
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    let watchId = null;
    let settleTimer = null;
    let bestFix = null;
    let settled = false;

    const cleanup = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (settleTimer) clearTimeout(settleTimer);
    };

    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(value);
    };

    // Coarse fixes (usually internet/IP-based geolocation, often km off) must NOT be
    // reported as the user's real location
    const rejectImprecise = () => {
      finish(reject, new Error(
        'Only a rough internet-based location was found, not your real GPS position. Enable precise device Location (GPS) on this device, or use a phone with Location ON, then try again.'
      ));
    };

    const acceptFix = (fix) => {
      // Keep only the best fix so a stale/fuzzy read never wins over a fresher one
      if (!bestFix || fix.accuracy < bestFix.accuracy) bestFix = fix;

      // Real device GPS lock (high accuracy) is accepted immediately
      if (bestFix.accuracy <= accuracyTargetM) {
        finish(resolve, bestFix);
        return;
      }

      // Otherwise keep scanning for a better fix, then accept only if it's still
      // reasonably precise; otherwise tell the user their location isn't exact
      if (!settleTimer) {
        settleTimer = setTimeout(() => {
          if (bestFix && bestFix.accuracy <= maxAcceptableM) finish(resolve, bestFix);
          else rejectImprecise();
        }, maxWaitMs);
      }
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => acceptFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => {
        // If a real fix already exists, keep the best one; otherwise report why we can't
        if (bestFix && bestFix.accuracy <= maxAcceptableM) {
          finish(resolve, bestFix);
        } else if (bestFix) {
          rejectImprecise();
        } else {
          finish(reject, new Error(getGeolocationErrorMessage(err)));
        }
      },
      { enableHighAccuracy, maximumAge: 0, timeout: timeoutMs }
    );
  });
}

export async function getDeviceLocation(opts) {
  const fix = await scanDeviceGps(opts);
  const { lat, lng } = fix;
  let data = {};
  try {
    data = await reverseGeocode(lat, lng);
  } catch (e) {
    data = {};
  }
  return { lat, lng, data, address: formatAddress(data), accuracy: fix.accuracy };
}

// Great-circle straight-line distance between two GPS points (km)
export function distanceKmBetween(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}