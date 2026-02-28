import { useState, useEffect, useRef } from 'react';

interface DominantColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
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

function extractColor(img: HTMLImageElement): DominantColor {
  const canvas = document.createElement('canvas');
  const size = 50;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  let rSum = 0, gSum = 0, bSum = 0, count = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    // Skip very dark and very bright pixels for better color
    const brightness = (r + g + b) / 3;
    if (brightness < 20 || brightness > 240) continue;
    rSum += r; gSum += g; bSum += b; count++;
  }

  if (count === 0) return { r: 40, g: 40, b: 50, h: 230, s: 10, l: 18 };

  const r = Math.round(rSum / count);
  const g = Math.round(gSum / count);
  const b = Math.round(bSum / count);
  const [h, s, l] = rgbToHsl(r, g, b);

  return { r, g, b, h, s, l };
}

export function useDominantColor(imageUrl: string | undefined): DominantColor {
  const [color, setColor] = useState<DominantColor>({ r: 30, g: 30, b: 40, h: 230, s: 12, l: 14 });
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
        // CORS or canvas taint — use fallback
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  return color;
}
