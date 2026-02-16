import { Home, Search, Radio, Library, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

const tabs = [
  { title: 'Home', to: '/', icon: Home },
  { title: 'Search', to: '/search', icon: Search },
  { title: 'Browse', to: '/browse', icon: Radio },
  { title: 'Library', to: '/library', icon: Library },
  { title: 'Profile', to: '/profile', icon: User },
];

export const MobileNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-40 glass-strong border-t border-border/20 md:hidden pb-[env(safe-area-inset-bottom)]">
    <div className="flex items-center justify-around h-14">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground transition-colors"
          activeClassName="text-primary"
        >
          <tab.icon className="h-5 w-5" />
          <span className="text-[10px]">{tab.title}</span>
        </NavLink>
      ))}
    </div>
  </nav>
);
