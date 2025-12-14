'use client';

import { useFormContext } from 'react-hook-form';

import { TextField, TextareaField } from '@/components/ui/form-field';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';

/**
 * Step 1: Personal Information
 * Collects basic tutor information like name, phone, bio, and avatar
 */
export function PersonalInfoStep() {
  const { control } = useFormContext<TutorProfileData>();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Personal Information</h2>
        <p className="text-muted-foreground">
          Tell us about yourself so students can get to know you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="firstName"
          control={control}
          label="First Name"
          placeholder="Enter your first name"
        />
        <TextField
          name="lastName"
          control={control}
          label="Last Name"
          placeholder="Enter your last name"
        />
      </div>

      <TextField
        name="phone"
        control={control}
        type="tel"
        label="Phone Number"
        placeholder="+7 999 123 4567"
        helperText="Optional. We'll use this to contact you about bookings."
      />

      <TextField
        name="avatarUrl"
        control={control}
        type="url"
        label="Avatar URL"
        placeholder="https://example.com/avatar.jpg"
        helperText="Optional. Link to your profile photo."
      />

      <TextareaField
        name="bio"
        control={control}
        label="Bio"
        placeholder="Tell students about your experience, teaching style, and what makes you a great tutor..."
        rows={6}
        helperText="Minimum 50 characters. A compelling bio helps you stand out."
      />
    </div>
  );
}
