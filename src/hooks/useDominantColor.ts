import { useState, useEffect, useRef } from 'react';

export interface DominantColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  sr: number;
  sg: number;
  sb: number;
}

const colorCache = new Map<string, DominantColor>();

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Spotify-style color adjustment:
 * - Boost saturation by ~1.2x (cap at 95 to avoid neon)
 * - Target lightness 38-52 range for rich, deep but visible colors
 * - Prevent muddy browns/grays by enforcing minimum saturation
 * - Auto-darken overly light colors, brighten overly dark ones
 */
function adjustColor(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);

  // Boost saturation ~1.2x, floor at 55, cap at 95 (no neon)
  let adjS = Math.min(95, Math.max(55, Math.round(s * 1.2)));

  // Target lightness: rich and deep but clearly visible
  let adjL: number;
  if (l < 20) {
    adjL = 38; // too dark → lift
  } else if (l > 70) {
    adjL = 42; // too light → darken for depth
  } else {
    // Sweet spot: slightly compress toward 42-48
    adjL = Math.round(38 + (l - 20) * 0.2);
  }
  adjL = Math.max(35, Math.min(52, adjL));

  // If saturation is very low (gray/brown), push it up more
  if (s < 15) {
    adjS = 60;
    adjL = 40;
  }

  return hslToRgb(h, adjS, adjL);
}

interface ColorBucket {
  rSum: number; gSum: number; bSum: number; count: number;
  satSum: number;
}

function extractColor(img: HTMLImageElement): DominantColor {
  const canvas = document.createElement('canvas');
  const size = 80; // slightly higher for better sampling
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // 4-bucket k-means by hue quadrant for better color separation
  const buckets: ColorBucket[] = Array.from({ length: 4 }, () => ({
    rSum: 0, gSum: 0, bSum: 0, count: 0, satSum: 0,
  }));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const brightness = (r + g + b) / 3;
    if (brightness < 12 || brightness > 248) continue; // skip pure black/white
    const [h, s] = rgbToHsl(r, g, b);
    if (s < 8) continue; // skip grays entirely
    const bucket = Math.floor(h / 90) % 4;
    buckets[bucket].rSum += r;
    buckets[bucket].gSum += g;
    buckets[bucket].bSum += b;
    buckets[bucket].satSum += s;
    buckets[bucket].count++;
  }

  // Pick the most saturated bucket with enough pixels as primary
  const validBuckets = buckets.filter(b => b.count > 10);
  if (validBuckets.length === 0) {
    // Fallback: try any bucket with pixels
    const anyValid = buckets.filter(b => b.count > 0);
    if (anyValid.length === 0) {
      return { r: 40, g: 30, b: 50, h: 270, s: 25, l: 16, sr: 20, sg: 15, sb: 30 };
    }
    validBuckets.push(...anyValid);
  }

  // Sort by weighted score: saturation * sqrt(count) to prefer vibrant + dominant
  validBuckets.sort((a, b) => {
    const scoreA = (a.satSum / a.count) * Math.sqrt(a.count);
    const scoreB = (b.satSum / b.count) * Math.sqrt(b.count);
    return scoreB - scoreA;
  });

  const primary = validBuckets[0];
  const pr = Math.round(primary.rSum / primary.count);
  const pg = Math.round(primary.gSum / primary.count);
  const pb = Math.round(primary.bSum / primary.count);
  const [ar, ag, ab] = adjustColor(pr, pg, pb);
  const [h, s, l] = rgbToHsl(ar, ag, ab);

  // Secondary: pick a different bucket for gradient richness
  let sr = Math.round(ar * 0.45), sg = Math.round(ag * 0.45), sb = Math.round(ab * 0.45);
  if (validBuckets.length > 1) {
    const sec = validBuckets[1];
    const raw = adjustColor(
      Math.round(sec.rSum / sec.count),
      Math.round(sec.gSum / sec.count),
      Math.round(sec.bSum / sec.count),
    );
    sr = Math.round(raw[0] * 0.5);
    sg = Math.round(raw[1] * 0.5);
    sb = Math.round(raw[2] * 0.5);
  }

  return { r: ar, g: ag, b: ab, h, s, l, sr, sg, sb };
}

export function useDominantColor(imageUrl: string | undefined): DominantColor {
  const [color, setColor] = useState<DominantColor>({
    r: 40, g: 30, b: 50, h: 270, s: 25, l: 16, sr: 20, sg: 15, sb: 30,
  });
  const prevUrl = useRef<string>();

  useEffect(() => {
    if (!imageUrl || imageUrl === prevUrl.current) return;
    prevUrl.current = imageUrl;

    const cached = colorCache.get(imageUrl);
    if (cached) { setColor(cached); return; }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = extractColor(img);
        colorCache.set(imageUrl, c);
        setColor(c);
      } catch {
        // CORS / taint — fallback
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return color;
}
