'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

import { Card } from '@/components/ui/card';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';
import { AvailabilityStep } from './availability-step';
import { LocationStep } from './location-step';
import { PersonalInfoStep } from './personal-info-step';
import { PricingStep } from './pricing-step';
import { SubjectsStep } from './subjects-step';
import { WizardNavigation } from './wizard-navigation';
import { WizardProvider, useWizard } from './wizard-provider';
import { WizardSteps } from './wizard-steps';

const STEP_COMPONENTS = [
  PersonalInfoStep,
  SubjectsStep,
  PricingStep,
  LocationStep,
  AvailabilityStep,
];

/**
 * Inner wizard content with step rendering
 */
function TutorWizardContent() {
  const { currentStep } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // The actual submission happens via the WizardProvider's onSubmit
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="mx-auto max-w-3xl">
      <WizardSteps />

      <Card className="p-6 sm:p-8">
        <form onSubmit={(e) => e.preventDefault()}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {StepComponent && <StepComponent />}
            </motion.div>
          </AnimatePresence>

          <WizardNavigation onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </form>
      </Card>
    </div>
  );
}

interface TutorWizardProps {
  onSubmit: (data: TutorProfileData) => Promise<void>;
}

/**
 * Complete tutor profile wizard component.
 * Handles multi-step form for creating/editing tutor profiles.
 */
export function TutorWizard({ onSubmit }: TutorWizardProps) {
  return (
    <WizardProvider onSubmit={onSubmit}>
      <TutorWizardContent />
    </WizardProvider>
  );
}
