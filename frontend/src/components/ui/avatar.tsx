'use client';

import type { HTMLAttributes, ImgHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';

import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          sizeStyles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = 'Avatar';

interface AvatarImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  alt: string;
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, onLoadingStatusChange, ...props }, ref) => {
    const [hasError, setHasError] = useState(false);

    if (!src || hasError) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        className={cn('aspect-square h-full w-full object-cover', className)}
        onError={() => {
          setHasError(true);
          onLoadingStatusChange?.('error');
        }}
        onLoad={() => onLoadingStatusChange?.('loaded')}
        {...props}
        alt={alt}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  name?: string;
}

const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, name, children, ...props }, ref) => {
    const initials = name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
          className
        )}
        {...props}
      >
        {children || initials}
      </div>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarImage, AvatarFallback };
export type { AvatarProps, AvatarSize };
