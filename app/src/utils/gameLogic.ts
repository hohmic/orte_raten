import type { Place } from '../types';

const CHEAT_HASH = 'b9077f501b57796cc74b10b223dc7a7c22d24737a27e4414aac90477c0e481c0';

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function tryCheat(revealedInput: string): Promise<boolean> {
  const hash = await sha256Hex(revealedInput.trim());
  return hash === CHEAT_HASH;
}

export function calcDistanceInKm(a: Place, b: Place): number {
  if (a === b) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const latA = toRad(a.latitude);
  const latB = toRad(b.latitude);
  const aVal =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(aVal));
}

export function formatDistance(distance: number, decimalPlaces: number): string {
  if (distance < 1) return `${Math.round(distance * 1000)} m`;
  const faktor = Math.pow(10, decimalPlaces);
  return `${Math.round((distance + Number.EPSILON) * faktor) / faktor} km`;
}

export function calcAngleBetweenThreePoints(a: Place, x: Place, b: Place): number {
  const ax = [a.longitude - x.longitude, a.latitude - x.latitude];
  const bx = [b.longitude - x.longitude, b.latitude - x.latitude];
  const dot = ax[0] * bx[0] + ax[1] * bx[1];
  const magA = Math.hypot(ax[0], ax[1]);
  const magB = Math.hypot(bx[0], bx[1]);
  if (magA === 0 || magB === 0) return 0;
  const cosAngle = dot / (magA * magB);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  return (angle * 180) / Math.PI;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getSeedFromDate(dayISO: string | null): number {
  const d = dayISO ? new Date(dayISO) : new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function getSeedFromURL(): number | null {
  const params = new URLSearchParams(window.location.search);
  const seedParam = params.get('game');
  const ret = parseInt(seedParam ?? '', 10);
  return Number.isNaN(ret) ? null : ret;
}

export function getDayFromURL(): string | null {
  const params = new URLSearchParams(window.location.search);
  const day = params.get('day');
  const date = new Date(day ?? '');
  return day && !Number.isNaN(date.getTime()) ? day : null;
}

export function getTodayISO(): string {
  return new Date().toLocaleDateString('sv-SE').split('T')[0];
}

export function getNextRandSelectable(
  allPlaces: Place[],
  rand: () => number
): Place {
  let ret = allPlaces[Math.floor(rand() * allPlaces.length)];
  while (!ret.selectable) {
    ret = allPlaces[Math.floor(rand() * allPlaces.length)];
  }
  return ret;
}

export function setCookie(name: string, value: string, days: number): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}`;
}

export function getCookie(name: string): string | null {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (const c of cookies) {
    if (c.startsWith(name + '=')) {
      return decodeURIComponent(c.substring(name.length + 1));
    }
  }
  return null;
}

export function pickTargetAndRefs(
  allPlaces: Place[],
  seed: number
): { target: Place; ref1: Place; ref2: Place } {
  const rand = (() => {
    let i = 0;
    return () => seededRandom(seed + i++);
  })();

  let target = getNextRandSelectable(allPlaces, rand);
  let ref1 = getNextRandSelectable(allPlaces, rand);
  let ref2 = getNextRandSelectable(allPlaces, rand);

  let retryCounter = 0;
  while (
    ref1 === target ||
    ref2 === target ||
    ref1 === ref2 ||
    (retryCounter <= 300 &&
      (calcDistanceInKm(ref1, target) <= 10 ||
        calcDistanceInKm(ref2, target) <= 10 ||
        calcAngleBetweenThreePoints(ref1, target, ref2) <= 20))
  ) {
    ref1 = getNextRandSelectable(allPlaces, rand);
    ref2 = getNextRandSelectable(allPlaces, rand);
    retryCounter++;
  }

  return { target, ref1, ref2 };
}
