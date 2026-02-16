import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Clock } from 'lucide-react';
import { getArtistDetails, getArtistTracks, getArtistAlbums } from '@/services/jamendo';
import { usePlayer } from '@/contexts/PlayerContext';
import { SongListSkeleton, AlbumGridSkeleton } from '@/components/skeletons/Skeletons';
import { Track } from '@/types/music';

const TrackRow = ({ track, index, tracks }: { track: Track; index: number; tracks: Track[] }) => {
  const { play, currentTrack, isPlaying } = usePlayer();
  const isActive = currentTrack?.id === track.id;

  return (
    <button
      onClick={() => play(track, tracks)}
      className={`flex items-center gap-3 p-3 w-full text-left rounded-lg transition-colors hover:bg-muted/40 ${isActive ? 'bg-primary/10' : ''}`}
    >
      <span className="w-6 text-xs text-muted-foreground text-right tabular-nums">{index + 1}</span>
      <div className="relative h-10 w-10 rounded-md overflow-hidden flex-shrink-0">
        <img src={track.album_image} alt={track.album_name} className="h-full w-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{track.name}</p>
        <p className="text-xs text-muted-foreground truncate">{track.album_name}</p>
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
      </span>
    </button>
  );
};

const ArtistPage = () => {
  const { id } = useParams<{ id: string }>();
  const { play } = usePlayer();

  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ['artist', id],
    queryFn: () => getArtistDetails(id!),
    enabled: !!id,
  });

  const { data: tracks = [], isLoading: loadingTracks } = useQuery({
    queryKey: ['artist-tracks', id],
    queryFn: () => getArtistTracks(id!, 20),
    enabled: !!id,
  });

  const { data: albums = [], isLoading: loadingAlbums } = useQuery({
    queryKey: ['artist-albums', id],
    queryFn: () => getArtistAlbums(id!, 10),
    enabled: !!id,
  });

  if (loadingArtist) {
    return <div className="p-8"><SongListSkeleton count={5} /></div>;
  }

  if (!artist) {
    return <div className="p-8 text-center text-muted-foreground">Artist not found</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative p-6 md:p-8 pb-0"
      >
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className="h-40 w-40 md:h-52 md:w-52 rounded-full overflow-hidden glow-primary flex-shrink-0">
            <img src={artist.image} alt={artist.name} className="h-full w-full object-cover" />
          </div>
          <div className="text-center md:text-left space-y-2 pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Artist</p>
            <h1 className="text-3xl md:text-5xl font-extrabold text-foreground glow-text">{artist.name}</h1>
            {tracks.length > 0 && (
              <button
                onClick={() => play(tracks[0], tracks)}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-semibold hover:scale-105 transition-transform glow-primary"
              >
                <Play className="h-4 w-4 fill-current" /> Play All
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Top Tracks */}
      <div className="p-6 md:p-8 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Top Tracks
          </h2>
          {loadingTracks ? (
            <div className="glass rounded-2xl overflow-hidden"><SongListSkeleton count={5} /></div>
          ) : (
            <div className="glass rounded-2xl overflow-hidden">
              {tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} tracks={tracks} />)}
            </div>
          )}
        </section>

        {/* Albums */}
        {(loadingAlbums || albums.length > 0) && (
          <section>
            <h2 className="text-xl font-bold text-foreground mb-4">Albums</h2>
            {loadingAlbums ? (
              <AlbumGridSkeleton count={6} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {albums.map(a => (
                  <Link key={a.id} to={`/album/${a.id}`} className="group space-y-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className="relative aspect-square rounded-xl overflow-hidden">
                      <img src={a.image} alt={a.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.releasedate?.slice(0, 4)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default ArtistPage;
