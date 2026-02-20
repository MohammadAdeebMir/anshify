import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { PlayerBar } from './PlayerBar';
import { RecentlyPlayedTracker } from '@/components/RecentlyPlayedTracker';
import { OfflineBanner } from '@/components/OfflineBanner';
import { usePlayer } from '@/contexts/PlayerContext';
import { cn } from '@/lib/utils';

export const AppLayout = () => {
  const { currentTrack } = usePlayer();
  const hasPlayer = !!currentTrack;

  return (
    <div className="h-screen flex gradient-bg relative overflow-hidden">
      {/* Radial glow overlay */}
      <div className="absolute inset-0 gradient-radial pointer-events-none" />

      <AppSidebar />
      <RecentlyPlayedTracker />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <OfflineBanner />
        <main className={cn(
          'flex-1 overflow-y-auto',
          hasPlayer ? 'pb-36 md:pb-24' : 'pb-16 md:pb-0'
        )}>
          <Outlet />
        </main>
      </div>

      <PlayerBar />
      <MobileNav />
    </div>
  );
};
