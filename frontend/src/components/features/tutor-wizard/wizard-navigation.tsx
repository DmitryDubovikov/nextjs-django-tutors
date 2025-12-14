'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useWizard } from './wizard-provider';

interface WizardNavigationProps {
  onSubmit?: () => void | Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Navigation buttons for the wizard (Previous, Next, Submit)
 */
export function WizardNavigation({ onSubmit, isSubmitting = false }: WizardNavigationProps) {
  const { prevStep, nextStep, isFirstStep, isLastStep, clearDraft } = useWizard();
  const [isValidating, setIsValidating] = useState(false);

  const handleNext = async () => {
    setIsValidating(true);
    try {
      if (isLastStep && onSubmit) {
        const isValid = await nextStep();
        if (isValid) {
          await onSubmit();
        }
      } else {
        await nextStep();
      }
    } finally {
      setIsValidating(false);
    }
  };

  const isLoading = isValidating || isSubmitting;

  return (
    <div className="mt-8 flex items-center justify-between border-border border-t pt-6">
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={clearDraft} disabled={isLoading}>
          Clear Form
        </Button>
      </div>

      <div className="flex gap-3">
        {!isFirstStep && (
          <Button type="button" variant="outline" onClick={prevStep} disabled={isLoading}>
            <ChevronLeftIcon />
            <span className="ml-1">Previous</span>
          </Button>
        )}

        <Button type="button" variant="primary" onClick={handleNext} disabled={isLoading}>
          {isLoading && <SpinnerIcon />}
          {!isLoading && (
            <>
              <span className="mr-1">{isLastStep ? 'Submit Profile' : 'Next'}</span>
              {!isLastStep && <ChevronRightIcon />}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/**
 * Chevron left icon
 */
function ChevronLeftIcon() {
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/**
 * Chevron right icon
 */
function ChevronRightIcon() {
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
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

/**
 * Loading spinner icon
 */
function SpinnerIcon() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
