'use client';

import { cn } from '@/lib/utils';
import { useWizard } from './wizard-provider';

/**
 * Visual step indicator showing progress through the wizard
 */
export function WizardSteps() {
  const { currentStep, totalSteps, stepTitles, goToStep } = useWizard();

  return (
    <nav aria-label="Wizard progress" className="mb-8">
      {/* Desktop view */}
      <ol className="hidden items-center justify-between sm:flex">
        {stepTitles.map((title, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = index <= currentStep;

          return (
            <li key={title} className="flex items-center">
              <button
                type="button"
                onClick={() => isClickable && goToStep(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2',
                  isClickable && 'cursor-pointer',
                  !isClickable && 'cursor-not-allowed opacity-50'
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm',
                    'transition-colors',
                    isCompleted && 'bg-primary-500 text-white',
                    isCurrent && 'border-2 border-primary-500 bg-primary-50 text-primary-700',
                    !isCompleted &&
                      !isCurrent &&
                      'border border-border bg-background text-muted-foreground'
                  )}
                >
                  {isCompleted ? <CheckIcon /> : index + 1}
                </span>
                <span
                  className={cn(
                    'hidden font-medium text-sm lg:block',
                    isCurrent ? 'text-primary-700' : 'text-muted-foreground'
                  )}
                >
                  {title}
                </span>
              </button>

              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 w-12 xl:w-20',
                    isCompleted ? 'bg-primary-500' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile view */}
      <div className="flex items-center justify-between sm:hidden">
        <span className="font-medium text-sm">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-muted-foreground text-sm">{stepTitles[currentStep]}</span>
      </div>

      {/* Progress bar for mobile */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted sm:hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-300"
          style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          role="progressbar"
          tabIndex={0}
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
        />
      </div>
    </nav>
  );
}

/**
 * Check icon for completed steps
 */
function CheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
