'use client';

import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface AnimatedCardProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

/**
 * Animated card component with fade-in and slide-up animation.
 * Uses Motion library for smooth 60fps animations.
 */
function AnimatedCard({ className, children, delay = 0, duration = 0.25 }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // ease-out-expo
      }}
      className={cn('rounded-lg border bg-card p-4 text-card-foreground shadow-card', className)}
    >
      {children}
    </motion.div>
  );
}

export { AnimatedCard };
export type { AnimatedCardProps };
