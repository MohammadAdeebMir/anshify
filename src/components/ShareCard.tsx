import { useRef } from 'react';
import { Track } from '@/types/music';
import { Music2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ShareCardProps {
  type: 'now-playing' | 'stats';
  track?: Track;
  stats?: { totalPlays: number; topArtists: { name: string; count: number }[]; streak: number };
}

export const ShareCard = ({ type, track, stats }: ShareCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, { backgroundColor: '#000000', scale: 2 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if (navigator.share) {
          const file = new File([blob], 'share.png', { type: 'image/png' });
          await navigator.share({ files: [file] }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'share.png';
          a.click();
          URL.revokeObjectURL(url);
          toast.success('Image saved!');
        }
      }, 'image/png');
    } catch {
      toast.error('Could not generate share image');
    }
  };

  if (type === 'now-playing' && track) {
    return (
      <div className="space-y-3">
        <div
          ref={cardRef}
          className="relative w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-black p-6 flex flex-col justify-end"
          style={{
            backgroundImage: `linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.9) 100%), url(${track.album_image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Music2 className="h-3 w-3 text-primary" />
              <span className="text-[10px] text-primary font-medium uppercase tracking-wider">Now Playing</span>
            </div>
            <p className="text-lg font-bold text-white leading-tight">{track.name}</p>
            <p className="text-sm text-white/70">{track.artist_name}</p>
            <p className="text-xs text-white/40">{track.album_name}</p>
          </div>
        </div>
        <Button onClick={handleShare} size="sm" variant="outline" className="w-full rounded-xl border-border/30">
          <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Card
        </Button>
      </div>
    );
  }

  if (type === 'stats' && stats) {
    return (
      <div className="space-y-3">
        <div
          ref={cardRef}
          className="w-[320px] aspect-[9/16] rounded-2xl overflow-hidden bg-gradient-to-b from-primary/20 to-black p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-1.5 mb-6">
              <Music2 className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary font-bold uppercase tracking-wider">My Stats</span>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-3xl font-black text-white">{stats.totalPlays}</p>
                <p className="text-xs text-white/50">Total Plays</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">🔥 {stats.streak}</p>
                <p className="text-xs text-white/50">Day Streak</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Top Artists</p>
            {stats.topArtists.slice(0, 3).map((a, i) => (
              <p key={a.name} className="text-sm text-white/80 font-medium">
                {i + 1}. {a.name}
              </p>
            ))}
          </div>
        </div>
        <Button onClick={handleShare} size="sm" variant="outline" className="w-full rounded-xl border-border/30">
          <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share Stats
        </Button>
      </div>
    );
  }

  return null;
};
