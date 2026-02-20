import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications((data as Notification[]) || []);
    };
    fetchNotifications();

    // Fetch reads if logged in
    if (user) {
      supabase.from('notification_reads').select('notification_id').then(({ data }) => {
        if (data) setReadIds(new Set(data.map(r => r.notification_id)));
      });
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markRead = async (id: string) => {
    if (!user || readIds.has(id)) return;
    setReadIds(prev => new Set([...prev, id]));
    await supabase.from('notification_reads').insert({ user_id: user.id, notification_id: id });
  };

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !readIds.has(n.id));
    const newIds = new Set([...readIds, ...unread.map(n => n.id)]);
    setReadIds(newIds);
    for (const n of unread) {
      try {
        await supabase.from('notification_reads').insert({ user_id: user.id, notification_id: n.id });
      } catch {}
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); if (!open) markAllRead(); }}
        className="relative p-2 rounded-full text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-all"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-auto z-50 rounded-2xl glass border border-border/30 shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <h3 className="text-sm font-bold text-foreground">Notifications</h3>
                <button onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No notifications yet</p>
              ) : (
                <div className="pb-2">
                  {notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-foreground/5 transition-colors border-b border-border/10 last:border-0',
                        !readIds.has(n.id) && 'bg-primary/5'
                      )}
                    >
                      <div className="flex gap-3">
                        {n.image_url && (
                          <img src={n.image_url} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate">{n.title}</p>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                          <p className="text-[10px] text-muted-foreground/50 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                        </div>
                        {!readIds.has(n.id) && (
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
