'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { NumberField, SelectField, TextField } from '@/components/ui/form-field';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';
import { SKILL_LEVELS } from '@/lib/schemas/tutor-profile';

const SKILL_LEVEL_OPTIONS = SKILL_LEVELS.map((level) => ({
  value: level,
  label: level.charAt(0).toUpperCase() + level.slice(1),
}));

interface SubjectFieldsProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

/**
 * Fields for a single subject entry
 */
function SubjectFields({ index, onRemove, canRemove }: SubjectFieldsProps) {
  const { control } = useFormContext<TutorProfileData>();

  return (
    <div className="relative rounded-lg border border-border bg-background p-4">
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="-top-2 -right-2 absolute flex h-6 w-6 items-center justify-center rounded-full bg-error text-white hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-error/30"
          aria-label="Remove subject"
        >
          <XIcon />
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name={`subjects.${index}.name`}
          control={control}
          label="Subject"
          placeholder="e.g., Mathematics"
        />

        <SelectField
          name={`subjects.${index}.level`}
          control={control}
          label="Level"
          placeholder="Select level"
          options={SKILL_LEVEL_OPTIONS}
        />

        <NumberField
          name={`subjects.${index}.hourlyRate`}
          control={control}
          label="Hourly Rate"
          placeholder="0"
          min={0}
          step={100}
        />
      </div>
    </div>
  );
}

/**
 * Step 2: Subjects
 * Allows tutors to add/remove subjects they teach with dynamic fields
 */
export function SubjectsStep() {
  const { control, formState } = useFormContext<TutorProfileData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subjects',
  });

  const addSubject = () => {
    append({ name: '', level: 'beginner', hourlyRate: 0 });
  };

  const subjectsError =
    formState.errors.subjects?.message || formState.errors.subjects?.root?.message;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Subjects You Teach</h2>
        <p className="text-muted-foreground">
          Add the subjects you can teach, along with your proficiency level and hourly rate.
        </p>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SubjectFields
                index={index}
                onRemove={() => remove(index)}
                canRemove={fields.length > 1}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {fields.length === 0 && (
          <div className="rounded-lg border-2 border-border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No subjects added yet. Add your first subject below.
            </p>
          </div>
        )}

        {subjectsError && (
          <p className="text-error text-sm" role="alert">
            {subjectsError}
          </p>
        )}

        <Button type="button" variant="outline" onClick={addSubject} className="w-full">
          <PlusIcon />
          <span className="ml-2">Add Subject</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Plus icon for adding subjects
 */
function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/**
 * X icon for removing subjects
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
