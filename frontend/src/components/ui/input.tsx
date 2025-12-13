import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef, useId, useState } from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showPasswordToggle?: boolean;
}

/**
 * Compute the aria-describedby value for the input.
 */
function getAriaDescribedBy(
  hasError: boolean,
  helperText: string | undefined,
  errorId: string,
  helperId: string
): string | undefined {
  if (hasError) return errorId;
  if (helperText) return helperId;
  return undefined;
}

/**
 * Render the right side content (password toggle or icon).
 */
function RightContent({
  isPassword,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  rightIcon,
}: {
  isPassword: boolean;
  showPasswordToggle: boolean | undefined;
  showPassword: boolean;
  onTogglePassword: () => void;
  rightIcon: ReactNode;
}) {
  if (isPassword && showPasswordToggle) {
    return (
      <button
        type="button"
        onClick={onTogglePassword}
        className="-translate-y-1/2 absolute top-1/2 right-3 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    );
  }

  if (rightIcon) {
    return (
      <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 text-muted-foreground">
        {rightIcon}
      </span>
    );
  }

  return null;
}

/**
 * A text input component with label, error state, helper text, and icon support.
 * Includes password visibility toggle variant.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      showPasswordToggle,
      disabled,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId ?? generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const [showPassword, setShowPassword] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const hasError = Boolean(error);
    const hasRightContent = rightIcon || (isPassword && showPasswordToggle);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className={cn(
              'font-medium text-sm',
              hasError ? 'text-error' : 'text-foreground',
              disabled && 'opacity-50'
            )}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-muted-foreground">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={getAriaDescribedBy(hasError, helperText, errorId, helperId)}
            className={cn(
              'flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm',
              'transition-colors placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              hasError ? 'border-error focus-visible:ring-error/30' : 'border-border',
              leftIcon && 'pl-10',
              hasRightContent && 'pr-10',
              className
            )}
            {...props}
          />

          <RightContent
            isPassword={isPassword}
            showPasswordToggle={showPasswordToggle}
            showPassword={showPassword}
            onTogglePassword={() => setShowPassword((prev) => !prev)}
            rightIcon={rightIcon}
          />
        </div>

        {hasError && (
          <p id={errorId} className="text-error text-sm" role="alert">
            {error}
          </p>
        )}

        {!hasError && helperText && (
          <p id={helperId} className="text-muted-foreground text-sm">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

/**
 * Eye icon for showing password.
 */
function EyeIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/**
 * Eye off icon for hiding password.
 */
function EyeOffIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export { Input };
