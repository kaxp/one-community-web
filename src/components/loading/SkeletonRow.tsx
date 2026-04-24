import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';

interface Props {
  columns?: number;
  className?: string;
}

export function SkeletonRow({ columns = 3, className }: Props) {
  return (
    <div className={cn('flex items-center gap-3 py-3', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
