'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import {
  type TutorProfileData,
  WIZARD_STEP_SCHEMAS,
  type WizardStep,
  defaultTutorProfile,
  tutorProfileSchema,
} from '@/lib/schemas/tutor-profile';

const STORAGE_KEY = 'tutor-profile-draft';
const WIZARD_STEPS = ['Personal Info', 'Subjects', 'Pricing', 'Location', 'Schedule'] as const;

interface WizardContextValue {
  currentStep: number;
  totalSteps: number;
  stepTitles: readonly string[];
  goToStep: (step: number) => void;
  nextStep: () => Promise<boolean>;
  prevStep: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  clearDraft: () => void;
  saveDraft: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

/**
 * Load draft data from localStorage
 */
function loadDraftFromStorage(): Partial<TutorProfileData> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<TutorProfileData>;
    }
  } catch {
    // Invalid stored data, ignore
  }
  return {};
}

/**
 * Save draft data to localStorage
 */
function saveDraftToStorage(data: Partial<TutorProfileData>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage full or unavailable, ignore
  }
}

/**
 * Clear draft data from localStorage
 */
function clearDraftFromStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable, ignore
  }
}

interface WizardProviderProps {
  children: ReactNode;
  onSubmit?: (data: TutorProfileData) => void | Promise<void>;
}

/**
 * Provider component for the tutor profile wizard.
 * Manages form state, step navigation, and draft persistence.
 */
export function WizardProvider({ children, onSubmit }: WizardProviderProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<TutorProfileData>({
    // biome-ignore lint/suspicious/noExplicitAny: Zod v4 + resolver type mismatch
    resolver: zodResolver(tutorProfileSchema) as any,
    mode: 'onChange',
    defaultValues: defaultTutorProfile,
  });

  // Load draft from storage on mount
  useEffect(() => {
    const draft = loadDraftFromStorage();
    if (Object.keys(draft).length > 0) {
      methods.reset({ ...defaultTutorProfile, ...draft });
    }
  }, [methods]);

  // Auto-save to localStorage on form changes (debounced to avoid performance issues)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const subscription = methods.watch((data) => {
      // Debounce the save operation by 500ms
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveDraftToStorage(data as Partial<TutorProfileData>);
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [methods]);

  const saveDraft = useCallback(() => {
    const data = methods.getValues();
    saveDraftToStorage(data);
  }, [methods]);

  const clearDraft = useCallback(() => {
    clearDraftFromStorage();
    methods.reset(defaultTutorProfile);
    setCurrentStep(0);
  }, [methods]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < WIZARD_STEPS.length) {
      setCurrentStep(step);
    }
  }, []);

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    const stepSchema = WIZARD_STEP_SCHEMAS[currentStep as WizardStep];
    const currentData = methods.getValues();

    try {
      stepSchema.parse(currentData);
      return true;
    } catch {
      // Trigger validation to show errors
      await methods.trigger();
      return false;
    }
  }, [currentStep, methods]);

  const nextStep = useCallback(async (): Promise<boolean> => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      if (currentStep < WIZARD_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else if (onSubmit) {
        // Final step - submit form
        const data = methods.getValues();
        await onSubmit(data);
      }
      return true;
    }
    return false;
  }, [currentStep, validateCurrentStep, onSubmit, methods]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const contextValue = useMemo<WizardContextValue>(
    () => ({
      currentStep,
      totalSteps: WIZARD_STEPS.length,
      stepTitles: WIZARD_STEPS,
      goToStep,
      nextStep,
      prevStep,
      isFirstStep: currentStep === 0,
      isLastStep: currentStep === WIZARD_STEPS.length - 1,
      clearDraft,
      saveDraft,
    }),
    [currentStep, goToStep, nextStep, prevStep, clearDraft, saveDraft]
  );

  return (
    <WizardContext.Provider value={contextValue}>
      <FormProvider {...methods}>{children}</FormProvider>
    </WizardContext.Provider>
  );
}

/**
 * Hook to access wizard context
 */
export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

/**
 * Re-export form hooks for convenience
 */
export { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
