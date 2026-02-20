import { Home, Search, Library, Radio, Heart, ListMusic, Settings, Music2, BarChart3, HardDrive, ListMusic as QueueIcon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const mainNav = [
  { title: 'Home', to: '/', icon: Home },
  { title: 'Search', to: '/search', icon: Search },
  { title: 'Browse', to: '/browse', icon: Radio },
  { title: 'Queue', to: '/queue', icon: QueueIcon },
];

const libraryNav = [
  { title: 'Your Library', to: '/library', icon: Library },
  { title: 'Liked Songs', to: '/liked', icon: Heart },
  { title: 'Playlists', to: '/playlists', icon: ListMusic },
];

const moreNav = [
  { title: 'Analytics', to: '/analytics', icon: BarChart3 },
  { title: 'Storage', to: '/storage', icon: HardDrive },
  { title: 'Settings', to: '/settings', icon: Settings },
];

export const AppSidebar = () => {
  return (
    <aside className="hidden md:flex flex-col w-60 h-full glass border-r border-border/20 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center glow-primary">
          <Music2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">Purple Haze</span>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* Main nav */}
        <nav className="space-y-0.5 mb-6">
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              activeClassName="text-foreground bg-muted/50 font-medium"
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Library */}
        <div className="mb-2 px-3">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-semibold">Library</p>
        </div>
        <nav className="space-y-0.5 mb-6">
          {libraryNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
              activeClassName="text-foreground bg-muted/50 font-medium"
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>
      </ScrollArea>

      {/* More */}
      <div className="p-3 border-t border-border/15 space-y-0.5">
        {moreNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all"
            activeClassName="text-foreground bg-muted/50 font-medium"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
};
