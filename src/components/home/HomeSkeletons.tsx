import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('rounded-lg bg-muted/50 shimmer', className)} />
);

export const ContinueListeningSkeleton = () => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] space-y-2">
        <Shimmer className="aspect-square w-full rounded-2xl" />
        <Shimmer className="h-3 w-4/5" />
        <Shimmer className="h-2.5 w-3/5" />
      </div>
    ))}
  </div>
);

export const CarouselSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px] space-y-2">
        <Shimmer className="aspect-square w-full rounded-2xl" />
        <Shimmer className="h-3 w-4/5" />
        <Shimmer className="h-2.5 w-3/5" />
      </div>
    ))}
  </div>
);

export const ArtistCarouselSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="flex gap-4 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-[90px] sm:w-[110px]">
        <Shimmer className="h-20 w-20 sm:h-24 sm:w-24 rounded-full" />
        <Shimmer className="h-2.5 w-14" />
      </div>
    ))}
  </div>
);
