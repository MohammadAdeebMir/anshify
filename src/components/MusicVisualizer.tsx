import { useRef, useEffect, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

type VisualizerMode = 'bars' | 'circular' | 'line' | 'glow';

export const MusicVisualizer = ({ className }: { className?: string }) => {
  const { analyserNode, isPlaying, visualizerEnabled } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [mode, setMode] = useState<VisualizerMode>('bars');

  useEffect(() => {
    if (!visualizerEnabled || !analyserNode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (mode === 'bars') {
        const barCount = 32;
        const barWidth = w / barCount - 2;
        for (let i = 0; i < barCount; i++) {
          const idx = Math.floor(i * bufferLength / barCount);
          const val = dataArray[idx] / 255;
          const barH = val * h * 0.85;
          const hue = 265 + i * 2;
          ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + val * 0.5})`;
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + 2), h - barH, barWidth, barH, 3);
          ctx.fill();
        }
      } else if (mode === 'circular') {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.35;
        const slices = 48;
        for (let i = 0; i < slices; i++) {
          const idx = Math.floor(i * bufferLength / slices);
          const val = dataArray[idx] / 255;
          const angle = (i / slices) * Math.PI * 2 - Math.PI / 2;
          const len = r * 0.3 + val * r * 0.7;
          ctx.strokeStyle = `hsla(${265 + i * 3}, 80%, 60%, ${0.4 + val * 0.6})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * r * 0.3, cy + Math.sin(angle) * r * 0.3);
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
          ctx.stroke();
        }
      } else if (mode === 'line') {
        ctx.strokeStyle = 'hsla(265, 80%, 60%, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const step = w / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i] / 255;
          const y = h / 2 + (val - 0.5) * h * 0.7;
          i === 0 ? ctx.moveTo(0, y) : ctx.lineTo(i * step, y);
        }
        ctx.stroke();
      } else if (mode === 'glow') {
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength / 255;
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.4);
        gradient.addColorStop(0, `hsla(265, 80%, 60%, ${avg * 0.6})`);
        gradient.addColorStop(0.5, `hsla(280, 70%, 50%, ${avg * 0.3})`);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [visualizerEnabled, analyserNode, mode, isPlaying]);

  if (!visualizerEnabled) return null;

  const modes: { id: VisualizerMode; label: string }[] = [
    { id: 'bars', label: 'Bars' },
    { id: 'circular', label: 'Pulse' },
    { id: 'line', label: 'Wave' },
    { id: 'glow', label: 'Glow' },
  ];

  return (
    <div className={cn('relative', className)}>
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        className="w-full h-full rounded-xl"
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[9px] font-medium transition-colors',
              mode === m.id ? 'bg-primary/80 text-primary-foreground' : 'bg-background/60 text-muted-foreground'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
};
