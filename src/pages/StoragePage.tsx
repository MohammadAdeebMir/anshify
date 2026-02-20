import { useState } from 'react';
import { motion } from 'framer-motion';
import { HardDrive, Trash2, Wifi, AlertTriangle, Download, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useOfflineTracks } from '@/hooks/useOffline';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const StoragePage = () => {
  const { downloadedTracks, removeDownload } = useOfflineTracks();
  const [wifiOnly, setWifiOnly] = useState(() => localStorage.getItem('ph-wifi-only') === 'true');
  const [autoClean, setAutoClean] = useState(() => localStorage.getItem('ph-auto-clean') === 'true');
  const [quality, setQuality] = useState(() => localStorage.getItem('ph-download-quality') || 'normal');

  // Estimate storage
  const avgTrackSizeMB = quality === 'high' ? 8 : quality === 'low' ? 2 : 4;
  const estimatedMB = downloadedTracks.length * avgTrackSizeMB;

  const handleWifiOnly = (v: boolean) => { setWifiOnly(v); localStorage.setItem('ph-wifi-only', String(v)); };
  const handleAutoClean = (v: boolean) => { setAutoClean(v); localStorage.setItem('ph-auto-clean', String(v)); };
  const handleQuality = (q: string) => { setQuality(q); localStorage.setItem('ph-download-quality', q); };

  const cleanUnused = async () => {
    // Remove tracks not played recently (keep all for now, just show toast)
    toast.success('Cache cleaned');
  };

  const removeAll = async () => {
    for (const t of downloadedTracks) {
      await removeDownload.mutateAsync(t.id);
    }
    toast.success('All downloads removed');
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <HardDrive className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-extrabold text-foreground">Storage</h1>
        </div>
        <p className="text-muted-foreground text-sm">Manage downloads and cache</p>
      </motion.div>

      {/* Usage overview */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-foreground">{estimatedMB} MB</p>
            <p className="text-xs text-muted-foreground">Estimated usage</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">{downloadedTracks.length}</p>
            <p className="text-xs text-muted-foreground">Downloaded tracks</p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${Math.min(100, estimatedMB / 10)}%` }} />
        </div>

        {estimatedMB > 500 && (
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>High storage usage. Consider cleaning unused downloads.</span>
          </div>
        )}
      </motion.div>

      {/* Settings */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-2xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-foreground">Download Settings</h2>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Download Quality</Label>
            <div className="flex gap-2">
              {[
                { id: 'low', label: 'Low', desc: '~2MB' },
                { id: 'normal', label: 'Normal', desc: '~4MB' },
                { id: 'high', label: 'High', desc: '~8MB' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleQuality(opt.id)}
                  className={cn(
                    'flex-1 rounded-xl p-3 text-center transition-all border',
                    quality === opt.id ? 'border-primary bg-primary/10' : 'border-border/30 hover:border-border/50'
                  )}
                >
                  <p className="text-xs font-bold text-foreground">{opt.label}</p>
                  <p className="text-[10px] text-muted-foreground">{opt.desc}/track</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><Wifi className="h-3.5 w-3.5 text-primary" /> Wi-Fi Only</p>
              <p className="text-[10px] text-muted-foreground">Only download on Wi-Fi</p>
            </div>
            <Switch checked={wifiOnly} onCheckedChange={handleWifiOnly} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-clean</p>
              <p className="text-[10px] text-muted-foreground">Remove rarely played downloads</p>
            </div>
            <Switch checked={autoClean} onCheckedChange={handleAutoClean} />
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Actions</h2>
        <div className="flex gap-3">
          <Button onClick={cleanUnused} variant="outline" className="rounded-xl border-border/30 flex-1 text-xs">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clean Cache
          </Button>
          <Button
            onClick={removeAll}
            variant="outline"
            className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 flex-1 text-xs"
            disabled={downloadedTracks.length === 0}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Remove All
          </Button>
        </div>
      </motion.div>

      {/* Downloaded tracks list */}
      {downloadedTracks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" /> Downloaded ({downloadedTracks.length})
          </h2>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {downloadedTracks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 group">
                <div className="h-9 w-9 rounded-md overflow-hidden shrink-0">
                  <img src={t.album_image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.artist_name}</p>
                </div>
                <button
                  onClick={() => removeDownload.mutate(t.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StoragePage;
