import { memo } from 'react';

export const AppBackground = memo(({ theme }: { theme: string }) => {
  if (theme === 'oled') return <div className="fixed inset-0 bg-black -z-10" />;

  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-black" />
      {/* Single blended layer: blue corners smoothly transitioning into golden center */}
      <div
        className="absolute inset-0 animate-[glow-pulse_8s_ease-in-out_infinite]"
        style={{
          background: `
            radial-gradient(ellipse 80% 70% at 0% 0%, hsl(210 100% 55% / 0.38) 0%, hsl(220 60% 50% / 0.12) 30%, transparent 65%),
            radial-gradient(ellipse 70% 65% at 100% 0%, hsl(215 100% 58% / 0.33) 0%, hsl(200 50% 50% / 0.10) 30%, transparent 60%),
            radial-gradient(ellipse 75% 70% at 100% 100%, hsl(210 100% 55% / 0.35) 0%, hsl(220 55% 50% / 0.10) 30%, transparent 60%),
            radial-gradient(ellipse 70% 65% at 0% 100%, hsl(205 95% 58% / 0.30) 0%, hsl(210 50% 50% / 0.08) 30%, transparent 60%)
          `,
        }}
      />
      {/* Golden center with wide reach to blend into blue edges */}
      <div
        className="absolute inset-0 animate-[glow-pulse_10s_ease-in-out_2s_infinite]"
        style={{
          background: `
            radial-gradient(ellipse 90% 80% at 50% 50%, hsl(42 95% 55% / 0.32) 0%, hsl(38 80% 50% / 0.14) 30%, hsl(30 40% 45% / 0.04) 55%, transparent 75%)
          `,
        }}
      />
    </div>
  );
});
AppBackground.displayName = 'AppBackground';
