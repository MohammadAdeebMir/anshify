import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useSocial';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, BarChart3, Clock, Bell, Settings, ChevronRight, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { memo } from 'react';

const menuItems = [
  { icon: User, label: 'View Profile', path: '/profile' },
  { icon: BarChart3, label: 'Your Music Insights', path: '/insights' },
  { icon: Clock, label: 'Recents', path: '/recents' },
  { icon: Bell, label: 'Your Updates', path: '#' },
  { icon: Settings, label: 'Settings & Privacy', path: '/settings' },
];

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export const ProfilePanel = memo(({ open, onClose }: ProfilePanelProps) => {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const navigate = useNavigate();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  const handleNav = (path: string) => {
    if (path === '#') return;
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[85%] max-w-[340px] flex flex-col"
            style={{
              background: 'hsl(var(--background))',
              paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
            }}
          >
            {/* Close btn */}
            <div className="flex justify-end px-4 pt-2 pb-1">
              <button onClick={onClose} className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Profile header */}
            <div className="px-6 py-5 flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{displayName}</p>
                <button
                  onClick={() => handleNav('/profile')}
                  className="text-xs text-primary font-medium mt-0.5 hover:underline"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Menu items */}
            <div className="flex-1 px-4 space-y-0.5 overflow-y-auto">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-left transition-colors',
                    'active:bg-secondary/60 hover:bg-secondary/40',
                    item.path === '#' && 'opacity-50'
                  )}
                >
                  <item.icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                </button>
              ))}
            </div>

            {/* Sign out */}
            <div className="px-4 pt-2 pb-3">
              <button
                onClick={async () => { onClose(); await signOut(); navigate('/'); }}
                className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-left active:bg-destructive/10 hover:bg-destructive/5 transition-colors"
              >
                <LogOut className="h-5 w-5 text-destructive/70 flex-shrink-0" />
                <span className="text-sm font-medium text-destructive/80">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});
ProfilePanel.displayName = 'ProfilePanel';
