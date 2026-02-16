import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('rounded-lg bg-muted/50 shimmer', className)} />
);

export const SongRowSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-3.5 w-3/5" />
      <Shimmer className="h-3 w-2/5" />
    </div>
    <Shimmer className="h-3 w-10" />
  </div>
);

export const SongListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <SongRowSkeleton key={i} />
    ))}
  </div>
);

export const AlbumCardSkeleton = () => (
  <div className="space-y-3 p-3">
    <Shimmer className="aspect-square w-full rounded-xl" />
    <Shimmer className="h-4 w-4/5" />
    <Shimmer className="h-3 w-3/5" />
  </div>
);

export const AlbumGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
    {Array.from({ length: count }).map((_, i) => (
      <AlbumCardSkeleton key={i} />
    ))}
  </div>
);

export const ArtistSkeleton = () => (
  <div className="flex flex-col items-center space-y-3 p-4">
    <Shimmer className="h-28 w-28 rounded-full" />
    <Shimmer className="h-4 w-24" />
    <Shimmer className="h-3 w-16" />
  </div>
);

export const ArtistGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ArtistSkeleton key={i} />
    ))}
  </div>
);

export const PlaylistHeaderSkeleton = () => (
  <div className="flex items-end gap-6 p-6">
    <Shimmer className="h-48 w-48 rounded-2xl flex-shrink-0" />
    <div className="flex-1 space-y-3">
      <Shimmer className="h-3 w-20" />
      <Shimmer className="h-8 w-3/5" />
      <Shimmer className="h-4 w-2/5" />
      <Shimmer className="h-3 w-1/4" />
    </div>
  </div>
);

export const PlayerSkeleton = () => (
  <div className="flex items-center gap-4 px-4 h-20">
    <Shimmer className="h-12 w-12 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Shimmer className="h-3.5 w-32" />
      <Shimmer className="h-3 w-20" />
    </div>
    <div className="flex gap-2">
      <Shimmer className="h-8 w-8 rounded-full" />
      <Shimmer className="h-8 w-8 rounded-full" />
      <Shimmer className="h-8 w-8 rounded-full" />
    </div>
  </div>
);
