'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { NumberField, SelectField, TextField } from '@/components/ui/form-field';
import type { TutorProfileData } from '@/lib/schemas/tutor-profile';
import { DAYS_OF_WEEK } from '@/lib/schemas/tutor-profile';
import { cn } from '@/lib/utils';

const DAY_OPTIONS = DAYS_OF_WEEK.map((day) => ({
  value: day,
  label: day.charAt(0).toUpperCase() + day.slice(1),
}));

const TIMEZONE_OPTIONS = [
  { value: 'Europe/Moscow', label: 'Moscow (UTC+3)' },
  { value: 'Europe/London', label: 'London (UTC+0)' },
  { value: 'Europe/Paris', label: 'Paris (UTC+1)' },
  { value: 'Europe/Berlin', label: 'Berlin (UTC+1)' },
  { value: 'America/New_York', label: 'New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (UTC+9)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (UTC+8)' },
];

interface TimeSlotFieldsProps {
  index: number;
  onRemove: () => void;
}

/**
 * Fields for a single time slot entry
 */
function TimeSlotFields({ index, onRemove }: TimeSlotFieldsProps) {
  const { control } = useFormContext<TutorProfileData>();

  return (
    <div className="relative flex items-end gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex-1">
        <SelectField
          name={`availableSlots.${index}.day`}
          control={control}
          label="Day"
          placeholder="Select day"
          options={DAY_OPTIONS}
        />
      </div>

      <div className="w-28">
        <TextField
          name={`availableSlots.${index}.startTime`}
          control={control}
          label="Start"
          placeholder="09:00"
        />
      </div>

      <div className="w-28">
        <TextField
          name={`availableSlots.${index}.endTime`}
          control={control}
          label="End"
          placeholder="18:00"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:border-error hover:bg-error/10 hover:text-error"
        aria-label="Remove time slot"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

/**
 * Quick add buttons for common availability patterns
 */
interface QuickAddProps {
  onAdd: (
    slots: Array<{ day: (typeof DAYS_OF_WEEK)[number]; startTime: string; endTime: string }>
  ) => void;
}

function QuickAdd({ onAdd }: QuickAddProps) {
  const addWeekdayMornings = useCallback(() => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
    onAdd(weekdays.map((day) => ({ day, startTime: '09:00', endTime: '12:00' })));
  }, [onAdd]);

  const addWeekdayAfternoons = useCallback(() => {
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
    onAdd(weekdays.map((day) => ({ day, startTime: '14:00', endTime: '18:00' })));
  }, [onAdd]);

  const addWeekends = useCallback(() => {
    const weekends = ['saturday', 'sunday'] as const;
    onAdd(weekends.map((day) => ({ day, startTime: '10:00', endTime: '16:00' })));
  }, [onAdd]);

  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-muted-foreground text-sm">Quick add:</span>
      <button
        type="button"
        onClick={addWeekdayMornings}
        className={cn(
          'rounded-full border border-border px-3 py-1 text-sm',
          'hover:border-primary-300 hover:bg-primary-50'
        )}
      >
        Weekday Mornings
      </button>
      <button
        type="button"
        onClick={addWeekdayAfternoons}
        className={cn(
          'rounded-full border border-border px-3 py-1 text-sm',
          'hover:border-primary-300 hover:bg-primary-50'
        )}
      >
        Weekday Afternoons
      </button>
      <button
        type="button"
        onClick={addWeekends}
        className={cn(
          'rounded-full border border-border px-3 py-1 text-sm',
          'hover:border-primary-300 hover:bg-primary-50'
        )}
      >
        Weekends
      </button>
    </div>
  );
}

/**
 * Step 5: Availability/Schedule
 * Configures tutor's available time slots
 */
export function AvailabilityStep() {
  const { control } = useFormContext<TutorProfileData>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'availableSlots',
  });

  const addSlot = () => {
    append({ day: 'monday', startTime: '09:00', endTime: '18:00' });
  };

  const addMultipleSlots = useCallback(
    (slots: Array<{ day: (typeof DAYS_OF_WEEK)[number]; startTime: string; endTime: string }>) => {
      for (const slot of slots) {
        append(slot);
      }
    },
    [append]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-semibold text-xl">Availability</h2>
        <p className="text-muted-foreground">
          Set your regular availability so students know when they can book lessons with you.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <SelectField
          name="timezone"
          control={control}
          label="Timezone"
          placeholder="Select timezone"
          options={TIMEZONE_OPTIONS}
        />

        <NumberField
          name="minNoticeHours"
          control={control}
          label="Minimum Notice (hours)"
          placeholder="24"
          min={0}
          step={1}
          helperText="How much advance notice do you need for bookings?"
        />
      </div>

      <NumberField
        name="maxBookingsPerDay"
        control={control}
        label="Maximum Bookings Per Day"
        placeholder="8"
        min={1}
        step={1}
        helperText="Limit daily lessons to avoid overwork."
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Available Time Slots</h3>
          <QuickAdd onAdd={addMultipleSlots} />
        </div>

        <AnimatePresence mode="popLayout">
          {fields.map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <TimeSlotFields index={index} onRemove={() => remove(index)} />
            </motion.div>
          ))}
        </AnimatePresence>

        {fields.length === 0 && (
          <div className="rounded-lg border-2 border-border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No time slots added yet. Add your available times below.
            </p>
          </div>
        )}

        <Button type="button" variant="outline" onClick={addSlot} className="w-full">
          <PlusIcon />
          <span className="ml-2">Add Time Slot</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * Plus icon for adding slots
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
 * Trash icon for removing slots
 */
function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
