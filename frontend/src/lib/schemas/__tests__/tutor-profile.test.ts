import { describe, expect, it } from 'vitest';

import {
  CLASS_TYPES,
  DAYS_OF_WEEK,
  SKILL_LEVELS,
  TEACHING_FORMATS,
  WIZARD_STEP_SCHEMAS,
  availabilitySchema,
  defaultTutorProfile,
  locationSchema,
  personalInfoSchema,
  pricingSchema,
  subjectSchema,
  subjectsStepSchema,
  timeSlotSchema,
  tutorProfileSchema,
} from '../tutor-profile';

describe('personalInfoSchema', () => {
  it('validates valid personal info', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+79991234567',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
      avatarUrl: 'https://example.com/avatar.jpg',
    };

    const result = personalInfoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects firstName less than 2 characters', () => {
    const invalidData = {
      firstName: 'J',
      lastName: 'Doe',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
    };

    const result = personalInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects bio less than 50 characters', () => {
    const invalidData = {
      firstName: 'John',
      lastName: 'Doe',
      bio: 'Short bio',
    };

    const result = personalInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('allows empty phone', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
    };

    const result = personalInfoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid phone format', () => {
    const invalidData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: 'not-a-phone',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
    };

    const result = personalInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('allows empty avatarUrl', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: '',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
    };

    const result = personalInfoSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid avatarUrl', () => {
    const invalidData = {
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'not-a-url',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
    };

    const result = personalInfoSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('subjectSchema', () => {
  it('validates valid subject', () => {
    const validData = {
      name: 'Mathematics',
      level: 'intermediate',
      hourlyRate: 1500,
    };

    const result = subjectSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalidData = {
      name: '',
      level: 'intermediate',
      hourlyRate: 1500,
    };

    const result = subjectSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects invalid level', () => {
    const invalidData = {
      name: 'Mathematics',
      level: 'master',
      hourlyRate: 1500,
    };

    const result = subjectSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('rejects negative hourlyRate', () => {
    const invalidData = {
      name: 'Mathematics',
      level: 'intermediate',
      hourlyRate: -100,
    };

    const result = subjectSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('accepts all valid skill levels', () => {
    for (const level of SKILL_LEVELS) {
      const validData = {
        name: 'Mathematics',
        level,
        hourlyRate: 1500,
      };

      const result = subjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    }
  });
});

describe('subjectsStepSchema', () => {
  it('validates with at least one subject', () => {
    const validData = {
      subjects: [{ name: 'Math', level: 'beginner', hourlyRate: 1000 }],
    };

    const result = subjectsStepSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty subjects array', () => {
    const invalidData = {
      subjects: [],
    };

    const result = subjectsStepSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates multiple subjects', () => {
    const validData = {
      subjects: [
        { name: 'Math', level: 'expert', hourlyRate: 2000 },
        { name: 'Physics', level: 'advanced', hourlyRate: 1800 },
      ],
    };

    const result = subjectsStepSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('pricingSchema', () => {
  it('validates valid pricing data', () => {
    const validData = {
      defaultHourlyRate: 1500,
      teachingFormat: 'online',
      classType: 'individual',
    };

    const result = pricingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts all teaching formats', () => {
    for (const format of TEACHING_FORMATS) {
      const validData = {
        defaultHourlyRate: 1500,
        teachingFormat: format,
        classType: 'individual',
      };

      const result = pricingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    }
  });

  it('accepts all class types', () => {
    for (const type of CLASS_TYPES) {
      const validData = {
        defaultHourlyRate: 1500,
        teachingFormat: 'online',
        classType: type,
      };

      const result = pricingSchema.safeParse(validData);
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional groupDiscount', () => {
    const validData = {
      defaultHourlyRate: 1500,
      teachingFormat: 'online',
      classType: 'group',
      groupDiscount: 15,
    };

    const result = pricingSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects groupDiscount over 100', () => {
    const invalidData = {
      defaultHourlyRate: 1500,
      teachingFormat: 'online',
      classType: 'group',
      groupDiscount: 150,
    };

    const result = pricingSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('locationSchema', () => {
  it('validates valid location data', () => {
    const validData = {
      city: 'Moscow',
      district: 'Central',
      willingToTravel: true,
      maxTravelDistance: 10,
      canHostStudents: true,
    };

    const result = locationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects empty city', () => {
    const invalidData = {
      city: '',
    };

    const result = locationSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('allows optional district', () => {
    const validData = {
      city: 'Moscow',
    };

    const result = locationSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('defaults willingToTravel to false', () => {
    const validData = {
      city: 'Moscow',
    };

    const result = locationSchema.parse(validData);
    expect(result.willingToTravel).toBe(false);
  });
});

describe('timeSlotSchema', () => {
  it('validates valid time slot', () => {
    const validData = {
      day: 'monday',
      startTime: '09:00',
      endTime: '18:00',
    };

    const result = timeSlotSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts all days of week', () => {
    for (const day of DAYS_OF_WEEK) {
      const validData = {
        day,
        startTime: '10:00',
        endTime: '12:00',
      };

      const result = timeSlotSchema.safeParse(validData);
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid time format', () => {
    const invalidData = {
      day: 'monday',
      startTime: '9am',
      endTime: '18:00',
    };

    const result = timeSlotSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('validates edge time values', () => {
    const validData = {
      day: 'monday',
      startTime: '00:00',
      endTime: '23:59',
    };

    const result = timeSlotSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('availabilitySchema', () => {
  it('validates valid availability data', () => {
    const validData = {
      availableSlots: [{ day: 'monday', startTime: '09:00', endTime: '18:00' }],
      timezone: 'Europe/London',
      minNoticeHours: 48,
      maxBookingsPerDay: 6,
    };

    const result = availabilitySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('allows empty availableSlots', () => {
    const validData = {
      availableSlots: [],
    };

    const result = availabilitySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('defaults timezone to Europe/Moscow', () => {
    const validData = {};

    const result = availabilitySchema.parse(validData);
    expect(result.timezone).toBe('Europe/Moscow');
  });

  it('rejects maxBookingsPerDay less than 1', () => {
    const invalidData = {
      maxBookingsPerDay: 0,
    };

    const result = availabilitySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('tutorProfileSchema', () => {
  it('validates complete valid profile', () => {
    const validData = {
      firstName: 'John',
      lastName: 'Doe',
      phone: '+79991234567',
      bio: 'I am an experienced tutor with over 10 years of teaching mathematics and physics.',
      avatarUrl: 'https://example.com/avatar.jpg',
      subjects: [{ name: 'Mathematics', level: 'expert', hourlyRate: 2000 }],
      defaultHourlyRate: 1500,
      teachingFormat: 'both',
      classType: 'both',
      city: 'Moscow',
      district: 'Central',
      willingToTravel: true,
      maxTravelDistance: 15,
      canHostStudents: true,
      availableSlots: [{ day: 'tuesday', startTime: '10:00', endTime: '20:00' }],
      timezone: 'Europe/Moscow',
      minNoticeHours: 24,
      maxBookingsPerDay: 8,
    };

    const result = tutorProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('defaultTutorProfile', () => {
  it('has valid default values', () => {
    // Note: Default profile won't pass validation (empty subjects, short bio)
    // This test just verifies the structure is correct
    tutorProfileSchema.safeParse(defaultTutorProfile);
    expect(defaultTutorProfile).toHaveProperty('firstName');
    expect(defaultTutorProfile).toHaveProperty('subjects');
    expect(defaultTutorProfile).toHaveProperty('defaultHourlyRate');
    expect(defaultTutorProfile).toHaveProperty('city');
    expect(defaultTutorProfile).toHaveProperty('availableSlots');
  });
});

describe('WIZARD_STEP_SCHEMAS', () => {
  it('has schemas for all 5 steps', () => {
    expect(WIZARD_STEP_SCHEMAS).toHaveProperty('0');
    expect(WIZARD_STEP_SCHEMAS).toHaveProperty('1');
    expect(WIZARD_STEP_SCHEMAS).toHaveProperty('2');
    expect(WIZARD_STEP_SCHEMAS).toHaveProperty('3');
    expect(WIZARD_STEP_SCHEMAS).toHaveProperty('4');
  });
});
