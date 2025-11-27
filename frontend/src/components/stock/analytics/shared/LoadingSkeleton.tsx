'use client';

import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton = ({ className }: LoadingSkeletonProps) => (
  <div
    className={cn(
      "animate-pulse rounded-xl bg-gray-200/60",
      className
    )}
  />
);

export default LoadingSkeleton;