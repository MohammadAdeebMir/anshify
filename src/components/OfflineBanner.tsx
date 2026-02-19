import { WifiOff } from 'lucide-react';
import { useIsOnline } from '@/hooks/useOffline';
import { AnimatePresence, motion } from 'framer-motion';

export const OfflineBanner = () => {
  const isOnline = useIsOnline();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-destructive/20 border-b border-destructive/30 px-4 py-2 flex items-center justify-center gap-2 text-xs text-destructive"
        >
          <WifiOff className="h-3.5 w-3.5" />
          <span>You're offline. Only downloaded songs are available.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
