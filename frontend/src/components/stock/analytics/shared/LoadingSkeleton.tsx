'use client';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton = ({ className = '' }: LoadingSkeletonProps) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

export default LoadingSkeleton;