'use client';

import { useFormContext } from 'react-hook-form';

import { NumberField, SelectField } from '@/components/ui/form-field';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';
import { CLASS_TYPES, TEACHING_FORMATS } from '@/lib/schemas/tutor-profile';

const TEACHING_FORMAT_OPTIONS = TEACHING_FORMATS.map((format) => ({
  value: format,
  label:
    format === 'both' ? 'Both Online & Offline' : format.charAt(0).toUpperCase() + format.slice(1),
}));

const CLASS_TYPE_OPTIONS = CLASS_TYPES.map((type) => ({
  value: type,
  label: type === 'both' ? 'Both Individual & Group' : type.charAt(0).toUpperCase() + type.slice(1),
}));

/**
 * Step 3: Pricing and Formats
 * Configures pricing, teaching format, and class types
 */
export function PricingStep() {
  const { control, watch } = useFormContext<TutorProfileData>();

  const classType = watch('classType');
  const showGroupDiscount = classType === 'group' || classType === 'both';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Pricing & Format</h2>
        <p className="text-muted-foreground">
          Set your default pricing and preferred teaching formats.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <NumberField
          name="defaultHourlyRate"
          control={control}
          label="Default Hourly Rate"
          placeholder="1500"
          min={0}
          step={100}
          helperText="Your standard rate per hour. Subject-specific rates can differ."
        />

        <NumberField
          name="trialLessonPrice"
          control={control}
          label="Trial Lesson Price"
          placeholder="500"
          min={0}
          step={100}
          helperText="Optional. Price for a trial/introductory lesson."
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="teachingFormat"
          control={control}
          label="Teaching Format"
          placeholder="Select format"
          options={TEACHING_FORMAT_OPTIONS}
          helperText="Where do you prefer to teach?"
        />

        <SelectField
          name="classType"
          control={control}
          label="Class Type"
          placeholder="Select type"
          options={CLASS_TYPE_OPTIONS}
          helperText="Individual sessions, groups, or both?"
        />
      </div>

      {showGroupDiscount && (
        <NumberField
          name="groupDiscount"
          control={control}
          label="Group Discount (%)"
          placeholder="10"
          min={0}
          max={100}
          step={5}
          helperText="Optional. Percentage discount for group lessons."
        />
      )}

      <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
        <h3 className="font-medium text-primary-900 text-sm">Pricing Tips</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-primary-800 text-sm">
          <li>Research market rates for your subjects in your area</li>
          <li>Consider offering a lower trial lesson price to attract new students</li>
          <li>Group lessons typically offer 10-20% discount per person</li>
        </ul>
      </div>
    </div>
  );
}
