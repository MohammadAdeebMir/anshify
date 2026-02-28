import { useState, useEffect, useRef } from 'react';

export interface DominantColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  // Secondary color for richer gradients
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

/** Clamp lightness: auto-darken brights, slightly boost dull colors */
function adjustColor(r: number, g: number, b: number): [number, number, number] {
  const [h, s, l] = rgbToHsl(r, g, b);
  // Target lightness: 25-45 range — deep but not black
  let adjL = l;
  if (l > 55) adjL = 25 + (l - 55) * 0.3; // darken bright
  else if (l < 15) adjL = 15 + l * 0.5; // lift too-dark
  else adjL = Math.max(20, Math.min(45, l));

  // Boost dull saturation slightly, reduce oversaturation
  let adjS = s;
  if (s < 20) adjS = s + 15; // boost dull
  else if (s > 80) adjS = 60 + (s - 80) * 0.3; // tame neon

  return hslToRgb(h, Math.min(adjS, 70), adjL);
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

interface ColorBucket {
  rSum: number; gSum: number; bSum: number; count: number;
}

function extractColor(img: HTMLImageElement): DominantColor {
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // K-means-lite: split pixels into 2 buckets by hue for primary + secondary
  const buckets: [ColorBucket, ColorBucket] = [
    { rSum: 0, gSum: 0, bSum: 0, count: 0 },
    { rSum: 0, gSum: 0, bSum: 0, count: 0 },
  ];

  for (let i = 0; i < data.length; i += 8) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const brightness = (r + g + b) / 3;
    if (brightness < 15 || brightness > 245) continue;
    const [h] = rgbToHsl(r, g, b);
    const bucket = h < 180 ? 0 : 1;
    buckets[bucket].rSum += r;
    buckets[bucket].gSum += g;
    buckets[bucket].bSum += b;
    buckets[bucket].count++;
  }

  // Sort by count — primary is the dominant bucket
  buckets.sort((a, b) => b.count - a.count);

  const fallback: DominantColor = { r: 35, g: 30, b: 45, h: 260, s: 18, l: 15, sr: 25, sg: 20, sb: 35 };
  if (buckets[0].count === 0) return fallback;

  const primary = buckets[0];
  const pr = Math.round(primary.rSum / primary.count);
  const pg = Math.round(primary.gSum / primary.count);
  const pb = Math.round(primary.bSum / primary.count);
  const [ar, ag, ab] = adjustColor(pr, pg, pb);
  const [h, s, l] = rgbToHsl(ar, ag, ab);

  let sr = Math.round(ar * 0.4), sg = Math.round(ag * 0.4), sb = Math.round(ab * 0.4);
  if (buckets[1].count > 0) {
    const sec = buckets[1];
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
    r: 35, g: 30, b: 45, h: 260, s: 18, l: 15, sr: 15, sg: 12, sb: 22,
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
