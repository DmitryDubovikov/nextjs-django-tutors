'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useCallback, useId, useState } from 'react';

import { cn } from '@/lib/utils';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSize?: number; // in bytes
  onUpload: (file: File) => Promise<string>; // returns URL
  onSuccess?: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
  previewUrl?: string;
  helperText?: string;
}

/**
 * File upload component with drag and drop support.
 * Handles file upload to a backend endpoint and returns the URL.
 */
export function FileUpload({
  label,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
  onUpload,
  onSuccess,
  onError,
  className,
  previewUrl,
  helperText,
}: FileUploadProps) {
  const id = useId();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | undefined>(previewUrl);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (maxSize && file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return `File size must be less than ${maxSizeMB}MB`;
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const isAccepted = acceptedTypes.some((type) => {
          if (type.endsWith('/*')) {
            const category = type.replace('/*', '');
            return fileType.startsWith(category);
          }
          return type === fileType;
        });

        if (!isAccepted) {
          return `File type not accepted. Allowed: ${accept}`;
        }
      }

      return null;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        onError?.(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);
      }

      try {
        const url = await onUpload(file);
        onSuccess?.(url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setError(errorMessage);
        onError?.(errorMessage);
        setPreview(undefined);
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile, onUpload, onSuccess, onError]
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const clearPreview = useCallback(() => {
    setPreview(undefined);
    setError(null);
  }, []);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="font-medium text-sm">
          {label}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative rounded-lg border-2 border-dashed transition-colors',
          'flex min-h-[150px] flex-col items-center justify-center p-4',
          isDragging && 'border-primary-500 bg-primary-50',
          !isDragging && 'border-border hover:border-primary-300 hover:bg-muted/50',
          error && 'border-error'
        )}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Preview" className="max-h-32 rounded-md object-contain" />
            <button
              type="button"
              onClick={clearPreview}
              className="-top-2 -right-2 absolute flex h-6 w-6 items-center justify-center rounded-full bg-error text-white hover:bg-error/90"
              aria-label="Remove image"
            >
              <XIcon />
            </button>
          </div>
        ) : (
          <>
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <SpinnerIcon />
                <span className="text-muted-foreground text-sm">Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <UploadIcon className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <label
                    htmlFor={id}
                    className="cursor-pointer font-medium text-primary-600 text-sm hover:text-primary-700"
                  >
                    Click to upload
                  </label>
                  <span className="text-muted-foreground text-sm"> or drag and drop</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {accept.replace('image/*', 'PNG, JPG, GIF')} up to{' '}
                  {(maxSize / (1024 * 1024)).toFixed(0)}MB
                </span>
              </div>
            )}
          </>
        )}

        <input
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          disabled={isUploading}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <p id={`${id}-error`} className="text-error text-sm" role="alert">
          {error}
        </p>
      )}

      {!error && helperText && <p className="text-muted-foreground text-sm">{helperText}</p>}
    </div>
  );
}

/**
 * Upload cloud icon
 */
function UploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

/**
 * X icon
 */
function XIcon() {
  return (
    <svg
      className="h-3 w-3"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Loading spinner
 */
function SpinnerIcon() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-primary-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
