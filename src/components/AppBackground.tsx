import { memo } from 'react';

export const AppBackground = memo(({ theme }: { theme: string }) => {
  if (theme === 'oled') return <div className="fixed inset-0 bg-black -z-10" />;

  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-black" />
      {/* Blue corners */}
      <div
        className="absolute inset-0 animate-[glow-pulse_8s_ease-in-out_infinite]"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 0% 0%, hsl(210 100% 55% / 0.40) 0%, transparent 60%),
            radial-gradient(ellipse 55% 50% at 100% 0%, hsl(215 100% 58% / 0.35) 0%, transparent 55%),
            radial-gradient(ellipse 60% 55% at 100% 100%, hsl(210 100% 55% / 0.38) 0%, transparent 55%),
            radial-gradient(ellipse 55% 50% at 0% 100%, hsl(205 95% 58% / 0.32) 0%, transparent 55%)
          `,
        }}
      />
      {/* Golden center */}
      <div
        className="absolute inset-0 animate-[glow-pulse_10s_ease-in-out_2s_infinite]"
        style={{
          background: `
            radial-gradient(ellipse 75% 60% at 50% 45%, hsl(42 95% 55% / 0.35) 0%, hsl(38 90% 50% / 0.15) 35%, transparent 65%)
          `,
        }}
      />
    </div>
  );
});
AppBackground.displayName = 'AppBackground';
