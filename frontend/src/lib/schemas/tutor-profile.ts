import { z } from 'zod';

/**
 * Schema for personal information step
 */
export const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  lastName: z.string().min(2, 'Minimum 2 characters').max(50, 'Maximum 50 characters'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Invalid phone format')
    .optional()
    .or(z.literal('')),
  bio: z.string().min(50, 'Minimum 50 characters').max(1000, 'Maximum 1000 characters'),
  avatarUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
});

export type PersonalInfoData = z.infer<typeof personalInfoSchema>;

/**
 * Skill level options for subjects
 */
export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

/**
 * Schema for a single subject entry
 */
export const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  level: z.enum(SKILL_LEVELS, { error: 'Select a level' }),
  hourlyRate: z.number({ error: 'Enter a valid number' }).min(0, 'Rate must be positive'),
});

export type SubjectData = z.infer<typeof subjectSchema>;

/**
 * Schema for subjects step (array of subjects)
 */
export const subjectsStepSchema = z.object({
  subjects: z.array(subjectSchema).min(1, 'Add at least one subject'),
});

export type SubjectsStepData = z.infer<typeof subjectsStepSchema>;

/**
 * Teaching format options
 */
export const TEACHING_FORMATS = ['online', 'offline', 'both'] as const;
export type TeachingFormat = (typeof TEACHING_FORMATS)[number];

/**
 * Class type options
 */
export const CLASS_TYPES = ['individual', 'group', 'both'] as const;
export type ClassType = (typeof CLASS_TYPES)[number];

/**
 * Schema for pricing and formats step
 */
export const pricingSchema = z.object({
  defaultHourlyRate: z.number({ error: 'Enter a valid number' }).min(0, 'Rate must be positive'),
  teachingFormat: z.enum(TEACHING_FORMATS, { error: 'Select a format' }),
  classType: z.enum(CLASS_TYPES, { error: 'Select a class type' }),
  groupDiscount: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Discount must be positive')
    .max(100, 'Discount cannot exceed 100%')
    .optional(),
  trialLessonPrice: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Price must be positive')
    .optional(),
});

export type PricingData = z.infer<typeof pricingSchema>;

/**
 * Schema for location step
 */
export const locationSchema = z.object({
  city: z.string().min(1, 'City is required'),
  district: z.string().optional(),
  willingToTravel: z.boolean().default(false),
  maxTravelDistance: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Distance must be positive')
    .optional(),
  canHostStudents: z.boolean().default(false),
});

export type LocationData = z.infer<typeof locationSchema>;

/**
 * Day of week type for schedule
 */
export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

/**
 * Schema for a time slot in the schedule
 */
export const timeSlotSchema = z
  .object({
    day: z.enum(DAYS_OF_WEEK),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  })
  .refine(
    (data) => {
      // Validate that endTime is after startTime
      const startParts = data.startTime.split(':').map(Number);
      const endParts = data.endTime.split(':').map(Number);
      const startMinutes = (startParts[0] ?? 0) * 60 + (startParts[1] ?? 0);
      const endMinutes = (endParts[0] ?? 0) * 60 + (endParts[1] ?? 0);
      return endMinutes > startMinutes;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export type TimeSlotData = z.infer<typeof timeSlotSchema>;

/**
 * Schema for availability/schedule step
 */
export const availabilitySchema = z.object({
  availableSlots: z.array(timeSlotSchema).default([]),
  timezone: z.string().default('Europe/Moscow'),
  minNoticeHours: z
    .number({ error: 'Enter a valid number' })
    .min(0, 'Must be positive')
    .default(24),
  maxBookingsPerDay: z
    .number({ error: 'Enter a valid number' })
    .min(1, 'Must be at least 1')
    .default(8),
});

export type AvailabilityData = z.infer<typeof availabilitySchema>;

/**
 * Complete tutor profile schema combining all steps
 */
export const tutorProfileSchema = personalInfoSchema
  .merge(subjectsStepSchema)
  .merge(pricingSchema)
  .merge(locationSchema)
  .merge(availabilitySchema);

export type TutorProfileData = z.infer<typeof tutorProfileSchema>;

/**
 * Default values for the wizard form
 */
export const defaultTutorProfile: TutorProfileData = {
  // Personal Info
  firstName: '',
  lastName: '',
  phone: '',
  bio: '',
  avatarUrl: '',
  // Subjects
  subjects: [],
  // Pricing
  defaultHourlyRate: 0,
  teachingFormat: 'online',
  classType: 'individual',
  groupDiscount: undefined,
  trialLessonPrice: undefined,
  // Location
  city: '',
  district: '',
  willingToTravel: false,
  maxTravelDistance: undefined,
  canHostStudents: false,
  // Availability
  availableSlots: [],
  timezone: 'Europe/Moscow',
  minNoticeHours: 24,
  maxBookingsPerDay: 8,
};

/**
 * Step-specific schemas for partial validation
 */
export const WIZARD_STEP_SCHEMAS = {
  0: personalInfoSchema,
  1: subjectsStepSchema,
  2: pricingSchema,
  3: locationSchema,
  4: availabilitySchema,
} as const;

export type WizardStep = keyof typeof WIZARD_STEP_SCHEMAS;
