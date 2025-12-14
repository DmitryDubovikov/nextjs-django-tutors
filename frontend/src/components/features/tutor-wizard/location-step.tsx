'use client';

import { useFormContext } from 'react-hook-form';

import { CheckboxField, NumberField, TextField } from '@/components/ui/form-field';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';

/**
 * Step 4: Location
 * Configures tutor's location and travel preferences
 */
export function LocationStep() {
  const { control, watch } = useFormContext<TutorProfileData>();

  const willingToTravel = watch('willingToTravel');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Location</h2>
        <p className="text-muted-foreground">
          Let students know where you're located and your travel preferences.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="city" control={control} label="City" placeholder="e.g., Moscow" />

        <TextField
          name="district"
          control={control}
          label="District / Area"
          placeholder="e.g., Central"
          helperText="Optional. Helps students find nearby tutors."
        />
      </div>

      <div className="space-y-4">
        <CheckboxField
          name="canHostStudents"
          control={control}
          label="I can host students at my location"
          description="Check if you have a place where students can come for lessons."
        />

        <CheckboxField
          name="willingToTravel"
          control={control}
          label="I am willing to travel to students"
          description="Check if you can travel to meet students at their location."
        />
      </div>

      {willingToTravel && (
        <NumberField
          name="maxTravelDistance"
          control={control}
          label="Maximum Travel Distance (km)"
          placeholder="10"
          min={0}
          step={1}
          helperText="How far are you willing to travel for lessons?"
        />
      )}

      <div className="rounded-lg border border-border bg-muted/50 p-4">
        <h3 className="font-medium text-sm">Location Privacy</h3>
        <p className="mt-1 text-muted-foreground text-sm">
          Your exact address is never shared with students. Only your city and district are
          displayed on your public profile. Students can see if you offer in-person lessons and
          whether you can travel to them.
        </p>
      </div>
    </div>
  );
}
