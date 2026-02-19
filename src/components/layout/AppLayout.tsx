import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNav } from './MobileNav';
import { PlayerBar } from './PlayerBar';
import { RecentlyPlayedTracker } from '@/components/RecentlyPlayedTracker';
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

      <main className={cn(
        'flex-1 overflow-y-auto relative z-10',
        hasPlayer ? 'pb-24 md:pb-24' : 'pb-16 md:pb-0'
      )}>
        <Outlet />
      </main>

      <PlayerBar />
      <MobileNav />
    </div>
  );
};
