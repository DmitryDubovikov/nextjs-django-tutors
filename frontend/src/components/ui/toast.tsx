'use client';

import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';

import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Show a toast notification.
 *
 * @param options - Toast configuration options
 * @returns Toast ID for programmatic dismissal
 */
function toast({ title, description, variant = 'default', duration = 5000, action }: ToastOptions) {
  const content = (
    <div className="flex flex-col gap-1">
      {title && <p className="font-semibold">{title}</p>}
      {description && <p className="text-sm opacity-90">{description}</p>}
    </div>
  );

  const options = {
    duration,
    action: action
      ? {
          label: action.label,
          onClick: action.onClick,
        }
      : undefined,
  };

  switch (variant) {
    case 'success':
      return sonnerToast.success(content, options);
    case 'error':
      return sonnerToast.error(content, options);
    case 'warning':
      return sonnerToast.warning(content, options);
    case 'info':
      return sonnerToast.info(content, options);
    default:
      return sonnerToast(content, options);
  }
}

/**
 * Dismiss a toast by ID or dismiss all toasts.
 */
toast.dismiss = sonnerToast.dismiss;

/**
 * Show a promise toast with loading, success, and error states.
 */
toast.promise = sonnerToast.promise;

interface ToasterProps {
  position?:
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';
  expand?: boolean;
  richColors?: boolean;
  closeButton?: boolean;
  offset?: string;
}

/**
 * Toast container component. Add to app layout.
 * Uses Sonner for toast functionality with custom styling.
 */
function Toaster({
  position = 'bottom-right',
  expand = false,
  richColors = true,
  closeButton = true,
  offset = '16px',
}: ToasterProps) {
  return (
    <SonnerToaster
      position={position}
      expand={expand}
      richColors={richColors}
      closeButton={closeButton}
      offset={offset}
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground',
            'group-[.toaster]:border-border group-[.toaster]:shadow-dropdown'
          ),
          title: 'group-[.toast]:font-semibold',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton: cn(
            'group-[.toast]:bg-transparent group-[.toast]:text-foreground',
            'group-[.toast]:hover:bg-muted'
          ),
          success: 'group-[.toaster]:border-success/30 group-[.toaster]:bg-success/10',
          error: 'group-[.toaster]:border-error/30 group-[.toaster]:bg-error/10',
          warning: 'group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/10',
          info: 'group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/10',
        },
      }}
    />
  );
}

export { toast, Toaster, type ToastVariant, type ToastOptions };
