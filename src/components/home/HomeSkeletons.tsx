import { cn } from '@/lib/utils';

const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn('rounded-lg bg-muted/50 shimmer', className)} />
);

export const ContinueListeningSkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-lg surface-elevated h-14">
        <Shimmer className="h-14 w-14 rounded-none rounded-l-lg flex-shrink-0" />
        <Shimmer className="h-3 w-20 flex-1 mr-3" />
      </div>
    ))}
  </div>
);

export const CarouselSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="flex gap-3 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[160px] sm:w-[180px] space-y-3">
        <Shimmer className="aspect-square w-full rounded-xl" />
        <Shimmer className="h-3.5 w-4/5" />
        <Shimmer className="h-3 w-3/5" />
      </div>
    ))}
  </div>
);

export const ArtistCarouselSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="flex gap-4 overflow-hidden">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex-shrink-0 flex flex-col items-center gap-2 w-[110px] sm:w-[130px]">
        <Shimmer className="h-24 w-24 sm:h-28 sm:w-28 rounded-full" />
        <Shimmer className="h-3 w-16" />
      </div>
    ))}
  </div>
);
